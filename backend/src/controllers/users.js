const bcrypt = require('bcryptjs');
const db = require('../database');

const list = (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  let countSql = 'SELECT COUNT(*) as total FROM users';
  let dataSql = 'SELECT id, username, email, role, status, created_at, updated_at FROM users';
  const params = [];

  if (search) {
    const where = ' WHERE username LIKE ? OR email LIKE ?';
    countSql += where;
    dataSql += where;
    params.push(`%${search}%`, `%${search}%`);
  }

  dataSql += ' ORDER BY id DESC LIMIT ? OFFSET ?';

  const { total } = db.prepare(countSql).get(...params);
  const users = db.prepare(dataSql).all(...params, limit, offset);

  res.json({
    success: true,
    data: users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
};

const getById = (req, res) => {
  const user = db.prepare(
    'SELECT id, username, email, role, status, created_at, updated_at FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 404, message: 'User not found' }
    });
  }

  res.json({ success: true, data: user });
};

const create = (req, res) => {
  const { username, email, password, role, status } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: 'username, email, and password are required' }
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: 'Password must be at least 6 characters' }
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: 'Invalid email format' }
    });
  }

  if (role && !['admin', 'user'].includes(role)) {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: 'Role must be admin or user' }
    });
  }

  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: 'Status must be active or inactive' }
    });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 409, message: 'Username or email already exists' }
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)'
  ).run(username, email, hashedPassword, role || 'user', status || 'active');

  const user = db.prepare(
    'SELECT id, username, email, role, status, created_at, updated_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);

  res.status(201).json({ success: true, data: user, message: 'User created successfully' });
};

const update = (req, res) => {
  const { username, email, password, role, status } = req.body;
  const userId = req.params.id;

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existing) {
    return res.status(404).json({
      success: false,
      error: { code: 404, message: 'User not found' }
    });
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'Invalid email format' }
      });
    }
    const dup = db.prepare('SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?')
      .get(email, username || existing.username, userId);
    if (dup) {
      return res.status(409).json({
        success: false,
        error: { code: 409, message: 'Username or email already exists' }
      });
    }
  }

  if (role && !['admin', 'user'].includes(role)) {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: 'Role must be admin or user' }
    });
  }

  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: 'Status must be active or inactive' }
    });
  }

  const newPassword = password ? bcrypt.hashSync(password, 10) : existing.password;

  db.prepare(`
    UPDATE users SET username = ?, email = ?, password = ?, role = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    username || existing.username,
    email || existing.email,
    newPassword,
    role || existing.role,
    status || existing.status,
    userId
  );

  const user = db.prepare(
    'SELECT id, username, email, role, status, created_at, updated_at FROM users WHERE id = ?'
  ).get(userId);

  res.json({ success: true, data: user, message: 'User updated successfully' });
};

const remove = (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 404, message: 'User not found' }
    });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

  res.json({ success: true, message: 'User deleted successfully' });
};

module.exports = { list, getById, create, update, remove };

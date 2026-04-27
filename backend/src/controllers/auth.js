const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET, REFRESH_SECRET } = require('../middleware/auth');

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_DAYS = 7;

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Store refresh token in DB
  db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
    .run(user.id, refreshToken, expiresAt);

  return { accessToken, refreshToken };
}

const register = (req, res) => {
  const { username, email, password } = req.body;

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

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 409, message: 'Username or email already exists' }
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(username, email, hashedPassword, 'admin');

  const user = db.prepare('SELECT id, username, email, role, status, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    success: true,
    data: user,
    message: 'Admin registered successfully'
  });
};

const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: 'email and password are required' }
    });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 401, message: 'Invalid email or password' }
    });
  }

  if (user.status === 'inactive') {
    return res.status(403).json({
      success: false,
      error: { code: 403, message: 'Account is inactive' }
    });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({
      success: false,
      error: { code: 401, message: 'Invalid email or password' }
    });
  }

  const { accessToken, refreshToken } = generateTokens(user);

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    },
    message: 'Login successful'
  });
};

const refresh = (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: 'refreshToken is required' }
    });
  }

  const stored = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken);
  if (!stored) {
    return res.status(401).json({
      success: false,
      error: { code: 401, message: 'Invalid refresh token' }
    });
  }

  // Check expiry
  if (new Date(stored.expires_at) < new Date()) {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
    return res.status(401).json({
      success: false,
      error: { code: 401, message: 'Refresh token has expired. Please login again' }
    });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(stored.user_id);
  if (!user || user.status === 'inactive') {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
    return res.status(401).json({
      success: false,
      error: { code: 401, message: 'User not found or inactive' }
    });
  }

  // Rotate: delete old, create new pair
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

  res.json({
    success: true,
    data: { accessToken, refreshToken: newRefreshToken },
    message: 'Token refreshed successfully'
  });
};

const logout = (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
  }

  res.json({ success: true, message: 'Logged out successfully' });
};

const me = (req, res) => {
  const user = db.prepare(
    'SELECT id, username, email, role, status, created_at, updated_at FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 404, message: 'User not found' }
    });
  }

  res.json({ success: true, data: user });
};

module.exports = { register, login, refresh, logout, me };

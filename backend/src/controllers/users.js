const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

const list = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const filter = search
      ? { $or: [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
      : {};

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ _id: -1 }).skip(skip).limit(limit)
    ]);

    res.json({
      success: true,
      data: users.map(u => u.toPublic()),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 500, message: 'Internal server error' } });
  }
};

const getById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, error: { code: 404, message: 'User not found' } });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 404, message: 'User not found' } });
    }
    res.json({ success: true, data: user.toPublic() });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 500, message: 'Internal server error' } });
  }
};

const create = async (req, res) => {
  try {
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

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 409, message: 'Username or email already exists' }
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await User.create({
      username, email, password: hashedPassword,
      role: role || 'user', status: status || 'active'
    });

    res.status(201).json({ success: true, data: user.toPublic(), message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 500, message: 'Internal server error' } });
  }
};

const update = async (req, res) => {
  try {
    const { username, email, password, role, status } = req.body;
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({ success: false, error: { code: 404, message: 'User not found' } });
    }

    const existing = await User.findById(userId);
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
      const dup = await User.findOne({
        $or: [{ email }, { username: username || existing.username }],
        _id: { $ne: userId }
      });
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

    existing.username = username || existing.username;
    existing.email = email || existing.email;
    existing.role = role || existing.role;
    existing.status = status || existing.status;
    if (password) existing.password = bcrypt.hashSync(password, 10);
    await existing.save();

    res.json({ success: true, data: existing.toPublic(), message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 500, message: 'Internal server error' } });
  }
};

const remove = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, error: { code: 404, message: 'User not found' } });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: 'User not found' }
      });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 500, message: 'Internal server error' } });
  }
};

module.exports = { list, getById, create, update, remove };

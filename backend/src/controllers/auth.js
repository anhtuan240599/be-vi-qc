const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { JWT_SECRET } = require('../middleware/auth');

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_DAYS = 7;

async function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({ user_id: user._id, token: refreshToken, expires_at: expiresAt });

  return { accessToken, refreshToken };
}

const register = async (req, res) => {
  try {
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

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 409, message: 'Username or email already exists' }
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await User.create({ username, email, password: hashedPassword, role: 'admin' });

    res.status(201).json({
      success: true,
      data: user.toPublic(),
      message: 'Admin registered successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 500, message: 'Internal server error' } });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'email and password are required' }
      });
    }

    const user = await User.findOne({ email });
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

    const { accessToken, refreshToken } = await generateTokens(user);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user._id, username: user.username, email: user.email, role: user.role }
      },
      message: 'Login successful'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 500, message: 'Internal server error' } });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: 'refreshToken is required' }
      });
    }

    const stored = await RefreshToken.findOne({ token: refreshToken });
    if (!stored) {
      return res.status(401).json({
        success: false,
        error: { code: 401, message: 'Invalid refresh token' }
      });
    }

    if (new Date(stored.expires_at) < new Date()) {
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({
        success: false,
        error: { code: 401, message: 'Refresh token has expired. Please login again' }
      });
    }

    const user = await User.findById(stored.user_id);
    if (!user || user.status === 'inactive') {
      await RefreshToken.deleteOne({ _id: stored._id });
      return res.status(401).json({
        success: false,
        error: { code: 401, message: 'User not found or inactive' }
      });
    }

    await RefreshToken.deleteOne({ _id: stored._id });
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
      message: 'Token refreshed successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 500, message: 'Internal server error' } });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 500, message: 'Internal server error' } });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: 'User not found' }
      });
    }
    res.json({ success: true, data: user.toPublic() });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 500, message: 'Internal server error' } });
  }
};

module.exports = { register, login, refresh, logout, me };

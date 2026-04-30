const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    status: this.status,
    created_at: this.createdAt,
    updated_at: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);

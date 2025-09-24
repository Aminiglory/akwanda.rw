const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true },
    userType: { type: String, enum: ['guest', 'host', 'admin'], default: 'guest' },
    avatar: { type: String },
    bio: { type: String, maxlength: 1000 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);



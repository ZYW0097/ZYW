const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    lineId: { type: String, required: true, unique: true },
    name: String,
    avatar: String, // Cloudinary URL
    phone: { type: String, unique: true, sparse: true }, // 允許為空但不能重複
    password: String, // 加密後的密碼
    hasPassword: { type: Boolean, default: false }, // 是否已設定密碼
    birthday: String,
    gender: String,
    rememberToken: String, // 記住登入的token
    rememberExpires: Date, // token過期時間
    loginAttempts: { type: Number, default: 0 }, // 登入嘗試次數
    lockUntil: Date, // 帳號鎖定到何時
    lastLogin: Date, // 最後登入時間
    createdAt: { type: Date, default: Date.now }
});

// 虛擬屬性：檢查帳號是否被鎖定
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

module.exports = userSchema;

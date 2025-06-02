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
    rememberTokens: [{ // 改為陣列以支援多裝置
        token: String,
        expires: Date,
        userAgent: String, // 用於識別不同裝置/瀏覽器
        createdAt: { type: Date, default: Date.now }
    }],
    // 保留舊欄位以支援向下相容，但標記為廢棄
    rememberToken: String, // @deprecated 請使用 rememberTokens
    rememberExpires: Date, // @deprecated 請使用 rememberTokens
    loginAttempts: { type: Number, default: 0 }, // 登入嘗試次數
    lockUntil: Date, // 帳號鎖定到何時
    lastLogin: Date, // 最後登入時間
    createdAt: { type: Date, default: Date.now }
});

// 虛擬屬性：檢查帳號是否被鎖定
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// 清理過期的記住我 token
userSchema.methods.cleanExpiredTokens = function() {
    this.rememberTokens = this.rememberTokens.filter(tokenObj => 
        tokenObj.expires > new Date()
    );
};

// 添加新的記住我 token
userSchema.methods.addRememberToken = function(token, userAgent = '') {
    // 清理過期 token
    this.cleanExpiredTokens();
    
    // 限制最多 5 個裝置記住我
    if (this.rememberTokens.length >= 5) {
        // 移除最舊的 token
        this.rememberTokens.sort((a, b) => a.createdAt - b.createdAt);
        this.rememberTokens.shift();
    }
    
    // 添加新 token
    this.rememberTokens.push({
        token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天
        userAgent: userAgent.substring(0, 200) // 限制長度
    });
};

// 移除特定的記住我 token
userSchema.methods.removeRememberToken = function(token) {
    this.rememberTokens = this.rememberTokens.filter(tokenObj => 
        tokenObj.token !== token
    );
};

// 清除所有記住我 token
userSchema.methods.clearAllRememberTokens = function() {
    this.rememberTokens = [];
};

module.exports = userSchema;

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// 密碼加密
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

// 密碼驗證
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// 生成記住登入的token
const generateRememberToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// 密碼強度驗證
const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const errors = [];
    
    if (password.length < minLength) {
        errors.push('密碼至少需要8個字元');
    }
    if (!hasUpperCase) {
        errors.push('密碼需要包含至少一個大寫字母');
    }
    if (!hasLowerCase) {
        errors.push('密碼需要包含至少一個小寫字母');
    }
    if (!hasNumbers) {
        errors.push('密碼需要包含至少一個數字');
    }
    if (!hasSpecialChar) {
        errors.push('密碼需要包含至少一個特殊字元');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// 電話號碼格式驗證
const validatePhone = (phone) => {
    const phoneRegex = /^09\d{8}$/;
    return phoneRegex.test(phone);
};

// Email格式驗證
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// 登入失敗處理
const handleLoginFailure = async (user) => {
    const maxAttempts = 5;
    const lockTime = 30 * 60 * 1000; // 30分鐘
    
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    
    if (user.loginAttempts >= maxAttempts) {
        user.lockUntil = new Date(Date.now() + lockTime);
        user.loginAttempts = 0;
    }
    
    await user.save();
    return user.lockUntil ? true : false; // 返回是否被鎖定
};

// 登入成功處理
const handleLoginSuccess = async (user) => {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();
};

module.exports = {
    hashPassword,
    comparePassword,
    generateRememberToken,
    validatePassword,
    validatePhone,
    validateEmail,
    handleLoginFailure,
    handleLoginSuccess
}; 
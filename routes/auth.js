const express = require('express');
const router = express.Router();
const getClientDb = require('../utils/dbManager');
const userSchema = require('../models/user');
const { 
    hashPassword, 
    comparePassword, 
    generateRememberToken, 
    validatePassword, 
    validatePhone,
    handleLoginFailure,
    handleLoginSuccess
} = require('../utils/auth');
const { redirectIfAuthenticated } = require('../middleware/auth');

// 註冊頁面
router.get('/register', redirectIfAuthenticated, (req, res) => {
    res.render('auth/register', { 
        layout: 'layouts/main',
        error: null,
        success: null,
        formData: {}
    });
});

// 處理註冊
router.post('/register', async (req, res) => {
    try {
        const { name, phone, password, confirmPassword } = req.body;
        let errors = [];
        
        // 基本驗證
        if (!name || name.trim().length < 2) {
            errors.push('姓名至少需要2個字元');
        }
        
        if (!validatePhone(phone)) {
            errors.push('請輸入正確的手機號碼格式');
        }
        
        // 密碼強度驗證
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            errors = errors.concat(passwordValidation.errors);
        }
        
        if (password !== confirmPassword) {
            errors.push('密碼確認不一致');
        }
        
        if (errors.length > 0) {
            return res.render('auth/register', {
                layout: 'layouts/main',
                error: errors,
                success: null,
                formData: { name, phone }
            });
        }
        
        // 檢查手機號碼是否已註冊
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const existingUser = await User.findOne({ phone });
        
        if (existingUser) {
            return res.render('auth/register', {
                layout: 'layouts/main',
                error: '此手機號碼已經註冊過了',
                success: null,
                formData: { name, phone }
            });
        }
        
        // 加密密碼並創建用戶
        const hashedPassword = await hashPassword(password);
        const newUser = await User.create({
            lineId: `phone_${phone}`, // 用手機號碼作為唯一識別
            name: name.trim(),
            phone,
            password: hashedPassword,
            hasPassword: true,
            createdAt: new Date()
        });
        
        // 自動登入
        req.session.userId = newUser._id;
        await handleLoginSuccess(newUser);
        
        // 直接重導向，而不是渲染頁面後再跳轉
        res.redirect('/account/profile');
        
    } catch (error) {
        console.error('Registration error:', error);
        res.render('auth/register', {
            layout: 'layouts/main',
            error: '註冊失敗，請稍後再試',
            success: null,
            formData: req.body
        });
    }
});

// 登入頁面
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('auth/login', {
        layout: 'layouts/main',
        error: null,
        success: null,
        formData: {}
    });
});

// 處理手機號碼登入
router.post('/login/phone', async (req, res) => {
    try {
        const { phone, password, remember } = req.body;
        
        // 基本驗證
        if (!validatePhone(phone)) {
            return res.render('auth/login', {
                layout: 'layouts/main',
                error: '請輸入正確的手機號碼格式',
                success: null,
                formData: { phone, remember }
            });
        }
        
        if (!password || password.length < 8) {
            return res.render('auth/login', {
                layout: 'layouts/main',
                error: '密碼至少需要8個字元',
                success: null,
                formData: { phone, remember }
            });
        }
        
        // 查找用戶
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const user = await User.findOne({ phone });
        
        if (!user || !user.hasPassword) {
            return res.render('auth/login', {
                layout: 'layouts/main',
                error: '手機號碼或密碼錯誤',
                success: null,
                formData: { phone, remember }
            });
        }
        
        // 檢查帳號是否被鎖定
        if (user.isLocked) {
            const lockTimeRemaining = Math.ceil((user.lockUntil - new Date()) / 1000 / 60);
            return res.render('auth/login', {
                layout: 'layouts/main',
                error: `帳號已被鎖定，請 ${lockTimeRemaining} 分鐘後再試`,
                success: null,
                formData: { phone, remember }
            });
        }
        
        // 驗證密碼
        const isPasswordValid = await comparePassword(password, user.password);
        
        if (!isPasswordValid) {
            // 登入失敗處理
            const isLocked = await handleLoginFailure(user);
            const errorMessage = isLocked 
                ? '密碼錯誤次數過多，帳號已被鎖定30分鐘'
                : '手機號碼或密碼錯誤';
                
            return res.render('auth/login', {
                layout: 'layouts/main',
                error: errorMessage,
                success: null,
                formData: { phone, remember }
            });
        }
        
        // 登入成功處理
        await handleLoginSuccess(user);
        req.session.userId = user._id;
        
        // 記住我功能
        if (remember) {
            const rememberToken = generateRememberToken();
            const rememberExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
            
            user.rememberToken = rememberToken;
            user.rememberExpires = rememberExpires;
            await user.save();
            
            // 設置 cookie
            res.cookie('remember_token', rememberToken, {
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            });
        }
        
        // 檢查是否有重導向URL
        const redirectUrl = req.session.loginRedirect || '/account/profile';
        delete req.session.loginRedirect;
        
        res.redirect(redirectUrl);
        
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', {
            layout: 'layouts/main',
            error: '登入失敗，請稍後再試',
            success: null,
            formData: req.body
        });
    }
});

// 登出 (覆蓋原有的登出路由)
router.get('/logout', (req, res) => {
    // 清除記住我的 cookie
    res.clearCookie('remember_token');
    
    // 清除 session
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

// 忘記密碼頁面 (預留)
router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot-password', {
        layout: 'layouts/main',
        error: null,
        success: null
    });
});

// 處理忘記密碼 (預留)
router.post('/forgot-password', async (req, res) => {
    // TODO: 實作忘記密碼功能 (發送簡訊或 Email)
    res.render('auth/forgot-password', {
        layout: 'layouts/main',
        error: null,
        success: '重設密碼連結已發送到您的手機'
    });
});

module.exports = router; 
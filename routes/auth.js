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

// 註冊頁面 (只顯示LINE註冊選項)
router.get('/register', redirectIfAuthenticated, (req, res) => {
    res.render('auth/register', { 
        layout: 'layouts/main',
        error: null,
        success: null,
        formData: {}
    });
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
            const userAgent = req.get('User-Agent') || '';
            
            // 使用新的多 token 系統
            user.addRememberToken(rememberToken, userAgent);
            await user.save();
            
            // 設置 cookie
            res.cookie('remember_token', rememberToken, {
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/' // 確保cookie在整個網站都有效
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
router.get('/logout', async (req, res) => {
    try {
        // 如果用戶已登入，清除數據庫中的記住我數據
        if (req.session.userId) {
            const adb = getClientDb('main', 'ADB');
            const User = adb.model('User', userSchema);
            const user = await User.findById(req.session.userId);
            
            if (user) {
                // 檢查是否有特定的記住我 token 要清除
                const currentToken = req.cookies.remember_token;
                if (currentToken) {
                    // 只清除當前裝置的 token
                    user.removeRememberToken(currentToken);
                } else {
                    // 如果沒有 cookie，清除所有 token（為了安全）
                    user.clearAllRememberTokens();
                }
                
                // 同時清除舊格式的 token（向下相容）
                user.rememberToken = undefined;
                user.rememberExpires = undefined;
                
                await user.save();
            }
        }
    } catch (error) {
        console.error('Clear remember token error:', error);
    }
    
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

module.exports = router; 
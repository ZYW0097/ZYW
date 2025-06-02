const getClientDb = require('../utils/dbManager');
const userSchema = require('../models/user');

const isAuthenticated = async (req, res, next) => {
    try {
        // 檢查 session
        if (req.session && req.session.userId) {
            return next();
        }
        
        // 檢查記住登入的 cookie
        const rememberToken = req.cookies.remember_token;
        if (rememberToken) {
            const adb = getClientDb('main', 'ADB');
            const User = adb.model('User', userSchema);
            
            const user = await User.findOne({
                rememberToken,
                rememberExpires: { $gt: new Date() }
            });
            
            if (user) {
                // 自動登入
                req.session.userId = user._id;
                return next();
            } else {
                // token 無效或過期，清除 cookie
                res.clearCookie('remember_token');
            }
        }
        
        // 未登入處理
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(401).json({ 
                success: false, 
                message: '請先登入' 
            });
        }
        
        // 儲存當前 URL 以便登入後跳轉
        req.session.loginRedirect = req.originalUrl;
        res.redirect('/account/login');
        
    } catch (error) {
        console.error('Authentication middleware error:', error);
        
        // API 請求回傳錯誤
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(500).json({ 
                success: false, 
                message: '認證系統錯誤' 
            });
        }
        
        // 網頁請求導向登入頁
        res.redirect('/account/login');
    }
};

// 載入用戶資料的中間件
const loadUser = async (req, res, next) => {
    try {
        if (req.session && req.session.userId) {
            const adb = getClientDb('main', 'ADB');
            const User = adb.model('User', userSchema);
            const user = await User.findById(req.session.userId);
            
            if (user) {
                req.user = user;
                res.locals.user = user; // 供 template 使用
            } else {
                // 用戶不存在，清除 session
                req.session.destroy();
                res.clearCookie('remember_token');
            }
        }
        next();
    } catch (error) {
        console.error('Load user middleware error:', error);
        next();
    }
};

// 檢查是否已登入 (用於登入頁面等)
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/account/profile');
    }
    next();
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        return next();
    }
    res.status(403).json({ 
        success: false, 
        message: '需要管理員權限' 
    });
};

// 檢查密碼登入是否可用
const requirePasswordAuth = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/account/login');
        }
        
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const user = await User.findById(req.session.userId);
        
        if (!user || !user.hasPassword) {
            req.session.settingsError = '請先設定密碼登入功能';
            return res.redirect('/account/settings');
        }
        
        next();
    } catch (error) {
        console.error('Password auth check error:', error);
        res.redirect('/account/login');
    }
};

module.exports = {
    isAuthenticated,
    loadUser,
    redirectIfAuthenticated,
    isAdmin,
    requirePasswordAuth
};
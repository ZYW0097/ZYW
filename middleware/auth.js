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
            
            // 先嘗試新的多 token 系統
            let user = await User.findOne({
                'rememberTokens.token': rememberToken,
                'rememberTokens.expires': { $gt: new Date() }
            });
            
            // 如果新系統找不到，嘗試舊的單 token 系統（向下相容）
            if (!user) {
                user = await User.findOne({
                    rememberToken,
                    rememberExpires: { $gt: new Date() }
                });
                
                // 如果找到舊格式的token，遷移到新格式
                if (user) {
                    const userAgent = req.get('User-Agent') || '';
                    user.addRememberToken(rememberToken, userAgent);
                    // 清除舊格式
                    user.rememberToken = undefined;
                    user.rememberExpires = undefined;
                    await user.save();
                }
            }
            
            if (user) {
                // 清理過期的 tokens
                user.cleanExpiredTokens();
                await user.save();
                
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
        // 預設設置為 null
        req.user = null;
        res.locals.user = null;
        res.locals.isOwner = false;
        
        // 先檢查 session
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
        } else {
            // Session 不存在，檢查記住登入的 cookie
            const rememberToken = req.cookies.remember_token;
            if (rememberToken) {
                const adb = getClientDb('main', 'ADB');
                const User = adb.model('User', userSchema);
                
                // 先嘗試新的多 token 系統
                let user = await User.findOne({
                    'rememberTokens.token': rememberToken,
                    'rememberTokens.expires': { $gt: new Date() }
                });
                
                // 如果新系統找不到，嘗試舊的單 token 系統（向下相容）
                if (!user) {
                    user = await User.findOne({
                        rememberToken,
                        rememberExpires: { $gt: new Date() }
                    });
                    
                    // 如果找到舊格式的token，遷移到新格式
                    if (user) {
                        const userAgent = req.get('User-Agent') || '';
                        user.addRememberToken(rememberToken, userAgent);
                        // 清除舊格式
                        user.rememberToken = undefined;
                        user.rememberExpires = undefined;
                        await user.save();
                    }
                }
                
                if (user) {
                    // 清理過期的 tokens
                    user.cleanExpiredTokens();
                    await user.save();
                    
                    // 自動恢復登入狀態
                    req.session.userId = user._id;
                    req.user = user;
                    res.locals.user = user;
                } else {
                    // token 無效或過期，清除 cookie
                    res.clearCookie('remember_token');
                }
            }
        }
        
        // 檢查 isOwner（僅針對餐廳相關頁面）
        if (req.user && req.user.lineId) {
            const pathParts = req.path.split('/');
            let storeSlug = '';
            
            // 從 URL 中提取 storeSlug
            if (pathParts.length > 1 && pathParts[1] && 
                !['auth', 'account', 'setup', 'loading', 'webhook', 'dev'].includes(pathParts[1])) {
                storeSlug = pathParts[1];
            }
            
            if (storeSlug) {
                try {
                    const Client = require('../models/Client');
                    const client = await Client.findOne({ slugname: storeSlug });
                    
                    if (client && client.ownerid === req.user.lineId) {
                        res.locals.isOwner = true;
                    }

                    // 檢查後台登入狀態
                    const backstageAuth = req.session.backstageAuth;
                    const isBackstageAuthenticated = backstageAuth && 
                                                   backstageAuth.storeSlug === storeSlug &&
                                                   (Date.now() - new Date(backstageAuth.loginTime).getTime()) < 2 * 60 * 60 * 1000;
                    
                    res.locals.isBackstageAuthenticated = isBackstageAuthenticated;
                    res.locals.currentStoreSlug = storeSlug;
                } catch (error) {
                    console.error('Error checking owner status in loadUser:', error);
                }
            }
        }
        
        next();
    } catch (error) {
        console.error('Load user middleware error:', error);
        // 確保即使出錯也設置預設值
        req.user = null;
        res.locals.user = null;
        res.locals.isOwner = false;
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
const Client = require('../models/Client');
const getClientDb = require('../utils/dbManager');
const userSchema = require('../models/user');

// 檢查是否為店家擁有者
const checkStoreOwner = async (req, res, next) => {
    try {
        const { storeSlug } = req.params;
        
        // 檢查用戶是否登入
        if (!req.session.userId) {
            if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                return res.status(401).json({
                    success: false,
                    message: '請先登入'
                });
            }
            req.session.loginRedirect = req.originalUrl;
            return res.redirect('/auth/login');
        }

        // 獲取用戶資訊
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const user = await User.findById(req.session.userId);

        if (!user || !user.lineId) {
            if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                return res.status(401).json({
                    success: false,
                    message: '用戶資訊不完整'
                });
            }
            return res.redirect('/auth/login');
        }

        // 查找店家資訊
        const client = await Client.findOne({ slugname: storeSlug });
        if (!client) {
            if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                return res.status(404).json({
                    success: false,
                    message: '找不到該商店'
                });
            }
            return res.status(404).render('error', { message: '找不到該商店' });
        }

        // 檢查是否為擁有者
        if (client.ownerid !== user.lineId) {
            if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                return res.status(403).json({
                    success: false,
                    message: '您沒有權限訪問此店家的後台'
                });
            }
            return res.status(403).render('error', { message: '您沒有權限訪問此店家的後台' });
        }

        // 將用戶和店家資訊添加到請求中
        req.user = user;
        req.client = client;
        req.isOwner = true;
        
        next();
    } catch (error) {
        console.error('Store owner auth error:', error);
        
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(500).json({
                success: false,
                message: '伺服器錯誤'
            });
        }
        res.status(500).render('error', { message: '系統錯誤' });
    }
};

// 檢查是否為擁有者（用於在頁面中顯示控制台選項）
const checkOwnerForDisplay = async (req, res, next) => {
    try {
        const { storeSlug } = req.params;
        
        // 預設不是擁有者
        req.isOwner = false;
        
        // 如果用戶未登入，直接繼續
        if (!req.session.userId) {
            return next();
        }

        // 獲取用戶資訊
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const user = await User.findById(req.session.userId);

        if (!user || !user.lineId) {
            return next();
        }

        // 查找店家資訊
        const client = await Client.findOne({ slugname: storeSlug });
        if (!client) {
            return next();
        }

        // 檢查是否為擁有者
        if (client.ownerid === user.lineId) {
            req.isOwner = true;
            req.user = user;
            req.client = client;
        }

        next();
    } catch (error) {
        console.error('Owner display check error:', error);
        // 發生錯誤時不影響頁面顯示，只是不顯示控制台選項
        req.isOwner = false;
        next();
    }
};

module.exports = {
    checkStoreOwner,
    checkOwnerForDisplay
}; 
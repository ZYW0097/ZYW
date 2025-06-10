const express = require('express');
const getClientDb = require('../utils/dbManager');
const userSchema = require('../models/user');
const axios = require('axios');
const { cloudinary } = require('../config/cloudinary');
const qs = require('querystring');
const { 
    hashPassword, 
    comparePassword, 
    validatePassword, 
    validatePhone, 
    validateEmail,
    handleLoginSuccess 
} = require('../utils/auth');

const router = express.Router();

const LINE_CLIENT_ID = process.env.LINE_CHANNEL_ID;
const LINE_CLIENT_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CALLBACK_URL = process.env.LINE_CALLBACK_URL;

// /account → /account/profile
router.get('/', (req, res) => {
    res.redirect('/account/profile');
});

// 1. 點擊 user icon → /account/login → 302 跳轉到 LINE 授權頁
router.get('/login', (req, res) => {
    const state = Math.random().toString(36).substring(2); // 可用 session 記錄
    // 儲存 redirect 參數到 session
    if (req.query.redirect) {
        req.session.loginRedirect = req.query.redirect;
    }
    
    // 儲存記住我參數到 session
    if (req.query.remember === 'true') {
        req.session.rememberMe = true;
    }
    
    const redirectUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINE_CALLBACK_URL)}&state=${state}&scope=profile%20openid%20email`;
    res.redirect(redirectUrl);
    console.log('LINE_CLIENT_ID:', LINE_CLIENT_ID);
    console.log('LINE_CLIENT_SECRET:', LINE_CLIENT_SECRET);
    console.log('LINE_CALLBACK_URL:', LINE_CALLBACK_URL);
});

// 2. LINE callback
router.get('/line/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/');

    try {
        // 取得 access_token
        const tokenRes = await axios.post('https://api.line.me/oauth2/v2.1/token',
            qs.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: LINE_CALLBACK_URL,
                client_id: LINE_CLIENT_ID,
                client_secret: LINE_CLIENT_SECRET
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        const access_token = tokenRes.data.access_token;

        // 取得用戶 profile
        const profileRes = await axios.get('https://api.line.me/v2/profile', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const { userId: lineId, displayName: name, pictureUrl: avatarUrl } = profileRes.data;

        // 上傳頭像到 Cloudinary
        let avatarCloudUrl = '';
        if (avatarUrl) {
            const uploadRes = await cloudinary.uploader.upload(avatarUrl, {
                folder: 'user_avatars',
                public_id: lineId
            });
            avatarCloudUrl = uploadRes.secure_url;
        }

        // 存入 ADB
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        let user = await User.findOne({ lineId });
        let isNewUser = false;
        
        if (!user) {
            // 首次登入，創建新用戶
            user = await User.create({
                lineId,
                name,
                avatar: avatarCloudUrl
            });
            isNewUser = true;
        } else if (!user.avatar && avatarCloudUrl) {
            // 更新頭像
            user.avatar = avatarCloudUrl;
            await user.save();
        }

        // 設定 session
        req.session.userId = user._id;

        // 處理記住我功能
        await handleLoginSuccess(user);

        // 檢查是否有記住我的要求（從session中取得）
        if (req.session.rememberMe) {
            const { generateRememberToken } = require('../utils/auth');
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
            
            // 清除session中的rememberMe標記
            delete req.session.rememberMe;
        }

        // 取出 loginRedirect
        const loginRedirect = req.session.loginRedirect;
        delete req.session.loginRedirect;

        // 根據條件決定跳轉
        if (isNewUser || !user.birthday || !user.gender) {
            // 首次登入或資料不完整，前往個人資料頁
            return res.redirect('/account/profile');
        } else if (loginRedirect) {
            // 已有完整資料且有 redirect 參數，返回原頁面
            return res.redirect(loginRedirect);
        } else {
            // 默認跳轉到點數頁面
            return res.redirect('/account/points');
        }
    } catch (err) {
        console.error('LINE login error:', err);
        return res.redirect('/');
    }
});

// 需要登入的頁面
function requireLogin(req, res, next) {
    if (!req.session.userId) return res.redirect('/account/login');
    next();
}

// 側邊欄共用 layout
function renderWithSidebar(res, view, params) {
    // 根據 view 名稱自動帶入對應 CSS
    let customCss = '';
    if (view === 'account_profile') customCss = '/css/account_profile.css';
    if (view === 'account_points') customCss = '/css/account_points.css';
    if (view === 'account_settings') customCss = '/css/account_settings.css';
    
    // 添加默認的storeSlug，如果沒有提供的話
    const defaultParams = {
        storeSlug: '', // 默認為空，這樣連結會指向根路徑
        ...params
    };
    
    res.render(view, { ...defaultParams, layout: 'layouts/account_layout', customCss });
}

// 基本資料頁
router.get('/profile', requireLogin, async (req, res) => {
    const adb = getClientDb('main', 'ADB');
    const User = adb.model('User', userSchema);
    const user = await User.findById(req.session.userId);
    
    // 先保存訊息
    const error = req.session.profileError;
    const success = req.session.profileSuccess;
    
    // 清除一次性訊息
    delete req.session.profileError;
    delete req.session.profileSuccess;
    
    renderWithSidebar(res, 'account_profile', { 
        user,
        error,
        success,
        customJs: '/js/account_profile.js'
    });
});

// 集點卡頁
router.get('/points', requireLogin, async (req, res) => {
    try {
    const adb = getClientDb('main', 'ADB');
    const User = adb.model('User', userSchema);
    const user = await User.findById(req.session.userId);
        
        if (!user || !user.lineId) {
            return renderWithSidebar(res, 'account_points', { 
                user, 
                userCards: [] 
            });
        }
        
        // 獲取所有客戶（餐廳）- 添加限制和排序
        const Client = require('../models/Client');
        const clients = await Client.find({}).limit(20).sort({ createdAt: -1 });
        
        // 並行查詢所有餐廳的集點卡數據
        const cardPromises = clients.map(async (client) => {
            try {
                const userDb = getClientDb(client.slugname, 'ADB');
                const UserPoints = userDb.model('UserPoints', require('../models/points/userPoints'));
                
                // 使用 lean() 提高查詢性能，只查詢必要字段
                const userPoints = await UserPoints.findOne(
                    { 
                        lineId: user.lineId,
                        type: 'user_points'
                    },
                    'ah-points ah-coupon ah-coupon-id' // 只查詢需要的字段
                ).lean();
                
                if (userPoints) {
                    // 計算優惠券總數
                    const totalCoupons = userPoints['ah-coupon-id'] 
                        ? userPoints['ah-coupon-id'].reduce((sum, c) => sum + (c.count || 0), 0)
                        : userPoints['ah-coupon'] || 0;
                    
                    return {
                        storeSlug: client.slugname,
                        storeName: client.clientname,
                        storeImage: '/images/dine.jpg', // 預設圖片
                        points: userPoints['ah-points'] || 0,
                        coupons: totalCoupons,
                        cardData: userPoints
                    };
                }
                return null;
            } catch (error) {
                console.error(`Error querying ${client.slugname}:`, error.message);
                return null;
            }
        });
        
        // 等待所有查詢完成並過濾掉空值
        const results = await Promise.all(cardPromises);
        const userCards = results.filter(card => card !== null);
        
        renderWithSidebar(res, 'account_points', { 
            user, 
            userCards 
        });
        
    } catch (error) {
        console.error('Error in /account/points:', error);
        renderWithSidebar(res, 'account_points', { 
            user: null, 
            userCards: [] 
        });
    }
});

// 帳號設定頁
router.get('/settings', requireLogin, async (req, res) => {
    const adb = getClientDb('main', 'ADB');
    const User = adb.model('User', userSchema);
    const user = await User.findById(req.session.userId);
    renderWithSidebar(res, 'account_settings', { 
        user,
        error: req.session.settingsError,
        success: req.session.settingsSuccess,
        customJs: '/js/account_settings.js'
    });
    
    // 清除一次性訊息
    delete req.session.settingsError;
    delete req.session.settingsSuccess;
});

// 儲存/更新基本資料
router.post('/profile', requireLogin, async (req, res) => {
    const { name, phone, email, birthday, gender } = req.body;
    const adb = getClientDb('main', 'ADB');
    const User = adb.model('User', userSchema);
    
    try {
        // Email格式驗證
        if (email) {
            if (!validateEmail(email)) {
                req.session.profileError = '電子郵件格式不正確';
                return res.redirect('/account/profile');
            }
            
            // 檢查Email是否被其他用戶使用
            const existingEmailUser = await User.findOne({ 
                email, 
                _id: { $ne: req.session.userId } 
            });
            
            if (existingEmailUser) {
                req.session.profileError = '此電子郵件已被其他帳號使用';
                return res.redirect('/account/profile');
            }
        }
        
        // 手機號碼格式驗證
        if (phone) {
            if (!validatePhone(phone)) {
                req.session.profileError = '手機號碼格式不正確';
                return res.redirect('/account/profile');
            }
            
            // 檢查手機號碼是否被其他用戶使用
            const existingPhoneUser = await User.findOne({ 
                phone, 
                _id: { $ne: req.session.userId } 
            });
            
            if (existingPhoneUser) {
                req.session.profileError = '此手機號碼已被其他帳號使用';
                return res.redirect('/account/profile');
            }
        }
        
        // 姓名驗證
        if (!name || name.trim().length === 0) {
            req.session.profileError = '姓名不能為空';
            return res.redirect('/account/profile');
        }
        
        await User.findByIdAndUpdate(req.session.userId, { 
            name: name.trim(), 
            phone: phone || null, 
            email: email || null, 
            birthday, 
            gender 
        });
        
        req.session.profileSuccess = '基本資料更新成功';
        res.redirect('/account/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        req.session.profileError = '更新失敗，請稍後再試';
        res.redirect('/account/profile');
    }
});

// 新增：密碼設定/修改
router.post('/settings/password', requireLogin, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const user = await User.findById(req.session.userId);
        
        // 驗證新密碼強度
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            req.session.settingsError = passwordValidation.errors.join('、');
            return res.redirect('/account/settings');
        }
        
        // 確認密碼一致性
        if (newPassword !== confirmPassword) {
            req.session.settingsError = '密碼確認不一致';
            return res.redirect('/account/settings');
        }
        
        // 如果用戶已有密碼，需要驗證現有密碼
        if (user.hasPassword) {
            if (!currentPassword) {
                req.session.settingsError = '請輸入目前的密碼';
                return res.redirect('/account/settings');
            }
            
            const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                req.session.settingsError = '目前密碼不正確';
                return res.redirect('/account/settings');
            }
        }
        
        // 更新密碼
        const hashedPassword = await hashPassword(newPassword);
        user.password = hashedPassword;
        user.hasPassword = true;
        await user.save();
        
        req.session.settingsSuccess = user.hasPassword ? '密碼已成功更新' : '密碼已成功設定';
        res.redirect('/account/settings');
        
    } catch (error) {
        console.error('Password update error:', error);
        req.session.settingsError = '密碼設定失敗，請稍後再試';
        res.redirect('/account/settings');
    }
});

// 新增：移除密碼登入
router.post('/settings/remove-password', requireLogin, async (req, res) => {
    try {
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const user = await User.findById(req.session.userId);
        
        // 確保用戶有綁定 LINE 帳號
        if (!user.lineId || user.lineId.startsWith('phone_')) {
            return res.status(400).json({ 
                error: '無法移除密碼登入，請先綁定 LINE 帳號' 
            });
        }
        
        user.password = undefined;
        user.hasPassword = false;
        user.phone = undefined; // 同時移除手機號碼
        user.clearAllRememberTokens(); // 使用新方法清除所有記住我 token
        // 同時清除舊格式（向下相容）
        user.rememberToken = undefined;
        user.rememberExpires = undefined;
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Remove password error:', error);
        res.status(500).json({ error: '操作失敗，請稍後再試' });
    }
});

// 新增：刪除帳號
router.post('/settings/delete-account', requireLogin, async (req, res) => {
    try {
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        
        // 刪除用戶帳號
        await User.findByIdAndDelete(req.session.userId);
        
        // 清除 session
        req.session.destroy();
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: '刪除失敗，請稍後再試' });
    }
});

// 新增：獲取記住我裝置列表
router.get('/settings/remember-devices', requireLogin, async (req, res) => {
    try {
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ error: '用戶不存在' });
        }
        
        // 清理過期的 tokens
        user.cleanExpiredTokens();
        await user.save();
        
        // 格式化裝置列表
        const devices = user.rememberTokens.map((tokenObj, index) => {
            const userAgent = tokenObj.userAgent || '';
            let deviceInfo = '未知裝置';
            
            // 簡單的 User-Agent 解析
            if (userAgent.includes('iPhone')) deviceInfo = 'iPhone';
            else if (userAgent.includes('Android')) deviceInfo = 'Android';
            else if (userAgent.includes('Windows')) deviceInfo = 'Windows';
            else if (userAgent.includes('Mac')) deviceInfo = 'Mac';
            else if (userAgent.includes('Linux')) deviceInfo = 'Linux';
            
            if (userAgent.includes('Chrome')) deviceInfo += ' - Chrome';
            else if (userAgent.includes('Firefox')) deviceInfo += ' - Firefox';
            else if (userAgent.includes('Safari')) deviceInfo += ' - Safari';
            else if (userAgent.includes('Edge')) deviceInfo += ' - Edge';
            
            return {
                id: index,
                token: tokenObj.token,
                deviceInfo,
                createdAt: tokenObj.createdAt,
                expires: tokenObj.expires,
                isCurrent: req.cookies.remember_token === tokenObj.token
            };
        });
        
        res.json({ success: true, devices });
        
    } catch (error) {
        console.error('Get remember devices error:', error);
        res.status(500).json({ error: '獲取裝置列表失敗' });
    }
});

// 新增：移除特定裝置的記住我
router.post('/settings/remove-device', requireLogin, async (req, res) => {
    try {
        const { token } = req.body;
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ error: '用戶不存在' });
        }
        
        user.removeRememberToken(token);
        await user.save();
        
        res.json({ success: true, message: '裝置已移除' });
        
    } catch (error) {
        console.error('Remove device error:', error);
        res.status(500).json({ error: '移除裝置失敗' });
    }
});

// 新增：清除所有記住我裝置
router.post('/settings/clear-all-devices', requireLogin, async (req, res) => {
    try {
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            return res.status(404).json({ error: '用戶不存在' });
        }
        
        user.clearAllRememberTokens();
        // 同時清除舊格式
        user.rememberToken = undefined;
        user.rememberExpires = undefined;
        await user.save();
        
        // 清除當前瀏覽器的 cookie
        res.clearCookie('remember_token');
        
        res.json({ success: true, message: '所有裝置已清除' });
        
    } catch (error) {
        console.error('Clear all devices error:', error);
        res.status(500).json({ error: '清除所有裝置失敗' });
    }
});

// 動態跳轉處理（整合各種登入和跳轉情境）
router.get('/redirect', async (req, res) => {
    try {
        // 獲取當前頁面 URL
        const referer = req.headers.referer || '/';
        
        // 未登入狀態：跳轉到登入頁面
        if (!req.session.userId) {
            return res.redirect(`/account/login?redirect=${encodeURIComponent(referer)}`);
        }
        
        // 已登入狀態：檢查用戶資料
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            // 異常情況：session 有 userId 但找不到用戶
            req.session.destroy();
            return res.redirect('/account/login');
        }
        
        // 已登入用戶：直接前往個人資料頁
        return res.redirect('/account/profile');
    } catch (error) {
        console.error('Redirect error:', error);
        return res.redirect('/');
    }
});

module.exports = router;


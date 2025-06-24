const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const mongoose = require('mongoose');
const getClientDb = require('../utils/dbManager');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const QRCode = require('qrcode');
const { generateQRCode, isQRCodeExpired } = require('../utils/qrcodeHelper');

const pointsRoutes = require('./points');
const bookingRoutes = require('./booking');

// 設定 Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 設定 Multer 的 Cloudinary 存儲
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'restaurant-images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'svg'],
        transformation: [{ width: 800, height: 600, crop: 'limit' }]
    }
});

const upload = multer({ storage: storage });

// 主頁路由
router.get('/', (req, res) => {
    const customNavbar = `
<nav class="index-nav">
    <div class="nav-container">
        <a class="nav-logo" href="/">DINE✦</a>
        <div class="nav-right-group">
            <div class="nav-links">
                <a class="nav-link" href="#features">功能特點</a>
                <a class="nav-link" href="#pricing">方案價格</a>
                <a class="nav-link" href="#contact">聯絡我們</a>
            </div>
        </div>
    </div>
</nav>
`;
    res.render('index', { customNavbar });
});

// 設置頁面 - 需要登入才能使用
router.get('/setup', requireLogin, (req, res) => {
    res.render('setup', { 
        layout: false,
        user: req.user 
    });
});

// 登入驗證中間件
async function requireLogin(req, res, next) {
    if (!req.session.userId) {
        // 儲存目標頁面，登入後跳轉
        req.session.loginRedirect = req.originalUrl;
        return res.redirect('/account/login'); // 修改為 LINE 登入頁面
    }
    
    try {
        // 獲取用戶資訊
        const adb = getClientDb('main', 'ADB');
        const userSchema = require('../models/user');
        const User = adb.model('User', userSchema);
        const user = await User.findById(req.session.userId);
        
        if (!user) {
            // 如果找不到用戶，清除 session 並重新登入
            req.session.destroy();
            req.session.loginRedirect = req.originalUrl;
            return res.redirect('/auth/login?message=請重新登入');
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('RequireLogin error:', error);
        res.status(500).render('error', { message: '系統錯誤' });
    }
}

// 載入頁面
router.get('/loading', (req, res) => {
    res.render('loading', { slugname: req.query.slugname, layout: false });
});



// API路由 - 創建客戶
router.post('/api/setup', requireLogin, upload.fields([
    { name: 'restaurantImage', maxCount: 1 },
    { name: 'cardBackgroundImage', maxCount: 1 },
    { name: 'rewardImages[]', maxCount: 10 }
]), async (req, res) => {
    try {
        const {
            clientname,
            slugname,
            restaurantAddress,
            adminPassword,
            timeSlots,
            diningRules,
            pointsSystem,
            bookingSystem,
            rewardNames,
            rewardPoints,
            pointRules
        } = req.body;

        // 驗證必填欄位
        if (!clientname || !slugname) {
            return res.status(400).json({ 
                success: false, 
                error: '客戶名稱和系統識別碼為必填欄位' 
            });
        }

        // 驗證字數限制
        if (clientname.trim().length > 30) {
            return res.status(400).json({ 
                success: false, 
                error: '客戶名稱不能超過30個字元' 
            });
        }

        if (slugname.trim().length > 30) {
            return res.status(400).json({ 
                success: false, 
                error: '動態標識不能超過30個字元' 
            });
        }

        // 驗證最小長度
        if (clientname.trim().length < 2) {
            return res.status(400).json({ 
                success: false, 
                error: '客戶名稱至少需要2個字元' 
            });
        }

        if (slugname.trim().length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: '動態標識至少需要3個字元' 
            });
        }

        // 驗證密碼格式（如果有提供）
        if (adminPassword) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
            if (!passwordRegex.test(adminPassword)) {
                return res.status(400).json({ 
                    success: false, 
                    error: '密碼必須包含大小寫字母、數字和特殊字元，且至少8個字元' 
                });
            }
        }

        // 處理圖片上傳
        let restaurantImageUrl = '/images/dine.jpg';
        let cardBackgroundImageUrl = '/images/dine.jpg';
        
        if (req.files && req.files.restaurantImage) {
            restaurantImageUrl = req.files.restaurantImage[0].path;
        }
        
        if (req.files && req.files.cardBackgroundImage) {
            cardBackgroundImageUrl = req.files.cardBackgroundImage[0].path;
        }

        // 檢查 slugname 是否已存在
        const existingClient = await Client.findOne({ slugname });
        if (existingClient) {
            return res.status(400).json({ 
                success: false, 
                error: `商家識別碼 "${slugname}" 已存在，請使用其他名稱` 
            });
        }

        // 獲取用戶的LINE ID作為ownerid
        const getClientDb = require('../utils/dbManager');
        const userSchema = require('../models/user');
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        const user = await User.findById(req.session.userId);
        
        if (!user || !user.lineId) {
            return res.status(400).json({ 
                success: false, 
                error: '無法獲取用戶資訊，請重新登入' 
            });
        }

        // 步驟 1: 創建客戶基本資料
        const clientData = {
            clientname,
            slugname,
            ownerid: user.lineId,  // 使用LINE ID作為擁有者ID
            restaurantImage: restaurantImageUrl,
            cardBackgroundImage: cardBackgroundImageUrl
        };

        // 添加可選欄位
        if (restaurantAddress) clientData.restaurantAddress = restaurantAddress;
        if (adminPassword) clientData.adminPassword = adminPassword;

        const client = await Client.create(clientData);

        // 步驟 2: 創建並初始化資料庫連接
        const accountDB = mongoose.connection.useDb(`${slugname}ADB`);
        const cardDB = mongoose.connection.useDb(`${slugname}CDB`);
        const bookingDB = mongoose.connection.useDb(`${slugname}BDB`);
        
        // 初始化資料庫（確保資料庫被創建）
        await Promise.all([
            accountDB.collection('init').insertOne({ created: new Date(), type: 'ADB' }),
            cardDB.collection('init').insertOne({ created: new Date(), type: 'CDB' }),
            bookingDB.collection('init').insertOne({ created: new Date(), type: 'BDB' })
        ]);

        // 步驟 3: 等待資料庫完全初始化
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 步驟 4: 配置系統設定
        
        // 在 clientCDB 中創建集點卡設定
        if (pointsSystem === 'true' || pointsSystem === true) {
            try {
                const pointsSettingsSchema = require('../models/points/settings');
                const PointsSettings = cardDB.model('PointsSettings', pointsSettingsSchema);
                
                await PointsSettings.create({
                    slug: slugname,
                    type: 'points_settings',
                    class: 'main_settings',
                    state: 'enable',
                    s_reward: 0
                });

                // 處理集點卡獎勵設定
                if (rewardNames && rewardPoints) {
                    let parsedRewardNames = [];
                    let parsedRewardPoints = [];
                    
                    try {
                        if (Array.isArray(rewardNames)) {
                            parsedRewardNames = rewardNames;
                        } else if (typeof rewardNames === 'string' && rewardNames.trim()) {
                            parsedRewardNames = JSON.parse(rewardNames);
                        } else {
                            parsedRewardNames = [];
                        }
                        
                        // 過濾空字符串和無效值
                        parsedRewardNames = parsedRewardNames
                            .filter(name => name && typeof name === 'string' && name.trim().length > 0)
                            .map(name => name.trim());
                    } catch (error) {
                        console.error('Reward names JSON parse error:', error, 'Raw data:', rewardNames);
                        parsedRewardNames = [];
                    }
                    
                    try {
                        if (Array.isArray(rewardPoints)) {
                            parsedRewardPoints = rewardPoints;
                        } else if (typeof rewardPoints === 'string' && rewardPoints.trim()) {
                            parsedRewardPoints = JSON.parse(rewardPoints);
                        } else {
                            parsedRewardPoints = [];
                        }
                        
                        // 過濾無效點數
                        parsedRewardPoints = parsedRewardPoints
                            .map(points => parseInt(points))
                            .filter(points => !isNaN(points) && points > 0);
                    } catch (error) {
                        console.error('Reward points JSON parse error:', error, 'Raw data:', rewardPoints);
                        parsedRewardPoints = [];
                    }
                    
                    // 確保獎勵名稱和點數數量一致
                    const minLength = Math.min(parsedRewardNames.length, parsedRewardPoints.length);
                    if (minLength > 0) {
                        // 處理獎勵圖片
                        const rewardImages = [];
                        if (req.files && req.files['rewardImages[]']) {
                            req.files['rewardImages[]'].forEach(file => {
                                rewardImages.push(file.path);
                            });
                        }

                        // 創建獎勵資料 - 只取有效的配對數據
                        const rewardsData = [];
                        for (let i = 0; i < minLength; i++) {
                            if (parsedRewardNames[i] && parsedRewardPoints[i]) {
                                rewardsData.push({
                                    type: 'points_reward',
                                    name: parsedRewardNames[i],
                                    points: parsedRewardPoints[i],
                                    img: rewardImages[i] || '/images/coupon-default.svg',
                                    slug: slugname
                                });
                            }
                        }

                        // 只有當有有效數據時才儲存獎勵資料
                        if (rewardsData.length > 0) {
                            try {
                                const RewardsSchema = require('../models/points/rewards');
                                const Rewards = cardDB.model('PointsRewards', RewardsSchema);
                                await Rewards.insertMany(rewardsData);
                            } catch (error) {
                                console.error('❌ 獎勵設定失敗:', error);
                            }
                        }
                    }
                }

                // 處理集點卡規則
                if (pointRules) {
                    let parsedPointRules = [];
                    try {
                        if (Array.isArray(pointRules)) {
                            parsedPointRules = pointRules;
                        } else if (typeof pointRules === 'string' && pointRules.trim()) {
                            parsedPointRules = JSON.parse(pointRules);
                        } else {
                            parsedPointRules = [];
                        }
                        
                        // 過濾空字符串和無效值，處理可能的陣列嵌套問題
                        parsedPointRules = parsedPointRules
                            .filter(rule => rule !== null && rule !== undefined)
                            .map(rule => {
                                // 如果規則本身是陣列，取第一個元素
                                if (Array.isArray(rule)) {
                                    return rule.length > 0 ? rule[0] : '';
                                }
                                // 確保轉換為字符串
                                return String(rule);
                            })
                            .filter(rule => rule && rule.trim().length > 0)
                            .map(rule => rule.trim());
                    } catch (error) {
                        console.error('Point rules JSON parse error:', error, 'Raw data:', pointRules);
                        parsedPointRules = [];
                    }
                    
                    if (parsedPointRules.length > 0) {
                        const rulesData = parsedPointRules.map((text, index) => ({
                            type: 'points_settings',
                            class: 'rule_settings',
                            article: index + 1,
                            text: String(text).trim(), // 確保是字符串並去除空格
                            slug: slugname
                        }));

                        // 儲存規則資料
                        try {
                            const PointRulesSchema = require('../models/points/rules');
                            const PointRules = cardDB.model('PointsRules', PointRulesSchema);
                            await PointRules.insertMany(rulesData);
                        } catch (error) {
                            console.error('❌ 集點卡規則設定失敗:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('❌ 集點卡設定失敗:', error);
            }
        }
        
        // 在 clientBDB 中創建訂位設定
        try {
            const bookingSettingsSchema = require('../models/BookingSettings');
            const BookingSettings = bookingDB.model('BookingSettings', bookingSettingsSchema);
            
            await BookingSettings.create({
                slug: slugname,
                type: 'booking_settings',
                class: 'main_settings',
                state: (bookingSystem === 'true' || bookingSystem === true) ? 'enable' : 'disabled'
            });
        } catch (error) {
            console.error('❌ 訂位設定失敗:', error);
        }

        // 處理時段和規則資料
        let parsedTimeSlots = [];
        let parsedDiningRules = [];
        
        
        try {
            if (Array.isArray(timeSlots)) {
                parsedTimeSlots = timeSlots;
            } else if (typeof timeSlots === 'string' && timeSlots.trim()) {
                parsedTimeSlots = JSON.parse(timeSlots);
            } else {
                parsedTimeSlots = [];
            }
            
            // 額外清理：確保每個時段都是正確的字符串格式
            parsedTimeSlots = parsedTimeSlots.map(time => {
                let cleanTime = time;
                
                // 如果是數組，取第一個元素
                if (Array.isArray(cleanTime)) {
                    cleanTime = cleanTime[0];
                }
                
                // 確保是字符串並清理
                cleanTime = cleanTime.toString().trim();
                
                // 移除可能的引號
                cleanTime = cleanTime.replace(/^["']|["']$/g, '');
                
                return cleanTime;
            }).filter(time => {
                // 只保留有效的時間格式
                return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
            });
            
            
        } catch (error) {
            console.error('Time slots JSON parse error:', error, 'Raw data:', timeSlots);
            parsedTimeSlots = Array.isArray(timeSlots) ? timeSlots : [];
        }
        
        try {
            if (Array.isArray(diningRules)) {
                parsedDiningRules = diningRules;
            } else if (typeof diningRules === 'string' && diningRules.trim()) {
                parsedDiningRules = JSON.parse(diningRules);
            } else {
                parsedDiningRules = [];
            }
        } catch (error) {
            console.error('Dining rules JSON parse error:', error, 'Raw data:', diningRules);
            parsedDiningRules = Array.isArray(diningRules) ? diningRules : [];
        }

        // 在 clientBDB 中創建時段設定
        if (parsedTimeSlots.length > 0) {
            try {
                const timeSettingsSchema = require('../models/TimeSettings');
                const TimeSettings = bookingDB.model('TimeSettings', timeSettingsSchema);
                
                const timeSettingsData = parsedTimeSlots.map(time => {
                    return { time, available: true };
                });
                await TimeSettings.insertMany(timeSettingsData);
            } catch (error) {
                console.error('❌ 時段設定失敗:', error);
            }
        }

        // 在 clientBDB 中創建訂位規則
        if (parsedDiningRules.length > 0) {
            try {
                const bookingRulesSchema = require('../models/BookingRules');
                const BookingRules = bookingDB.model('BookingRules', bookingRulesSchema);
                
                const bookingRulesData = parsedDiningRules.map((text, index) => ({ 
                    text, 
                    order: index,
                    isActive: true 
                }));
                await BookingRules.insertMany(bookingRulesData);
            } catch (error) {
                console.error('❌ 用餐規則設定失敗:', error);
            }
        }

        res.json({ success: true, client });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 檢查客戶是否存在的API (通過slugname)
router.get('/api/check-client/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const client = await Client.findOne({ slugname: slug });
        
        if (client) {
            res.json({ exists: true, client });
        } else {
            res.status(404).json({ exists: false });
        }
    } catch (error) {
        res.status(500).json({ exists: false, error: error.message });
    }
});

// 檢查客戶名稱是否重複的API
router.get('/api/check-clientname/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const client = await Client.findOne({ clientname: name });
        
        if (client) {
            res.json({ exists: true, message: '客戶名稱已被使用' });
        } else {
            res.json({ exists: false, message: '客戶名稱可用' });
        }
    } catch (error) {
        res.status(500).json({ exists: false, error: error.message });
    }
});

// 檢查資料庫是否存在的API
router.get('/api/check-database/:dbName', async (req, res) => {
    try {
        const { dbName } = req.params;
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        const dbExists = dbs.databases.some(db => db.name === dbName);
        
        if (dbExists) {
            res.json({ exists: true, database: dbName });
        } else {
            res.status(404).json({ exists: false, database: dbName });
        }
    } catch (error) {
        res.status(500).json({ exists: false, error: error.message });
    }
});

// 檢查設定是否配置完成的API
router.get('/api/check-settings/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // 檢查訂位設定
        const bookingDB = getClientDb(slug, 'BDB');
        const bookingSettingsSchema = require('../models/BookingSettings');
        const BookingSettings = bookingDB.model('BookingSettings', bookingSettingsSchema);
        const bookingSettings = await BookingSettings.findOne({ 
            slug, 
            type: 'booking_settings' 
        });
        
        let pointsSettings = null;
        try {
            // 檢查集點卡設定（可能不存在）
            const cardDB = getClientDb(slug, 'CDB');
            const pointsSettingsSchema = require('../models/points/settings');
            const PointsSettings = cardDB.model('PointsSettings', pointsSettingsSchema);
            pointsSettings = await PointsSettings.findOne({ 
                slug, 
                type: 'points_settings' 
            });
        } catch (error) {
            // 集點卡設定可能不存在，這是正常的
        }
        
        res.json({ 
            configured: true, 
            bookingSettings: !!bookingSettings,
            pointsSettings: !!pointsSettings
        });
    } catch (error) {
        res.status(404).json({ configured: false, error: error.message });
    }
});

// 訂位系統路由 (必須在客戶特定路由之前)
router.use('/', bookingRoutes);

// 客戶主頁路由 - 重定向到card頁面
router.get('/:storeSlug', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        
        // 查找客戶是否存在
        const client = await Client.findOne({ slugname: storeSlug });
        if (!client) {
            return res.status(404).render('error', { message: '客戶不存在' });
        }

        // 重定向到集點卡頁面
        res.redirect(`/${storeSlug}/card`);
    } catch (error) {
        console.error('Error in restaurant home:', error);
        res.status(500).render('error', { message: '系統錯誤' });
    }
});

// 後台登入頁面 - 必須在 /:storeSlug/:page 之前
router.get('/:storeSlug/backstage-login', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        
        // 檢查客戶是否存在
        const client = await Client.findOne({ slugname: storeSlug });
        if (!client) {
            return res.status(404).render('error', { message: '餐廳不存在' });
        }

        // 檢查是否已經登入後台
        const backstageAuth = req.session.backstageAuth;
        const isBackstageAuthenticated = backstageAuth && 
                                       backstageAuth.storeSlug === storeSlug &&
                                       (Date.now() - new Date(backstageAuth.loginTime).getTime()) < 2 * 60 * 60 * 1000;
        
        if (isBackstageAuthenticated) {
            // 如果已經登入，直接跳轉到後台
            return res.redirect(`/${storeSlug}/backstage`);
        }

        res.render('backstage-login', {
            storeSlug,
            clientname: client.clientname,
            layout: false,
            message: req.query.message
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { message: '系統錯誤' });
    }
});

// 後台登入處理
router.post('/:storeSlug/backstage-login', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { adminPassword, rememberMe } = req.body;

        if (!adminPassword) {
            return res.status(400).json({
                success: false,
                message: '請輸入管理員密碼'
            });
        }

        // 查找客戶
        const client = await Client.findOne({ slugname: storeSlug });
        if (!client) {
            return res.status(404).json({
                success: false,
                message: '餐廳不存在'
            });
        }

        // 檢查密碼
        if (!client.adminPassword || client.adminPassword !== adminPassword) {
            return res.status(401).json({
                success: false,
                message: '密碼錯誤'
            });
        }

        // 設置 session
        req.session.backstageAuth = {
            storeSlug: storeSlug,
            loginTime: new Date(),
            authenticated: true
        };

        // 如果選擇記住登入狀態，設置較長的過期時間
        if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
        }

        res.json({
            success: true,
            redirectUrl: `/${storeSlug}/backstage`
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: '系統錯誤'
        });
    }
});

// 後台登出 - 支援 AJAX 請求和一般請求
router.get('/:storeSlug/backstage/logout', (req, res) => {
    const { storeSlug } = req.params;
    const { redirect } = req.query;
    
    // 清除後台認證 session
    if (req.session.backstageAuth) {
        delete req.session.backstageAuth;
    }
    
    // 如果是 AJAX 請求或指定不重定向
    if (req.xhr || req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({ success: true, message: '已成功登出' });
    }
    
    // 如果指定了重定向頁面且不是 backstage
    if (redirect && redirect !== 'backstage') {
        return res.redirect(`/${storeSlug}/${redirect}`);
    }
    
    // 預設重定向到登入頁面
    res.redirect(`/${storeSlug}/backstage-login?message=已成功登出`);
});

// 客戶特定路由
router.get('/:storeSlug/:page', async (req, res) => {
    try {
        const { storeSlug, page } = req.params;
        const validPages = ['card', 'account', 'backstage'];
        
        if (!validPages.includes(page)) {
            return res.status(404).render('error', { message: '頁面不存在' });
        }

        // 查找客戶
        const client = await Client.findOne({ slugname: storeSlug });
        if (!client) {
            return res.status(404).render('error', { message: '客戶不存在' });
        }

        // 從全局中間件獲取 isOwner 和 user 資訊
        const isOwner = res.locals.isOwner || false;
        const currentUser = res.locals.user || null;

        // 如果是後台頁面，檢查是否已通過後台驗證
        if (page === 'backstage') {
            // 檢查session中是否有後台驗證記錄
            const backstageAuth = req.session.backstageAuth;
            const isBackstageAuthenticated = backstageAuth && 
                                           backstageAuth.storeSlug === storeSlug &&
                                           (Date.now() - new Date(backstageAuth.loginTime).getTime()) < 2 * 60 * 60 * 1000; // 2小時有效
            
            if (!isBackstageAuthenticated) {
                // 無論是否為owner，都需要通過後台登入驗證
                return res.redirect(`/${storeSlug}/backstage-login`);
            }
        }

        // 如果是後台頁面，獲取點數相關數據和時段、規則數據
        let points = 0;
        let timeSlots = [];
        let diningRules = [];
        let featureSettings = { pointsSystem: false, bookingSystem: true };
        let pointsRulesFromDB = null;
        
        if (page === 'backstage') {
            // 獲取功能設定和點數規則
            try {
                // 從 clientCDB 獲取集點卡設定
                const cardDB = getClientDb(storeSlug, 'CDB');
                const pointsSettingsSchema = require('../models/points/settings');
                const PointsSettings = cardDB.model('PointsSettings', pointsSettingsSchema);
                const pointsSettings = await PointsSettings.findOne({ 
                    slug: storeSlug, 
                    type: 'points_settings', 
                    class: 'main_settings' 
                });
                
                // 從 pointsSettings 載入點數規則
                if (pointsSettings) {
                    pointsRulesFromDB = {
                        welcomePoints: pointsSettings.s_reward || 0,
                        maxPointsPerDay: pointsSettings.maxPointsPerDay || 3,
                        pointsExpireDays: pointsSettings.pointsExpireDays || 365
                    };
                }
                
                // 從 clientBDB 獲取訂位設定
                const bookingDB = getClientDb(storeSlug, 'BDB');
                const bookingSettingsSchema = require('../models/BookingSettings');
                const BookingSettings = bookingDB.model('BookingSettings', bookingSettingsSchema);
                const bookingSettings = await BookingSettings.findOne({ 
                    slug: storeSlug, 
                    type: 'booking_settings', 
                    class: 'main_settings' 
                });
                
                featureSettings = {
                    pointsSystem: pointsSettings ? pointsSettings.state === 'enable' : false,
                    bookingSystem: bookingSettings ? bookingSettings.state === 'enable' : true // 預設開啟
                };
            } catch (error) {
                console.error('Error fetching feature settings:', error);
            }

            // 獲取點數數據
            if (req.user) {
                const userDb = getClientDb(storeSlug, 'ADB');
                const userPoints = await userDb.model('UserPoints', require('../models/points/userPoints'))
                    .findOne({ lineId: req.user.lineId });
                points = userPoints ? userPoints.points : 0;
            }
            
            // 獲取時段設定
            const bookingDB = getClientDb(storeSlug, 'BDB');
            const timeSettingsSchema = require('../models/TimeSettings');
            const TimeSettings = bookingDB.model('TimeSettings', timeSettingsSchema);
            const rawTimeSlots = await TimeSettings.find({}).sort({ createdAt: 1 });
            
            // 按時間排序時段
            timeSlots = rawTimeSlots.sort((a, b) => {
                const getTimeValue = (timeStr) => {
                    const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
                    if (match) {
                        const hours = parseInt(match[1]);
                        const minutes = parseInt(match[2]);
                        return hours * 60 + minutes;
                    }
                    return 0;
                };
                return getTimeValue(a.time) - getTimeValue(b.time);
            });
            
            // 獲取訂位規則
            const bookingRulesSchema = require('../models/BookingRules');
            const BookingRules = bookingDB.model('BookingRules', bookingRulesSchema);
            diningRules = await BookingRules.find({ isActive: true }).sort({ order: 1 });
        }

        // 渲染對應頁面
        const renderOptions = {
            storeSlug,
            clientname: client.clientname,
            customSettings: {
                timeSlots,
                diningRules,
                restaurantImage: client.restaurantImage,
                cardBackgroundImage: client.cardBackgroundImage,
                features: featureSettings,
                pointsRules: pointsRulesFromDB || client.customSettings?.pointsRules || null,
                rewards: client.customSettings?.rewards || null,
                restaurantAddress: client.customSettings?.restaurantAddress || ''
            },
            points,
            createdAt: client.createdAt,
            updatedAt: client.updatedAt,
            isOwner: isOwner,
            user: currentUser,
            systemDisabled: false,
            systemIncomplete: false,
            req: req
        };

        // 如果是 backstage 頁面，不載入 layout
        if (page === 'backstage') {
            renderOptions.layout = false;
        }

        res.render(page, renderOptions);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { message: '系統錯誤' });
    }
});

// 檢查集點卡系統完整性的輔助函數
async function checkPointsSystemCompleteness(storeSlug) {
    const missing = [];
    
    try {
        // 檢查是否有集點規則設定
        const cardDB = getClientDb(storeSlug, 'CDB');
        const pointsSettingsSchema = require('../models/points/settings');
        const PointsSettings = cardDB.model('PointsSettings', pointsSettingsSchema);
        
        const pointsSettings = await PointsSettings.findOne({ 
            slug: storeSlug, 
            type: 'points_settings', 
            class: 'main_settings' 
        });
        
        if (!pointsSettings || 
            pointsSettings.maxPointsPerDay === undefined || 
            pointsSettings.pointsExpireDays === undefined) {
            missing.push('集點規則設定');
        }
        
        // 檢查是否有獎勵設定
        const client = await Client.findOne({ slugname: storeSlug });
        if (!client.customSettings?.rewards || 
            !Array.isArray(client.customSettings.rewards) || 
            client.customSettings.rewards.length === 0) {
            missing.push('獎勵項目設定');
        } else {
            // 檢查獎勵是否有效
            const activeRewards = client.customSettings.rewards.filter(reward => 
                reward.name && reward.points && reward.points > 0 && reward.active === true
            );
            if (activeRewards.length === 0) {
                missing.push('有效的獎勵項目');
            }
        }
        
        return {
            complete: missing.length === 0,
            missing: missing
        };
    } catch (error) {
        console.error('檢查集點卡完整性錯誤:', error);
        return {
            complete: false,
            missing: ['系統設定檢查失敗']
        };
    }
}

// 功能啟用API
router.post('/:storeSlug/api/settings/features', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { pointsSystem, bookingSystem } = req.body;

        // 如果要啟用集點卡系統，先檢查完整性
        if (pointsSystem) {
            const completenessCheck = await checkPointsSystemCompleteness(storeSlug);
            if (!completenessCheck.complete) {
                return res.status(400).json({ 
                    success: false, 
                    error: `集點卡功能需要完整設定才能啟用。缺少：${completenessCheck.missing.join('、')}`,
                    missingSettings: completenessCheck.missing
                });
            }
        }

        // 更新 clientCDB 中的集點卡設定
        try {
            const cardDB = getClientDb(storeSlug, 'CDB');
            const pointsSettingsSchema = require('../models/points/settings');
            const PointsSettings = cardDB.model('PointsSettings', pointsSettingsSchema);
            
            const pointsResult = await PointsSettings.findOneAndUpdate(
                { 
                    slug: storeSlug, 
                    type: 'points_settings', 
                    class: 'main_settings' 
                },
                { 
                    slug: storeSlug,
                    type: 'points_settings',
                    class: 'main_settings',
                    state: pointsSystem ? 'enable' : 'disabled',
                    s_reward: 0,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );
        } catch (cdbError) {
            console.error('❌ 集點卡設定更新失敗:', cdbError);
        }

        // 更新 clientBDB 中的訂位設定
        try {
            const bookingDB = getClientDb(storeSlug, 'BDB');
            const bookingSettingsSchema = require('../models/BookingSettings');
            const BookingSettings = bookingDB.model('BookingSettings', bookingSettingsSchema);
            
            const bookingResult = await BookingSettings.findOneAndUpdate(
                { 
                    slug: storeSlug, 
                    type: 'booking_settings', 
                    class: 'main_settings' 
                },
                { 
                    slug: storeSlug,
                    type: 'booking_settings',
                    class: 'main_settings',
                    state: bookingSystem ? 'enable' : 'disabled',
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );
        } catch (bdbError) {
            console.error('❌ 訂位設定更新失敗:', bdbError);
        }

        res.json({ success: true, message: '功能設定已更新' });
    } catch (error) {
        console.error('❌ 功能設定更新錯誤:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新基本資訊
router.post('/:storeSlug/api/settings/basicInfo', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { clientname, restaurantAddress } = req.body;

        // 驗證餐廳名稱
        if (!clientname || clientname.trim().length < 2 || clientname.trim().length > 30) {
            return res.status(400).json({ 
                success: false, 
                error: '餐廳名稱必須在2-30個字元之間' 
            });
        }

        const updateData = {
            clientname: clientname.trim(),
            restaurantAddress: restaurantAddress ? restaurantAddress.trim() : ''
        };

        await Client.findOneAndUpdate(
            { slugname: storeSlug },
            updateData
        );

        res.json({ success: true, message: '基本資訊已更新' });
    } catch (error) {
        console.error('❌ 基本資訊更新錯誤:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/:storeSlug/api/settings/images', upload.fields([
    { name: 'restaurantImage', maxCount: 1 },
    { name: 'cardBackgroundImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const updateData = {};

        if (req.files && req.files.restaurantImage) {
            updateData.restaurantImage = req.files.restaurantImage[0].path;
        }
        
        if (req.files && req.files.cardBackgroundImage) {
            updateData.cardBackgroundImage = req.files.cardBackgroundImage[0].path;
        }

        if (Object.keys(updateData).length > 0) {
            await Client.findOneAndUpdate(
                { slugname: storeSlug },
                updateData
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/:storeSlug/api/settings/timeSlots', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { timeSlots } = req.body;

        const bookingDB = getClientDb(storeSlug, 'BDB');
        const timeSettingsSchema = require('../models/TimeSettings');
        const TimeSettings = bookingDB.model('TimeSettings', timeSettingsSchema);

        // 刪除舊的時段設定
        await TimeSettings.deleteMany({});
        
        // 插入新的時段設定
        if (timeSlots && timeSlots.length > 0) {
            // 清理和驗證時段數據
            const cleanedTimeSlots = timeSlots.map(time => {
                let cleanTime = time;
                
                // 如果是數組，取第一個元素
                if (Array.isArray(cleanTime)) {
                    cleanTime = cleanTime[0];
                }
                
                // 確保是字符串並清理
                cleanTime = cleanTime.toString().trim();
                
                // 移除可能的引號和JSON格式
                cleanTime = cleanTime.replace(/^["'\[]|["'\]]$/g, '');
                
                return cleanTime;
            }).filter(time => {
                // 只保留有效的時間格式
                return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
            });
            
            // 時間排序函數
            const sortTimeSlots = (slots) => {
                return slots.sort((a, b) => {
                    // 提取時間部分進行比較
                    const getTimeValue = (timeStr) => {
                        // 支援格式：HH:MM, HH:MM-HH:MM, HH:MM~HH:MM
                        const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
                        if (match) {
                            const hours = parseInt(match[1]);
                            const minutes = parseInt(match[2]);
                            return hours * 60 + minutes;
                        }
                        return 0;
                    };
                    
                    return getTimeValue(a) - getTimeValue(b);
                });
            };

            // 排序時段
            const sortedTimeSlots = sortTimeSlots([...cleanedTimeSlots]);
            
            const timeSettingsData = sortedTimeSlots.map(time => {
                return { time, available: true };
            });
            await TimeSettings.insertMany(timeSettingsData);
        }

        res.json({ success: true, message: '時段設定已更新' });
    } catch (error) {
        console.error('❌ 時段設定更新錯誤:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/:storeSlug/api/settings/diningRules', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { diningRules } = req.body;

        const bookingDB = getClientDb(storeSlug, 'BDB');
        const bookingRulesSchema = require('../models/BookingRules');
        const BookingRules = bookingDB.model('BookingRules', bookingRulesSchema);

        // 刪除舊的用餐規則
        await BookingRules.deleteMany({});
        
        // 插入新的用餐規則
        if (diningRules && diningRules.length > 0) {
            const bookingRulesData = diningRules.map((text, index) => ({ 
                text, 
                order: index,
                isActive: true 
            }));
            await BookingRules.insertMany(bookingRulesData);
        }

        res.json({ success: true, message: '用餐規則已更新' });
    } catch (error) {
        console.error('❌ 用餐規則更新錯誤:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 集點規則設定 API
router.post('/:storeSlug/backstage/points-rules', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { welcomePoints, maxPointsPerDay, pointsExpireDays } = req.body;

        // 驗證數據
        if (welcomePoints !== undefined && (welcomePoints < 0 || welcomePoints > 50)) {
            return res.status(400).json({ 
                success: false, 
                message: '首次領取獎勵必須在0-50之間' 
            });
        }

        if (!maxPointsPerDay || maxPointsPerDay < 1 || maxPointsPerDay > 20) {
            return res.status(400).json({ 
                success: false, 
                message: '每日點數上限必須在1-20之間' 
            });
        }

        if (!pointsExpireDays || pointsExpireDays < 30 || pointsExpireDays > 1095) {
            return res.status(400).json({ 
                success: false, 
                message: '點數有效期必須在30-1095天之間' 
            });
        }

        // 更新客戶設定 (只更新 pointsRules 部分，保留其他設定)
        const pointsRulesData = {
            welcomePoints: parseInt(welcomePoints || 0),
            maxPointsPerDay: parseInt(maxPointsPerDay),
            pointsExpireDays: parseInt(pointsExpireDays)
        };

        await Client.findOneAndUpdate(
            { slugname: storeSlug },
            { $set: { 'customSettings.pointsRules': pointsRulesData } },
            { upsert: true }
        );

        // 同時更新 pointssettings 資料庫
        const cardDB = getClientDb(storeSlug, 'CDB');
        const pointsSettingsSchema = require('../models/points/settings');
        const PointsSettings = cardDB.model('PointsSettings', pointsSettingsSchema);
        
        await PointsSettings.findOneAndUpdate(
            { 
                slug: storeSlug,
                type: 'points_settings', 
                class: 'main_settings' 
            },
            { 
                $set: { 
                    s_reward: parseInt(welcomePoints || 0),
                    maxPointsPerDay: parseInt(maxPointsPerDay),
                    pointsExpireDays: parseInt(pointsExpireDays),
                    updatedAt: new Date()
                } 
            },
            { upsert: true }
        );

        res.json({ success: true, message: '集點規則設定已更新' });
    } catch (error) {
        console.error('❌ 集點規則設定更新錯誤:', error);
        res.status(500).json({ success: false, message: '更新失敗，請稍後再試' });
    }
});

// 生成QR碼 API
router.post('/:storeSlug/backstage/qrcode/generate', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { points } = req.body;

        // 驗證參數
        if (!points || points < 1 || points > 100) {
            return res.status(400).json({ 
                success: false, 
                message: '點數必須介於 1-100 之間' 
            });
        }

        // 刪除該商家所有舊的QR碼
        const cardDB = getClientDb(storeSlug, 'CDB');
        const qrcodeSchema = require('../models/points/qrcode');
        const QRCodeModel = cardDB.model('QRCode', qrcodeSchema);

        await QRCodeModel.deleteMany({ 
            slug: storeSlug, 
            status: 'active' 
        });

        // 生成新的QR碼
        const qrCode = generateQRCode(storeSlug, points);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分鐘後過期

        // 保存到資料庫
        const newQRCode = new QRCodeModel({
            code: qrCode,
            slug: storeSlug,
            points: points,
            status: 'active',
            expiresAt: expiresAt,
            createdAt: new Date()
        });

        await newQRCode.save();

        // 生成QR碼圖片
        const qrUrl = `${req.protocol}://${req.get('host')}/${storeSlug}/points/qr/${qrCode}`;
        
        try {
            // 生成QR碼圖片 (Base64格式)
            const qrImageDataUrl = await QRCode.toDataURL(qrUrl, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            res.json({ 
                success: true, 
                qrCode: qrCode,
                url: qrUrl,
                qrImage: qrImageDataUrl, // Base64 圖片
                points: points,
                expiresAt: expiresAt.toISOString()
            });
        } catch (qrError) {
            console.error('QR碼圖片生成失敗:', qrError);
            // 即使圖片生成失敗，仍然返回基本資訊
            res.json({ 
                success: true, 
                qrCode: qrCode,
                url: qrUrl,
                qrImage: null,
                points: points,
                expiresAt: expiresAt.toISOString(),
                warning: 'QR碼圖片生成失敗，但功能正常'
            });
        }

    } catch (error) {
        console.error('❌ QR碼生成錯誤:', error);
        res.status(500).json({ success: false, message: 'QR碼生成失敗' });
    }
});

// 獲取當前QR碼狀態 API
router.get('/:storeSlug/backstage/qrcode/status', async (req, res) => {
    try {
        const { storeSlug } = req.params;

        const cardDB = getClientDb(storeSlug, 'CDB');
        const qrcodeSchema = require('../models/points/qrcode');
        const QRCode = cardDB.model('QRCode', qrcodeSchema);
        const { generateQRCodeURL } = require('../utils/qrcodeHelper');

        // 查找當前活躍的QR碼
        const activeQRCode = await QRCode.findOne({ 
            slug: storeSlug, 
            status: 'active',
            expiresAt: { $gt: new Date() }
        });

        if (!activeQRCode) {
            return res.json({ 
                success: true, 
                hasActiveQR: false,
                message: '目前沒有活躍的QR碼'
            });
        }

        const qrURL = generateQRCodeURL(storeSlug, activeQRCode.code);

        res.json({ 
            success: true, 
            hasActiveQR: true,
            qrcode: {
                code: activeQRCode.code,
                points: activeQRCode.points,
                url: qrURL,
                expiresAt: activeQRCode.expiresAt,
                createdAt: activeQRCode.createdAt
            }
        });
    } catch (error) {
        console.error('❌ QR碼狀態獲取錯誤:', error);
        res.status(500).json({ success: false, message: '獲取QR碼狀態失敗' });
    }
});

// 刪除當前QR碼 API
router.delete('/:storeSlug/backstage/qrcode/current', async (req, res) => {
    try {
        const { storeSlug } = req.params;

        const cardDB = getClientDb(storeSlug, 'CDB');
        const qrcodeSchema = require('../models/points/qrcode');
        const QRCode = cardDB.model('QRCode', qrcodeSchema);

        // 刪除該商家所有活躍的QR碼
        const result = await QRCode.deleteMany({ 
            slug: storeSlug, 
            status: 'active' 
        });

        res.json({ 
            success: true, 
            message: `已刪除 ${result.deletedCount} 個QR碼`
        });
    } catch (error) {
        console.error('❌ QR碼刪除錯誤:', error);
        res.status(500).json({ success: false, message: 'QR碼刪除失敗' });
    }
});

// 獎勵設定 API
router.post('/:storeSlug/backstage/rewards', upload.array('rewardImage[]', 10), async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const rewardNames = req.body['rewardName[]'] || req.body.rewardName || [];
        const rewardPoints = req.body['rewardPoints[]'] || req.body.rewardPoints || [];
        const rewardActives = req.body['rewardActive[]'] || req.body.rewardActive || [];
        const files = req.files || [];

        // 詳細調試信息
        console.log('🔍 獎勵設定 - 收到的原始數據:');
        console.log('  req.body:', JSON.stringify(req.body, null, 2));
        console.log('  rewardNames:', rewardNames);
        console.log('  rewardPoints:', rewardPoints);
        console.log('  rewardActives:', rewardActives);
        console.log('  files:', files.map(f => ({ originalname: f.originalname, fieldname: f.fieldname })));

        // 確保所有輸入都是陣列
        const names = Array.isArray(rewardNames) ? rewardNames : (rewardNames ? [rewardNames] : []);
        const points = Array.isArray(rewardPoints) ? rewardPoints : (rewardPoints ? [rewardPoints] : []);
        
        // 過濾出有效的獎勵數據（去除空的項目）
        const validRewards = [];
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            const point = parseInt(points[i]);
            
            // 只有當名稱不為空且點數有效時才加入
            if (name && name.trim().length > 0 && !isNaN(point) && point >= 1 && point <= 100) {
                validRewards.push({ name: name.trim(), points: point, index: i });
            }
        }
        
        console.log('  有效獎勵數量:', validRewards.length);
        
        // 驗證至少有一個有效獎勵
        if (validRewards.length === 0) {
            console.log('❌ 驗證失敗: 沒有有效的獎勵項目');
            return res.status(400).json({ 
                success: false, 
                message: '至少需要設定一個獎勵項目，請檢查獎勵名稱和點數是否正確填寫' 
            });
        }

        // 處理有效的獎勵數據
        const rewards = [];
        for (let j = 0; j < validRewards.length; j++) {
            const validReward = validRewards[j];
            const originalIndex = validReward.index;
            
            // 處理獎勵圖片
            let imgUrl = '/images/coupon-default.svg'; // 預設圖片
            
            // 尋找對應的上傳文件
            const matchingFile = files.find(file => {
                // 文件的索引可能不連續，需要根據fieldname來匹配
                return file.fieldname === 'rewardImage[]';
            });
            
            if (matchingFile && matchingFile.path) {
                imgUrl = matchingFile.path; // Cloudinary URL
                // 使用完畢後從files陣列中移除，避免重複使用
                const fileIndex = files.indexOf(matchingFile);
                if (fileIndex > -1) {
                    files.splice(fileIndex, 1);
                }
            } else {
                // 如果沒有新圖片，保持現有圖片
                try {
                    const currentClient = await Client.findOne({ slugname: storeSlug });
                    if (currentClient && currentClient.customSettings && 
                        currentClient.customSettings.rewards && 
                        currentClient.customSettings.rewards[j] && 
                        currentClient.customSettings.rewards[j].img) {
                        imgUrl = currentClient.customSettings.rewards[j].img;
                    }
                } catch (err) {
                    console.log('無法獲取現有圖片:', err);
                }
            }

            // 初始設定為未啟用，稍後會重新處理
            rewards.push({
                name: validReward.name,
                points: validReward.points,
                img: imgUrl,
                active: false
            });
        }

        // 處理checkbox狀態（HTML checkbox只會在選中時發送值）
        const activeValues = Array.isArray(rewardActives) ? rewardActives : (rewardActives ? [rewardActives] : []);
        
        console.log('🔍 Checkbox處理調試:');
        console.log('  rewardActives:', rewardActives);
        console.log('  activeValues:', activeValues);
        console.log('  rewards count:', rewards.length);
        
        // 根據發送的checkbox值設定active狀態
        // 每個checkbox的value應該是該項目的索引
        activeValues.forEach(value => {
            if (value === 'on') {
                // 如果沒有指定索引，可能是單一checkbox
                rewards.forEach(reward => reward.active = true);
                console.log('  設定所有獎勵為啟用 (value=on)');
            } else {
                const index = parseInt(value);
                if (!isNaN(index) && rewards[index]) {
                    rewards[index].active = true;
                    console.log(`  啟用獎勵項目 ${index}`);
                }
            }
        });
        
        // 如果沒有收到任何active值，檢查form data中是否有checkbox名稱出現
        if (activeValues.length === 0) {
            // 所有checkbox都未選中，保持active: false
            console.log('  沒有啟用的獎勵項目');
        }
        
        console.log('  最終獎勵狀態:', rewards.map((r, i) => ({ index: i, name: r.name, active: r.active })));

        // 更新客戶設定
        await Client.findOneAndUpdate(
            { slugname: storeSlug },
            { $set: { 'customSettings.rewards': rewards } },
            { upsert: true }
        );

        res.json({ success: true, message: '獎勵設定已更新' });
    } catch (error) {
        console.error('❌ 獎勵設定更新錯誤:', error);
        res.status(500).json({ success: false, message: '更新失敗，請稍後再試' });
    }
});

// 獲取集點卡統計數據
router.get('/:storeSlug/backstage/points-stats', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        
        // 獲取用戶數據庫
        const adb = getClientDb(storeSlug, 'ADB');
        const userPointsSchema = require('../models/points/userPoints');
        const UserPoints = adb.model('UserPoints', userPointsSchema);
        
        // 獲取集點卡數據庫
        const cdb = getClientDb(storeSlug, 'CDB');
        const pointsCouponsSchema = require('../models/points/coupons');
        const PointsCoupons = cdb.model('PointsCoupons', pointsCouponsSchema);
        
        // 1. 註冊會員數量 (擁有集點卡的用戶)
        const totalMembers = await UserPoints.countDocuments({});
        
        // 2. 活躍會員數量 (30天內有點數變動的用戶)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const activeMembers = await UserPoints.countDocuments({
            updatedAt: { $gte: thirtyDaysAgo }
        });
        
        // 3. 已兌換獎勵數量
        const totalRedeemed = await PointsCoupons.countDocuments({
            type: 'points_coupon',
            status: { $in: ['issued', 'used'] }
        });
        
        // 4. 總發放點數
        const totalPointsResult = await UserPoints.aggregate([
            {
                $group: {
                    _id: null,
                    totalPoints: { $sum: '$ah-points' }
                }
            }
        ]);
        
        const totalPoints = totalPointsResult.length > 0 ? totalPointsResult[0].totalPoints : 0;
        
        // 5. 額外統計 - 本月新增會員
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        
        const newMembersThisMonth = await UserPoints.countDocuments({
            createdAt: { $gte: thisMonth }
        });
        
        // 6. 額外統計 - 本月兌換數量
        const redeemedThisMonth = await PointsCoupons.countDocuments({
            type: 'points_coupon',
            status: { $in: ['issued', 'used'] },
            createdAt: { $gte: thisMonth }
        });
        
        res.json({
            success: true,
            stats: {
                totalMembers,
                activeMembers,
                totalRedeemed,
                totalPoints,
                newMembersThisMonth,
                redeemedThisMonth
            }
        });
        
    } catch (error) {
        console.error('❌ 獲取統計數據錯誤:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 獲取使用規則
router.get('/:storeSlug/backstage/rules', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        
        const cdb = getClientDb(storeSlug, 'CDB');
        const pointsRulesSchema = require('../models/points/rules');
        const PointsRules = cdb.model('PointsRules', pointsRulesSchema);
        
        const rules = await PointsRules.find({
            slug: storeSlug,
            type: 'points_settings',
            class: 'rule_settings'
        }).sort({ article: 1 });
        
        res.json({ success: true, rules });
    } catch (error) {
        console.error('❌ 獲取規則錯誤:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新使用規則
router.post('/:storeSlug/backstage/rules', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { rules } = req.body;
        
        if (!Array.isArray(rules) || rules.length === 0) {
            return res.status(400).json({ success: false, error: '請提供有效的規則數據' });
        }
        
        const cdb = getClientDb(storeSlug, 'CDB');
        const pointsRulesSchema = require('../models/points/rules');
        const PointsRules = cdb.model('PointsRules', pointsRulesSchema);
        
        // 刪除現有規則
        await PointsRules.deleteMany({
            slug: storeSlug,
            type: 'points_settings',
            class: 'rule_settings'
        });
        
        // 新增更新的規則
        const newRules = rules.map((rule, index) => ({
            slug: storeSlug,
            type: 'points_settings',
            class: 'rule_settings',
            article: index + 1,
            text: rule.text,
            updatedAt: new Date()
        }));
        
        await PointsRules.insertMany(newRules);
        
        res.json({ success: true, message: '使用規則已更新' });
    } catch (error) {
        console.error('❌ 規則更新錯誤:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API獲取時段資料
router.get('/:storeSlug/api/timeSlots', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        
        const bookingDB = getClientDb(storeSlug, 'BDB');
        const timeSettingsSchema = require('../models/TimeSettings');
        const TimeSettings = bookingDB.model('TimeSettings', timeSettingsSchema);
        
        const rawTimeSlots = await TimeSettings.find({ available: true }).sort({ createdAt: 1 });
        
        // 按時間排序時段
        const sortedTimeSlots = rawTimeSlots.sort((a, b) => {
            const getTimeValue = (timeStr) => {
                const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
                if (match) {
                    const hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    return hours * 60 + minutes;
                }
                return 0;
            };
            return getTimeValue(a.time) - getTimeValue(b.time);
        });
        
        res.json({ timeSlots: sortedTimeSlots });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 臨時端點：清理錯誤的時段數據
router.post('/api/fix-timeslots/:storeSlug', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        
        const bookingDB = getClientDb(storeSlug, 'BDB');
        const timeSettingsSchema = require('../models/TimeSettings');
        const TimeSettings = bookingDB.model('TimeSettings', timeSettingsSchema);
        
        // 獲取所有時段數據
        const allTimeSlots = await TimeSettings.find({});
        
        let fixedCount = 0;
        let invalidCount = 0;
        
        for (const slot of allTimeSlots) {
            let cleanTime = slot.time;
            
            // 如果time字段本身就是對象或數組，直接處理
            if (Array.isArray(cleanTime)) {
                if (cleanTime.length > 0) {
                    cleanTime = cleanTime[0].toString();
                } else {
                    await TimeSettings.findByIdAndDelete(slot._id);
                    invalidCount++;
                    continue;
                }
            }
            
            // 確保是字符串
            cleanTime = cleanTime.toString();
            
            // 檢查是否是錯誤的JSON格式字符串
            if (cleanTime.startsWith('[') || cleanTime.startsWith('"') || cleanTime.includes('","')) {
                try {
                    // 嘗試解析錯誤的JSON格式
                    let parsed = cleanTime;
                    
                    // 如果是數組格式的字符串，如 ["23:00","10:00"]
                    if (cleanTime.startsWith('[') && cleanTime.endsWith(']')) {
                        parsed = JSON.parse(cleanTime);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            cleanTime = parsed[0].toString(); // 取第一個元素
                        }
                    }
                    // 如果是被引號包圍的字符串，如 "23:00"
                    else if (cleanTime.startsWith('"') && cleanTime.endsWith('"')) {
                        cleanTime = cleanTime.slice(1, -1); // 移除首尾引號
                    }
                    
                } catch (error) {
                    
                    // 手動清理格式
                    cleanTime = cleanTime
                        .replace(/^\["|"\]$/g, '') // 移除 [" 和 "]
                        .replace(/^\["|\"\]$/g, '') // 移除 [" 和 "]
                        .replace(/^"|"$/g, '') // 移除首尾引號
                        .replace(/","/g, '') // 移除 "," 分隔符，只保留第一個時段
                        .split('","')[0] // 如果有多個時段用 "," 分隔，只取第一個
                        .split(',')[0] // 如果有多個時段用 , 分隔，只取第一個
                        .trim();
                }
            }
            
            // 驗證清理後的時間格式
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (timeRegex.test(cleanTime)) {
                // 只有在時間確實有變化時才更新
                if (cleanTime !== slot.time) {
                    await TimeSettings.findByIdAndUpdate(slot._id, { time: cleanTime });

                    fixedCount++;
                } else {
                    console.log(`✓ Slot ${slot._id} already correct: "${cleanTime}"`);
                }
            } else {
                console.log(`❌ Invalid time format for slot ${slot._id}: "${cleanTime}", deleting...`);
                await TimeSettings.findByIdAndDelete(slot._id);
                invalidCount++;
            }
        }
        
        console.log(`Fix completed: ${fixedCount} fixed, ${invalidCount} deleted`);
        res.json({ 
            success: true, 
            message: `時段修復完成：修復了 ${fixedCount} 個時段，刪除了 ${invalidCount} 個無效時段`,
            fixedCount,
            invalidCount
        });
    } catch (error) {
        console.error('❌ 修復時段數據失敗:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 點數系統路由
router.use('/', pointsRoutes);

// 用戶狀態檢查 API
router.get('/:storeSlug/api/user/status', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        
        // 檢查用戶是否登入
        if (!req.user) {
            return res.json({ 
                success: false, 
                message: '用戶未登入',
                user: null,
                hasCard: false
            });
        }
        
        // 檢查用戶是否有集點卡
        let hasCard = false;
        try {
            const userDb = getClientDb(storeSlug, 'ADB');
            const userPointsSchema = require('../models/points/userPoints');
            const UserPoints = userDb.model('UserPoints', userPointsSchema);
            
            const userCard = await UserPoints.findOne({ 
                lineId: req.user.lineId,
                type: 'user_points'
            });
            
            hasCard = !!userCard;
        } catch (cardError) {
            console.error('檢查集點卡狀態失敗:', cardError);
        }
        
        res.json({ 
            success: true, 
            user: {
                lineId: req.user.lineId,
                name: req.user.name
            },
            hasCard: hasCard
        });
    } catch (error) {
        console.error('❌ 用戶狀態檢查錯誤:', error);
        res.status(500).json({ 
            success: false, 
            message: '檢查用戶狀態失敗',
            user: null,
            hasCard: false
        });
    }
});

// 領取集點卡 API
router.post('/:storeSlug/api/points/claim', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        
        // 檢查用戶是否登入
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                error: '請先登入'
            });
        }
        
        const userDb = getClientDb(storeSlug, 'ADB');
        const cardDB = getClientDb(storeSlug, 'CDB');
        
        const userPointsSchema = require('../models/points/userPoints');
        const pointsSettingsSchema = require('../models/points/pointsSettings');
        
        const UserPoints = userDb.model('UserPoints', userPointsSchema);
        const PointsSettings = cardDB.model('PointsSettings', pointsSettingsSchema);
        
        // 檢查是否已有集點卡
        const existingCard = await UserPoints.findOne({ 
            lineId: req.user.lineId,
            type: 'user_points'
        });
        
        if (existingCard) {
            return res.json({
                success: true,
                message: '您已經擁有集點卡',
                alreadyHas: true
            });
        }
        
        // 獲取首次獎勵設定
        const settings = await PointsSettings.findOne({ slug: storeSlug });
        const firstReward = settings?.s_reward || 0;
        
        // 創建新的集點卡
        const newCard = new UserPoints({
            lineId: req.user.lineId,
            type: 'user_points',
            'ah-points': firstReward,
            pointsHistory: firstReward > 0 ? [{
                points: firstReward,
                type: 'reward',
                description: '首次領取集點卡獎勵',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + (settings?.pointsExpireDays || 365) * 24 * 60 * 60 * 1000)
            }] : [],
            dailyPointsHistory: [],
            redeemedQRCodes: [],
            createdAt: new Date()
        });
        
        await newCard.save();
        
        res.json({
            success: true,
            message: firstReward > 0 
                ? `集點卡領取成功！獲得 ${firstReward} 點首次獎勵`
                : '集點卡領取成功！',
            reward: firstReward
        });
        
    } catch (error) {
        console.error('❌ 集點卡領取錯誤:', error);
        res.status(500).json({ 
            success: false, 
            error: '集點卡領取失敗'
        });
    }
});

module.exports = router; 

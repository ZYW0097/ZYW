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

// 設置頁面
router.get('/setup', (req, res) => {
    res.render('setup', { layout: false });
});

// 載入頁面
router.get('/loading', (req, res) => {
    res.render('loading', { slugname: req.query.slugname, layout: false });
});



// API路由 - 創建客戶
router.post('/api/setup', upload.fields([
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

        // 步驟 1: 創建客戶基本資料
        const clientData = {
            clientname,
            slugname,
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
            } catch (error) {
                console.error('Reward names JSON parse error:', error, 'Raw data:', rewardNames);
                parsedRewardNames = Array.isArray(rewardNames) ? rewardNames : [];
            }
            
            try {
                if (Array.isArray(rewardPoints)) {
                    parsedRewardPoints = rewardPoints;
                } else if (typeof rewardPoints === 'string' && rewardPoints.trim()) {
                    parsedRewardPoints = JSON.parse(rewardPoints);
                } else {
                    parsedRewardPoints = [];
                }
            } catch (error) {
                console.error('Reward points JSON parse error:', error, 'Raw data:', rewardPoints);
                parsedRewardPoints = Array.isArray(rewardPoints) ? rewardPoints : [];
            }
                    
                    if (parsedRewardNames.length > 0 && parsedRewardPoints.length > 0) {
                        // 處理獎勵圖片
                        const rewardImages = [];
                        if (req.files && req.files['rewardImages[]']) {
                            req.files['rewardImages[]'].forEach(file => {
                                rewardImages.push(file.path);
                            });
                        }

                        // 創建獎勵資料
                        const rewardsData = parsedRewardNames.map((name, index) => ({
                            name: name,
                            points: parsedRewardPoints[index] || 0,
                            image: rewardImages[index] || '/images/default-reward.jpg',
                            isActive: true,
                            order: index
                        }));

                        // 這裡需要根據您的獎勵模型來保存
                        // 假設您有一個 Rewards 模型
                        try {
                            // const RewardsSchema = require('../models/points/rewards');
                            // const Rewards = cardDB.model('Rewards', RewardsSchema);
                            // await Rewards.insertMany(rewardsData);
                            console.log('獎勵資料準備完成:', rewardsData);
                        } catch (error) {
                            console.error('❌ 獎勵設定失敗:', error);
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
            } catch (error) {
                console.error('Point rules JSON parse error:', error, 'Raw data:', pointRules);
                parsedPointRules = Array.isArray(pointRules) ? pointRules : [];
            }
                    
                    if (parsedPointRules.length > 0) {
                        const rulesData = parsedPointRules.map((text, index) => ({
                            text: text,
                            order: index,
                            isActive: true
                        }));

                        // 這裡需要根據您的規則模型來保存
                        // 假設您有一個 PointRules 模型
                        try {
                            // const PointRulesSchema = require('../models/points/rules');
                            // const PointRules = cardDB.model('PointRules', PointRulesSchema);
                            // await PointRules.insertMany(rulesData);
                            console.log('集點卡規則準備完成:', rulesData);
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
        
        console.log('Raw timeSlots received:', timeSlots, 'Type:', typeof timeSlots);
        
        try {
            if (Array.isArray(timeSlots)) {
                parsedTimeSlots = timeSlots;
                console.log('timeSlots is array:', parsedTimeSlots);
            } else if (typeof timeSlots === 'string' && timeSlots.trim()) {
                parsedTimeSlots = JSON.parse(timeSlots);
                console.log('timeSlots parsed from string:', parsedTimeSlots);
            } else {
                parsedTimeSlots = [];
                console.log('timeSlots defaulted to empty array');
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
            
            console.log('Cleaned timeSlots:', parsedTimeSlots);
            
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
                    console.log('Creating time setting for:', time, 'Type:', typeof time);
                    return { time, available: true };
                });
                console.log('timeSettingsData to insert:', timeSettingsData);
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

// 檢查客戶是否存在的API
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

        // 移除自訂設定檢查，不再需要

        // 如果是後台頁面，獲取點數相關數據和時段、規則數據
        let points = 0;
        let timeSlots = [];
        let diningRules = [];
        let featureSettings = { pointsSystem: false, bookingSystem: true };
        
        if (page === 'backstage') {
            // 獲取功能設定
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
        res.render(page, {
            storeSlug,
            clientname: client.clientname,
            customSettings: {
                timeSlots,
                diningRules,
                restaurantImage: client.restaurantImage,
                cardBackgroundImage: client.cardBackgroundImage,
                features: featureSettings
            },
            points,
            createdAt: client.createdAt,
            updatedAt: client.updatedAt
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { message: '系統錯誤' });
    }
});

// 功能啟用API
router.post('/:storeSlug/api/settings/features', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { pointsSystem, bookingSystem } = req.body;

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

        console.log('Update timeSlots received:', timeSlots, 'Type:', typeof timeSlots);

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
            
            console.log('Cleaned timeSlots for update:', cleanedTimeSlots);
            
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
            console.log('Sorted timeSlots:', sortedTimeSlots);
            
            const timeSettingsData = sortedTimeSlots.map(time => {
                console.log('Creating update time setting for:', time, 'Type:', typeof time);
                return { time, available: true };
            });
            console.log('Update timeSettingsData to insert:', timeSettingsData);
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
        console.log('Found timeSlots to fix:', allTimeSlots.map(s => ({ id: s._id, time: s.time })));
        
        let fixedCount = 0;
        let invalidCount = 0;
        
        for (const slot of allTimeSlots) {
            let cleanTime = slot.time;
            console.log('Processing slot:', slot._id, 'Original time:', cleanTime, 'Type:', typeof cleanTime);
            
            // 如果time字段本身就是對象或數組，直接處理
            if (Array.isArray(cleanTime)) {
                if (cleanTime.length > 0) {
                    cleanTime = cleanTime[0].toString();
                } else {
                    console.log(`Empty array for slot ${slot._id}, deleting...`);
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
                    
                    console.log(`Parsed slot ${slot._id}: "${slot.time}" -> "${cleanTime}"`);
                } catch (error) {
                    console.log(`Could not parse slot ${slot._id}: ${cleanTime}, trying manual cleanup...`);
                    
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
                    console.log(`✅ Fixed slot ${slot._id}: "${slot.time}" -> "${cleanTime}"`);
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

module.exports = router; 

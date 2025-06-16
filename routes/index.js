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
    res.render('setup');
});

// 載入頁面
router.get('/loading', (req, res) => {
    res.render('loading', { slugname: req.query.slugname });
});



// API路由 - 創建客戶
router.post('/api/setup', upload.fields([
    { name: 'restaurantImage', maxCount: 1 },
    { name: 'cardBackgroundImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            clientname,
            slugname,
            timeSlots,
            diningRules,
            pointsSystem,
            bookingSystem
        } = req.body;

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
        const client = await Client.create({
            clientname,
            slugname,
            restaurantImage: restaurantImageUrl,
            cardBackgroundImage: cardBackgroundImageUrl
        });

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
        const parsedTimeSlots = timeSlots ? JSON.parse(timeSlots) : [];
        const parsedDiningRules = diningRules ? JSON.parse(diningRules) : [];

        // 在 clientBDB 中創建時段設定
        if (parsedTimeSlots.length > 0) {
            try {
                const timeSettingsSchema = require('../models/TimeSettings');
                const TimeSettings = bookingDB.model('TimeSettings', timeSettingsSchema);
                
                const timeSettingsData = parsedTimeSlots.map(time => ({ time, available: true }));
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

        const bookingDB = getClientDb(storeSlug, 'BDB');
        const timeSettingsSchema = require('../models/TimeSettings');
        const TimeSettings = bookingDB.model('TimeSettings', timeSettingsSchema);

        // 刪除舊的時段設定
        await TimeSettings.deleteMany({});
        
        // 插入新的時段設定
        if (timeSlots && timeSlots.length > 0) {
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
            const sortedTimeSlots = sortTimeSlots([...timeSlots]);
            
            const timeSettingsData = sortedTimeSlots.map(time => ({ time, available: true }));
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

// 點數系統路由
router.use('/', pointsRoutes);

module.exports = router; 

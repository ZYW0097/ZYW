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

        // 創建客戶基本資料
        const client = await Client.create({
            clientname,
            slugname,
            restaurantImage: restaurantImageUrl,
            cardBackgroundImage: cardBackgroundImageUrl
        });

        // 儲存功能啟用狀態到對應的客戶資料庫
        
        // 在 clientCDB 中創建集點卡設定
        if (pointsSystem) {
            const pointsSettingsSchema = require('../models/points/settings');
            const PointsSettings = cardDB.model('PointsSettings', pointsSettingsSchema);
            
            await PointsSettings.create({
                slug: slugname,
                type: 'points_settings',
                class: 'main_settings',
                state: 'enable',
                s_reward: 0
            });
        }
        
        // 在 clientBDB 中創建訂位設定（預設開啟）
        const bookingSettingsSchema = require('../models/BookingSettings');
        const BookingSettings = bookingDB.model('BookingSettings', bookingSettingsSchema);
        
        await BookingSettings.create({
            slug: slugname,
            type: 'booking_settings',
            class: 'main_settings',
            state: bookingSystem ? 'enable' : 'disabled'
        });

        // 創建客戶特定的數據庫
        const bookingDB = mongoose.connection.useDb(`${slugname}BDB`);
        const accountDB = mongoose.connection.useDb(`${slugname}ADB`);
        const cardDB = mongoose.connection.useDb(`${slugname}CDB`);

        // 處理時段和規則資料
        const parsedTimeSlots = timeSlots ? JSON.parse(timeSlots) : [];
        const parsedDiningRules = diningRules ? JSON.parse(diningRules) : [];

        // 在clientBDB中創建時段設定
        if (parsedTimeSlots.length > 0) {
            const timeSettingsSchema = require('../models/TimeSettings');
            const TimeSettings = bookingDB.model('TimeSettings', timeSettingsSchema);
            
            const timeSettingsData = parsedTimeSlots.map(time => ({ time, available: true }));
            await TimeSettings.insertMany(timeSettingsData);
        }

        // 在clientBDB中創建訂位規則
        if (parsedDiningRules.length > 0) {
            const bookingRulesSchema = require('../models/BookingRules');
            const BookingRules = bookingDB.model('BookingRules', bookingRulesSchema);
            
            const bookingRulesData = parsedDiningRules.map((text, index) => ({ 
                text, 
                order: index,
                isActive: true 
            }));
            await BookingRules.insertMany(bookingRulesData);
        }

        // 建立一個空的 collection 以確保資料庫會被建立
        await bookingDB.collection('init').insertOne({ created: new Date() });
        await accountDB.collection('init').insertOne({ created: new Date() });
        await cardDB.collection('init').insertOne({ created: new Date() });
        
        res.json({ success: true, client });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
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
            timeSlots = await TimeSettings.find({}).sort({ createdAt: 1 });
            
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
                state: pointsSystem ? 'enable' : 'disabled',
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        // 更新 clientBDB 中的訂位設定
        const bookingDB = getClientDb(storeSlug, 'BDB');
        const bookingSettingsSchema = require('../models/BookingSettings');
        const BookingSettings = bookingDB.model('BookingSettings', bookingSettingsSchema);
        
        await BookingSettings.findOneAndUpdate(
            { 
                slug: storeSlug, 
                type: 'booking_settings', 
                class: 'main_settings' 
            },
            { 
                state: bookingSystem ? 'enable' : 'disabled',
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
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
            const timeSettingsData = timeSlots.map(time => ({ time, available: true }));
            await TimeSettings.insertMany(timeSettingsData);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
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

        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
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
        
        const timeSlots = await TimeSettings.find({ available: true }).sort({ createdAt: 1 });
        
        res.json({ timeSlots });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 點數系統路由
router.use('/', pointsRoutes);

// 404 錯誤處理
router.use((req, res) => {
    res.status(404).render('error', {
        message: '找不到該頁面'
    });
});



module.exports = router; 

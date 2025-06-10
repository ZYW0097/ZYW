const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const mongoose = require('mongoose');
const reservationSchema = require('../models/Reservation');
const getClientDb = require('../utils/dbManager');
const { sendBookingConfirmation, sendBookingCancellation } = require('../services/emailService');
const fs = require('fs');
const path = require('path');

const pointsRoutes = require('./points');

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

// 訂位系統第一階段

router.get('/:storeSlug/booking', (req, res) => {
    res.redirect(`/${req.params.storeSlug}/booking/step1`);
});

router.get('/:storeSlug/booking/step1', async (req, res) => {
    const { storeSlug } = req.params;
    const client = await Client.findOne({ slugname: storeSlug });
    res.render('booking/step1', {
        storeSlug,
        clientname: client ? client.clientname : '餐廳名稱',
        bookingpagetext: client ? client.bookingpagetext : '歡迎使用訂位系統'
    });
});

router.get('/:storeSlug/booking/step2', async (req, res) => {
    const { storeSlug } = req.params;
    const client = await Client.findOne({ slugname: storeSlug });
    res.render('booking/step2', {
        storeSlug,
        clientname: client ? client.clientname : '餐廳名稱',
        bookingpagetext: client ? client.bookingpagetext : '歡迎使用訂位系統'
    });
});

router.get('/:storeSlug/booking/success', async (req, res) => {
    const { bookingId } = req.query;
    const { storeSlug } = req.params;
    
    // 檢查是否有 session 中的訂位資訊（防止直接訪問）
    if (!req.session.lastBooking || 
        req.session.lastBooking.bookingId !== bookingId ||
        req.session.lastBooking.storeSlug !== storeSlug ||
        Date.now() - req.session.lastBooking.timestamp > 60000) { // 1分鐘過期
        // 重定向到訂位頁面
        return res.redirect(`/${storeSlug}/booking/step1`);
    }
    
    try {
        // 獲取訂位資訊
        const bookingInfo = req.session.lastBooking;
        
        // 獲取客戶資訊
        const client = await Client.findOne({ slugname: storeSlug });
        const clientname = client ? client.clientname : '餐廳名稱';
        
        // 渲染成功頁面
        res.render('booking/success', { 
            bookingId,
            storeSlug,
            clientname,
            bookingInfo,
            timestamp: bookingInfo.timestamp
        });
    } catch (error) {
        console.error('Error in success page:', error);
        res.redirect(`/${storeSlug}/booking/step1`);
    }
});

// API路由 - 創建客戶
router.post('/api/setup', async (req, res) => {
    try {
        const {
            clientname,
            slugname,
            cardpagetext,
            accountpagetext,
            bookingpagetext,
            backstagepagetext
        } = req.body;

        // 創建客戶
        const client = await Client.create({
            clientname,
            slugname,
            cardpagetext,
            accountpagetext,
            bookingpagetext,
            backstagepagetext
        });

        // 創建客戶特定的數據庫
        const bookingDB = mongoose.connection.useDb(`${slugname}BDB`);
        const accountDB = mongoose.connection.useDb(`${slugname}ADB`);
        const cardDB = mongoose.connection.useDb(`${slugname}CDB`);

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

        // 如果是後台頁面，獲取點數相關數據
        let points = 0;
        if (page === 'backstage' && req.user) {
            const userDb = getClientDb(storeSlug, 'ADB');
            const userPoints = await userDb.model('UserPoints', require('../models/points/userPoints'))
                .findOne({ lineId: req.user.lineId });
            points = userPoints ? userPoints.points : 0;
        }

        // 渲染對應頁面
        res.render(page, {
            storeSlug,
            [`${page}pagetext`]: client[`${page}pagetext`],
            points
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { message: '系統錯誤' });
    }
});

// API路由 - 處理訂位
router.post(['/api/booking', '/:storeSlug/api/booking'], async (req, res) => {
    try {
        // 優先用 session
        let storeSlug = req.session && req.session.storeSlug;
        // 其次用 params/body/query
        if (!storeSlug) storeSlug = req.params.storeSlug || req.body.storeSlug || req.query.storeSlug;
        if (!storeSlug) return res.status(400).json({ error: 'storeSlug required' });

        // 生成新的訂位編號格式：[clientslug-六位數隨機大寫英文加數字]
        function generateBookingId(storeSlug) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let randomPart = '';
            for (let i = 0; i < 6; i++) {
                randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return `${storeSlug.toUpperCase()}-${randomPart}`;
        }

        // 使用客戶特定的訂位資料庫
        const db = getClientDb(storeSlug, 'BDB');
        const Reservation = db.model('Reservation', reservationSchema);

        // 生成自訂訂位編號
        const customBookingId = generateBookingId(storeSlug);

        // 創建訂位記錄，包含自訂編號
        const reservationData = {
            ...req.body,
            customBookingId,
            createdAt: new Date(),
            status: 'confirmed' // 預設狀態為確認
        };
        
        const reservation = await Reservation.create(reservationData);

        // 查詢 clientname
        const client = await Client.findOne({ slugname: storeSlug });
        const clientname = client ? client.clientname : '';

        // 保存訂位資訊到 session（用於 success 頁面驗證）
        req.session.lastBooking = {
            bookingId: customBookingId,
            storeSlug,
            timestamp: Date.now(),
            ...req.body
        };

        // 發送確認郵件
        if (req.body.email) {
            // 構建完整的logo URL
            const protocol = req.protocol;
            const host = req.get('host');
            const logoUrl = `${protocol}://${host}/images/dineplus.png`;
            
            await sendBookingConfirmation(req.body.email, {
                ...req.body,
                bookingId: customBookingId,
                clientname,
                logoUrl // 使用完整的URL
            });
        }

        res.json({ success: true, reservation, bookingId: customBookingId });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API路由 - 取消訂位
router.post('/:storeSlug/api/booking/cancel', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { bookingId } = req.body;
        
        // 驗證 session
        if (!req.session.lastBooking || 
            req.session.lastBooking.bookingId !== bookingId ||
            req.session.lastBooking.storeSlug !== storeSlug) {
            return res.status(400).json({ error: '無效的訂位資訊' });
        }
        
        // 使用客戶特定的訂位資料庫
        const db = getClientDb(storeSlug, 'BDB');
        const Reservation = db.model('Reservation', reservationSchema);
        
        // 更新訂位狀態為已取消
        await Reservation.findOneAndUpdate(
            { customBookingId: bookingId },
            { 
                status: 'cancelled',
                cancelledAt: new Date()
            }
        );
        
        // 獲取客戶資訊
        const client = await Client.findOne({ slugname: storeSlug });
        const clientname = client ? client.clientname : '';
        
        // 發送取消確認郵件
        const bookingInfo = req.session.lastBooking;
        if (bookingInfo.email) {
            const protocol = req.protocol;
            const host = req.get('host');
            const logoUrl = `${protocol}://${host}/images/dineplus.png`;
            
            await sendBookingCancellation(bookingInfo.email, {
                ...bookingInfo,
                bookingId,
                clientname,
                logoUrl,
                cancelTime: new Date().toLocaleString('zh-TW')
            });
        }
        
        // 清除 session 中的訂位資訊
        delete req.session.lastBooking;
        
        res.json({ success: true, message: '訂位已成功取消' });
    } catch (error) {
        console.error('Error cancelling booking:', error);
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

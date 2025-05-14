const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const mongoose = require('mongoose');
const reservationSchema = require('../models/Reservation');
const Reservation = db.model('Reservation', reservationSchema);
const getClientDb = require('../utils/dbManager');
const { sendBookingConfirmation } = require('../services/emailService');


// 主頁路由
router.get('/', (req, res) => {
    res.render('index');
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
        bookingpagetext: client ? client.bookingpagetext : '歡迎使用訂位系統'
    });
});

router.get('/:storeSlug/booking/step2', async (req, res) => {
    const { storeSlug } = req.params;
    const client = await Client.findOne({ slugname: storeSlug });
    res.render('booking/step2', {
        storeSlug,
        bookingpagetext: client ? client.bookingpagetext : '歡迎使用訂位系統'
    });
});

router.get('/:storeSlug/booking/success', (req, res) => {
    const { bookingId } = req.query;
    res.render('booking/success', { bookingId });
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

        // 建立一個空的 collection 以確保資料庫會被建立
        await bookingDB.collection('init').insertOne({ created: new Date() });
        await accountDB.collection('init').insertOne({ created: new Date() });

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

        // 渲染對應頁面
        res.render(page, {
            storeSlug,
            [`${page}pagetext`]: client[`${page}pagetext`]
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

        // 使用客戶特定的數據庫
        const db = getClientDb(storeSlug);
        const Reservation = db.model('Reservation', reservationSchema);

        // 創建訂位記錄
        const reservation = await Reservation.create(req.body);

        // 查詢 clientname
        const client = await Client.findOne({ slugname: storeSlug });
        const clientname = client ? client.clientname : '';

        // 發送確認郵件
        if (req.body.email) {
            await sendBookingConfirmation(req.body.email, {
                ...req.body,
                bookingId: reservation._id,
                clientname
            });
        }

        res.json({ success: true, reservation, bookingId: reservation._id });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 訂位 API
router.post('/api/booking', async (req, res) => {
    try {
        const {
            date,
            time,
            adults,
            children,
            name,
            gender,
            phone,
            email,
            isVegetarian,
            specialNeeds,
            notes
        } = req.body;

        // 創建新的訂位記錄
        const reservation = new Reservation({
            date,
            time,
            adults,
            children,
            name,
            gender,
            phone,
            email,
            isVegetarian,
            specialNeeds,
            notes,
            status: 'pending'
        });

        // 保存到數據庫
        await reservation.save();

        // 返回訂位ID
        res.json({ bookingId: reservation._id });

    } catch (error) {
        console.error('訂位錯誤:', error);
        res.status(500).json({ error: '訂位失敗，請稍後再試' });
    }
});

// 404 錯誤處理
router.use((req, res) => {
    res.status(404).render('error', {
        message: '找不到該頁面'
    });
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const mongoose = require('mongoose');

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
    res.render('loading');
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
        const validPages = ['card', 'booking', 'account', 'backstage'];
        
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

module.exports = router; 
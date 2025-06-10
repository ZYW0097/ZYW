const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const mongoose = require('mongoose');
const getClientDb = require('../utils/dbManager');
const fs = require('fs');
const path = require('path');

const pointsRoutes = require('./points');
const bookingRoutes = require('./booking');

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

// 點數系統路由
router.use('/', pointsRoutes);

// 404 錯誤處理
router.use((req, res) => {
    res.status(404).render('error', {
        message: '找不到該頁面'
    });
});



module.exports = router; 

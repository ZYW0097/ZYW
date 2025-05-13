const express = require('express');
const router = express.Router();

// 主頁路由
router.get('/', (req, res) => {
    res.render('index');
});

// 客戶特定路由
router.get('/:storeSlug/:page', (req, res) => {
    const { storeSlug, page } = req.params;
    const validPages = ['card', 'booking', 'account', 'backstage'];
    
    if (!validPages.includes(page)) {
        return res.status(404).render('error', { message: '頁面不存在' });
    }

    // 這裡之後會加入檢查商店是否存在的邏輯
    res.render(`${page}`, { storeSlug });
});

module.exports = router; 
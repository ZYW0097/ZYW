const express = require('express');
const router = express.Router();
const reminderService = require('../services/reminderService');

// 顯示提醒測試頁面
router.get('/reminder-test', (req, res) => {
    res.render('admin/reminder-test', { layout: false });
});

// 手動觸發提醒檢查（測試用）
router.post('/trigger-reminder-check', async (req, res) => {
    try {
        await reminderService.triggerCheck();
        res.json({ 
            success: true, 
            message: '提醒檢查已觸發' 
        });
    } catch (error) {
        console.error('Error triggering reminder check:', error);
        res.status(500).json({ 
            success: false, 
            error: '觸發提醒檢查時發生錯誤' 
        });
    }
});

// 獲取提醒服務狀態
router.get('/reminder-status', (req, res) => {
    const status = reminderService.getStatus();
    res.json(status);
});

// 重啟提醒服務
router.post('/restart-reminder-service', (req, res) => {
    try {
        reminderService.stop();
        reminderService.start();
        res.json({ 
            success: true, 
            message: '提醒服務已重啟' 
        });
    } catch (error) {
        console.error('Error restarting reminder service:', error);
        res.status(500).json({ 
            success: false, 
            error: '重啟提醒服務時發生錯誤' 
        });
    }
});

module.exports = router; 
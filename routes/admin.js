const express = require('express');
const router = express.Router();
const reminderService = require('../services/reminderService');

// 顯示提醒測試頁面
router.get('/reminder-test', (req, res) => {
    res.render('admin/reminder-test', { layout: false });
});

// 顯示 Webhook 測試頁面
router.get('/webhook-test', (req, res) => {
    res.render('admin/webhook-test', { layout: false });
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
    try {
        const status = reminderService.getStatus();
        console.log('Reminder service status:', status);
        res.json(status);
    } catch (error) {
        console.error('Error getting reminder status:', error);
        res.status(500).json({ 
            success: false, 
            error: '獲取服務狀態時發生錯誤',
            details: error.message
        });
    }
});

// 重啟提醒服務
router.post('/restart-reminder-service', (req, res) => {
    try {
        reminderService.stop();
        reminderService.start();
        const status = reminderService.getStatus();
        res.json({ 
            success: true, 
            message: '提醒服務已重啟',
            status: status
        });
    } catch (error) {
        console.error('Error restarting reminder service:', error);
        res.status(500).json({ 
            success: false, 
            error: '重啟提醒服務時發生錯誤',
            details: error.message
        });
    }
});

// 檢查和修復提醒服務
router.post('/check-and-repair-reminder', (req, res) => {
    try {
        const status = reminderService.checkAndRepair();
        res.json({ 
            success: true, 
            message: '服務檢查完成',
            status: status
        });
    } catch (error) {
        console.error('Error checking/repairing reminder service:', error);
        res.status(500).json({ 
            success: false, 
            error: '檢查服務時發生錯誤',
            details: error.message
        });
    }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const reminderService = require('../services/reminderService');

// Webhook 安全驗證中間件
const validateWebhook = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    const expectedToken = process.env.WEBHOOK_SECRET || process.env.CRON_SECRET;
    
    if (!expectedToken) {
        console.error('Webhook配置錯誤：未設定WEBHOOK_SECRET');
        return res.status(500).json({ 
            success: false, 
            error: '伺服器配置錯誤' 
        });
    }
    
    const token = authHeader?.replace('Bearer ', '') || 
                  apiKeyHeader || 
                  req.query.token ||
                  req.query.key;
    
    if (!token || token !== expectedToken) {
        console.log('未授權的webhook訪問嘗試');
        return res.status(401).json({ 
            success: false, 
            error: '未授權訪問' 
        });
    }
    
    next();
};

// 提醒檢查 Webhook
router.post('/reminder-check', validateWebhook, async (req, res) => {
    try {
        console.log('Webhook觸發：reminder-check');
        
        // 確保提醒服務正在運行
        if (!reminderService.getStatus().isRunning) {
            console.log('提醒服務已停止，重新啟動');
            reminderService.start();
        }
        
        // 執行提醒檢查
        await reminderService.triggerCheck();
        
        const status = reminderService.getStatus();
        
        res.json({
            success: true,
            message: '提醒檢查完成',
            timestamp: new Date().toISOString(),
            status: {
                isRunning: status.isRunning,
                lastCheck: status.lastCheck,
                isCurrentlyReminderTime: status.isCurrentlyReminderTime
            }
        });
        
    } catch (error) {
        console.error('Webhook reminder-check錯誤:', error);
        console.error('錯誤詳情:', error.message);
        res.status(500).json({
            success: false,
            error: '內部伺服器錯誤',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router; 
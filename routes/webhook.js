const express = require('express');
const router = express.Router();
const reminderService = require('../services/reminderService');

// Webhook 安全驗證中間件
const validateWebhook = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    const expectedToken = process.env.WEBHOOK_SECRET || process.env.CRON_SECRET;
    
    if (!expectedToken) {
        console.error('Warning: No WEBHOOK_SECRET or CRON_SECRET environment variable set!');
        return res.status(500).json({ 
            success: false, 
            error: 'Server configuration error - No secret key configured' 
        });
    }
    
    // 支持多種認證方式: Bearer token, x-api-key header, 或查詢參數
    const token = authHeader?.replace('Bearer ', '') || 
                  apiKeyHeader || 
                  req.query.token ||
                  req.query.key;
    
    if (!token || token !== expectedToken) {
        console.log(`Unauthorized webhook access attempt. Token provided: ${token ? '[REDACTED]' : 'None'}`);
        return res.status(401).json({ 
            success: false, 
            error: 'Unauthorized - Invalid API key or token' 
        });
    }
    
    next();
};

// 主要的提醒檢查 Webhook（每分鐘調用）
router.post('/reminder-check', validateWebhook, async (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] Webhook triggered: reminder-check`);
        
        // 確保提醒服務正在運行
        if (!reminderService.getStatus().isRunning) {
            console.log('Reminder service was stopped, restarting...');
            reminderService.start();
        }
        
        // 執行提醒檢查
        await reminderService.triggerCheck();
        
        const status = reminderService.getStatus();
        
        res.json({
            success: true,
            message: 'Reminder check completed',
            timestamp: new Date().toISOString(),
            status: {
                isRunning: status.isRunning,
                lastCheck: status.lastCheck,
                serverUptime: Math.floor(process.uptime()),
                memoryUsage: process.memoryUsage()
            }
        });
        
    } catch (error) {
        console.error('Webhook reminder-check error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 伺服器保活 Webhook（防止冷處理）
router.get('/keepalive', validateWebhook, (req, res) => {
    console.log(`[${new Date().toISOString()}] Webhook triggered: keepalive`);
    
    const status = {
        success: true,
        message: 'Server is alive',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
        reminderService: reminderService.getStatus()
    };
    
    res.json(status);
});

// 健康檢查端點（無需認證，供監控使用）
router.get('/health', (req, res) => {
    const status = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        reminderService: reminderService.getStatus().isRunning
    };
    
    res.json(status);
});

// 強制重啟提醒服務
router.post('/restart-reminder', validateWebhook, (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] Webhook triggered: restart-reminder`);
        
        reminderService.stop();
        reminderService.start();
        
        res.json({
            success: true,
            message: 'Reminder service restarted',
            timestamp: new Date().toISOString(),
            status: reminderService.getStatus()
        });
        
    } catch (error) {
        console.error('Webhook restart-reminder error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to restart reminder service',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 獲取詳細狀態信息
router.get('/status', validateWebhook, (req, res) => {
    const status = {
        success: true,
        timestamp: new Date().toISOString(),
        server: {
            uptime: Math.floor(process.uptime()),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version,
            platform: process.platform
        },
        reminderService: reminderService.getStatus(),
        environment: {
            nodeEnv: process.env.NODE_ENV,
            hasWebhookSecret: !!process.env.WEBHOOK_SECRET
        }
    };
    
    res.json(status);
});

module.exports = router; 
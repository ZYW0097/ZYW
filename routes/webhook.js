const express = require('express');
const router = express.Router();
const reminderService = require('../services/reminderService');
const getClientDb = require('../utils/dbManager');
const userSchema = require('../models/user');

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

// LINE Bot Webhook 處理程序
router.post('/line-bot', async (req, res) => {
    try {
        console.log('📨 LINE Bot Webhook 接收到事件:', JSON.stringify(req.body, null, 2));
        
        const events = req.body.events;
        if (!events || events.length === 0) {
            return res.status(200).send('No events');
        }

        for (const event of events) {
            if (event.source && event.source.userId) {
                const messagingUserId = event.source.userId;
                console.log('🔍 LINE Messaging API User ID:', messagingUserId);
                
                // 嘗試更新用戶資料，建立 ID 對應關係
                await updateUserMessagingId(messagingUserId, event);
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('LINE Bot Webhook 錯誤:', error);
        res.status(500).send('Internal Server Error');
    }
});

// 建立或更新用戶的 Messaging ID 對應關係
async function updateUserMessagingId(messagingUserId, event) {
    try {
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        
        // 檢查是否已存在此 Messaging ID
        let user = await User.findOne({ lineMessagingId: messagingUserId });
        
        if (!user) {
            // 如果不存在，創建一個臨時用戶記錄
            // 等待用戶通過 LINE Login 登入時再合併資料
            console.log('🆕 創建 Messaging API 用戶記錄:', messagingUserId);
            
            // 從 LINE Messaging API 獲取用戶資料（如果可能）
            let displayName = '未知用戶';
            if (event.type === 'message' || event.type === 'follow') {
                // 這裡可以調用 LINE Messaging API 獲取用戶 profile
                // 但需要 LINE Bot 的 Access Token
                displayName = `用戶_${messagingUserId.slice(-8)}`;
            }
            
            user = await User.create({
                lineMessagingId: messagingUserId,
                name: displayName,
                // lineId 將在 LINE Login 時填入
            });
        }
        
        console.log('✅ Messaging API 用戶 ID 已記錄:', messagingUserId);
        return user;
        
    } catch (error) {
        console.error('更新用戶 Messaging ID 失敗:', error);
        throw error;
    }
}

module.exports = router; 
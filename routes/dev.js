const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const getClientDb = require('../utils/dbManager');
const Client = require('../models/Client');

// 檢查是否已通過密碼驗證
const checkDevAuth = (req, res, next) => {
    // 檢查認證狀態
    if (req.session && req.session.devAuthenticated) {
        return next();
    }
    
    // 如果是 API 請求，返回 JSON 錯誤
    if (req.path.includes('/api/')) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(401).json({
            success: false,
            error: '認證已過期，請重新登入',
            redirect: '/dev/login'
        });
    }
    
    // 否則重定向到登入頁面
    res.redirect('/dev/login');
};

// 開發者登入頁面
router.get('/login', (req, res) => {
    res.render('dev-login', { error: null });
});

// 處理登入
router.post('/login', (req, res) => {
    const { password } = req.body;
    const correctPassword = process.env.DEV_PASSWORD;
    
    if (!correctPassword) {
        return res.render('dev-login', { 
            error: '系統未設置開發者密碼，請聯繫管理員' 
        });
    }
    
    if (password === correctPassword) {
        req.session.devAuthenticated = true;
        res.redirect('/dev');
    } else {
        res.render('dev-login', { 
            error: '密碼錯誤，請重新輸入' 
        });
    }
});

// 登出
router.get('/logout', (req, res) => {
    req.session.devAuthenticated = false;
    res.redirect('/dev/login');
});

// 開發者頁面路由
router.get('/', checkDevAuth, (req, res) => {
    res.render('dev');
});

// 列出所有資料庫
router.get('/api/list-databases', checkDevAuth, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        
        const databases = dbs.databases.map(db => db.name);
        
        res.json({
            success: true,
            message: `找到 ${databases.length} 個資料庫`,
            databases: databases.sort()
        });
    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
            success: false,
            error: '無法獲取資料庫列表'
        });
    }
});

// 列出所有客戶
router.get('/api/list-clients', checkDevAuth, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        
        const clients = await Client.find({}, 'slugname clientname createdAt')
            .sort({ createdAt: -1 });
        
        
        res.json({
            success: true,
            message: `找到 ${clients.length} 個客戶`,
            clients: clients
        });
    } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
            success: false,
            error: '無法獲取客戶列表'
        });
    }
});

// 刪除特定商家的所有資料庫
router.post('/api/delete-single', checkDevAuth, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        
        const { slugname } = req.body;
        
        if (!slugname) {
            return res.status(400).json({
                success: false,
                error: '請提供商家 slugname'
            });
        }

        const deletedDbs = [];
        const errors = [];

        // 要刪除的資料庫類型
        const dbTypes = ['ADB', 'CDB', 'BDB'];
        
        for (const dbType of dbTypes) {
            try {
                const dbName = `${slugname}${dbType}`;
                
                // 檢查資料庫是否存在
                const admin = mongoose.connection.db.admin();
                const dbs = await admin.listDatabases();
                const dbExists = dbs.databases.some(db => db.name === dbName);
                
                if (dbExists) {
                    // 刪除資料庫
                    await mongoose.connection.useDb(dbName).dropDatabase();
                    deletedDbs.push(dbName);
                } else {
                }
            } catch (error) {
                const errorMsg = `刪除 ${slugname}${dbType} 時發生錯誤: ${error.message}`;
                errors.push(errorMsg);
                console.error(`❌ ${errorMsg}`);
            }
        }

        // 從 Client 集合中刪除該商家記錄
        try {
            const deleteResult = await Client.deleteOne({ slugname });
            if (deleteResult.deletedCount > 0) {
            }
        } catch (error) {
            const errorMsg = `刪除 Client 記錄時發生錯誤: ${error.message}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
        }

        // 準備回應
        let message = `商家 "${slugname}" 處理完成`;
        if (deletedDbs.length > 0) {
            message += `\n已刪除資料庫: ${deletedDbs.join(', ')}`;
        }
        if (errors.length > 0) {
            message += `\n錯誤: ${errors.join('; ')}`;
        }

        res.json({
            success: true,
            message: message,
            details: {
                deletedDatabases: deletedDbs,
                errors: errors
            }
        });

    } catch (error) {
        console.error('❌ 刪除單一商家錯誤:', error);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
            success: false,
            error: `刪除操作失敗: ${error.message}`
        });
    }
});

// 清理所有商家資料庫，只保留 mainADB 和 test 的 Client
router.post('/api/clean-all', checkDevAuth, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');
        
        const deletedDbs = [];
        const errors = [];
        let deletedClients = 0;

        // 1. 獲取所有資料庫
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        
        // 2. 找出所有商家相關的資料庫（除了 mainADB）
        const targetDbs = dbs.databases.filter(db => {
            const dbName = db.name;
            // 保留 mainADB 和系統資料庫
            if (dbName === 'mainADB' || 
                dbName.startsWith('admin') || 
                dbName.startsWith('config') || 
                dbName.startsWith('local')) {
                return false;
            }
            // 刪除所有其他的 ADB、CDB、BDB
            return dbName.endsWith('ADB') || dbName.endsWith('CDB') || dbName.endsWith('BDB');
        });

        // 3. 刪除找到的資料庫
        for (const db of targetDbs) {
            try {
                await mongoose.connection.useDb(db.name).dropDatabase();
                deletedDbs.push(db.name);
            } catch (error) {
                const errorMsg = `刪除資料庫 ${db.name} 時發生錯誤: ${error.message}`;
                errors.push(errorMsg);
                console.error(`❌ ${errorMsg}`);
            }
        }

        // 4. 清理 Client 集合，只保留 test
        try {
            const deleteResult = await Client.deleteMany({ 
                slugname: { $ne: 'test' } 
            });
            deletedClients = deleteResult.deletedCount;
        } catch (error) {
            const errorMsg = `清理 Client 集合時發生錯誤: ${error.message}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
        }

        // 5. 清理 test 商家的對應資料庫內容（但保留資料庫結構）
        try {
            const testDbTypes = ['ADB', 'CDB', 'BDB'];
            for (const dbType of testDbTypes) {
                const dbName = `test${dbType}`;
                
                // 檢查資料庫是否存在
                const admin = mongoose.connection.db.admin();
                const dbs = await admin.listDatabases();
                const dbExists = dbs.databases.some(db => db.name === dbName);
                
                if (dbExists) {
                    const testDb = mongoose.connection.useDb(dbName);
                    const collections = await testDb.db.listCollections().toArray();
                    
                    // 清空每個集合的內容
                    for (const collection of collections) {
                        await testDb.collection(collection.name).deleteMany({});
                    }
                } else {
                }
            }
        } catch (error) {
            const errorMsg = `清理 test 商家資料時發生錯誤: ${error.message}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
        }

        // 6. 準備回應
        let message = '批量清理完成';
        if (deletedDbs.length > 0) {
            message += `\n已刪除 ${deletedDbs.length} 個資料庫`;
        }
        if (deletedClients > 0) {
            message += `\n已清理 ${deletedClients} 個客戶記錄`;
        }
        if (errors.length > 0) {
            message += `\n遇到 ${errors.length} 個錯誤`;
        }

        res.json({
            success: true,
            message: message,
            details: {
                deletedDatabases: deletedDbs,
                deletedClientsCount: deletedClients,
                errors: errors,
                summary: {
                    totalDeletedDbs: deletedDbs.length,
                    totalDeletedClients: deletedClients,
                    totalErrors: errors.length
                }
            }
        });

    } catch (error) {
        console.error('❌ 批量清理錯誤:', error);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
            success: false,
            error: `批量清理失敗: ${error.message}`
        });
    }
});

// 測試端點（不需要認證）
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Dev路由測試成功',
        path: req.path,
        originalUrl: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// 健康檢查
router.get('/api/health', checkDevAuth, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({
        success: true,
        message: '開發者 API 運行正常',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? '已連接' : '未連接'
    });
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const { settingsController } = require('../../controllers/points');
const { isAuthenticated, isAdmin } = require('../../middleware/auth');

// 獲取集點卡設定
router.get('/', settingsController.getSettings);

// 更新集點卡設定 (需要管理員權限)
router.put('/', isAuthenticated, isAdmin, settingsController.updateSettings);

module.exports = router;
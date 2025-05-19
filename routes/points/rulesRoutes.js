const express = require('express');
const router = express.Router();
const { rulesController } = require('../../controllers/points');
const { isAuthenticated, isAdmin } = require('../../middleware/auth');

// 獲取所有規則
router.get('/', rulesController.getAllRules);

// 創建新規則 (需要管理員權限)
router.post('/', isAuthenticated, isAdmin, rulesController.createRule);

// 更新規則 (需要管理員權限)
router.put('/:id', isAuthenticated, isAdmin, rulesController.updateRule);

// 刪除規則 (需要管理員權限)
router.delete('/:id', isAuthenticated, isAdmin, rulesController.deleteRule);

module.exports = router;
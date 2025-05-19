const express = require('express');
const router = express.Router();
const { rewardsController } = require('../../controllers/points');
const { isAuthenticated, isAdmin } = require('../../middleware/auth');

// 獲取所有獎勵
router.get('/', rewardsController.getAllRewards);

// 創建新獎勵 (需要管理員權限)
router.post('/', isAuthenticated, isAdmin, rewardsController.createReward);

// 更新獎勵 (需要管理員權限)
router.put('/:id', isAuthenticated, isAdmin, rewardsController.updateReward);

// 刪除獎勵 (需要管理員權限)
router.delete('/:id', isAuthenticated, isAdmin, rewardsController.deleteReward);

module.exports = router;
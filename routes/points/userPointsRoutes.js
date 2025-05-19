const express = require('express');
const router = express.Router();
const { userPointsController } = require('../../controllers/points');
const { isAuthenticated } = require('../../middleware/auth');

// 獲取用戶集點卡資訊
router.get('/:lineId', isAuthenticated, userPointsController.getUserPoints);

// 創建用戶集點卡
router.post('/', isAuthenticated, userPointsController.createUserPoints);

// 更新用戶點數
router.put('/:lineId/points', isAuthenticated, userPointsController.updatePoints);

// 兌換獎勵
router.post('/:lineId/redeem', isAuthenticated, userPointsController.redeemReward);

module.exports = router;
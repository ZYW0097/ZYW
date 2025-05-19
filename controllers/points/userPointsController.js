const getClientDb = require('../../utils/dbManager');
const userPointsSchema = require('../../models/points/userPoints');
const pointsRewardsSchema = require('../../models/points/rewards');

const userPointsController = {
    // 獲取用戶集點卡資訊
    async getUserPoints(req, res) {
        try {
            const { storeSlug, lineId } = req.params;
            const userDb = getClientDb(storeSlug, 'ADB');
            const UserPoints = userDb.model('UserPoints', userPointsSchema);

            const userPoints = await UserPoints.findOne({ lineId });
            if (!userPoints) {
                return res.status(404).json({ 
                    success: false, 
                    message: '找不到用戶集點卡' 
                });
            }

            res.json({ success: true, data: userPoints });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                success: false, 
                message: '獲取用戶集點卡失敗', 
                error: error.message 
            });
        }
    },

    // 創建用戶集點卡
    async createUserPoints(req, res) {
        try {
            const { storeSlug } = req.params;
            const { lineId } = req.body;
            const userDb = getClientDb(storeSlug, 'ADB');
            const UserPoints = userDb.model('UserPoints', userPointsSchema);

            const userPoints = await UserPoints.create({
                lineId,
                points: 0
            });

            res.json({ success: true, data: userPoints });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                success: false, 
                message: '創建用戶集點卡失敗', 
                error: error.message 
            });
        }
    },

    // 更新用戶點數
    async updatePoints(req, res) {
        try {
            const { storeSlug, lineId } = req.params;
            const { points } = req.body;
            const userDb = getClientDb(storeSlug, 'ADB');
            const UserPoints = userDb.model('UserPoints', userPointsSchema);

            const userPoints = await UserPoints.findOneAndUpdate(
                { lineId },
                { 
                    $inc: { points },
                    updatedAt: new Date()
                },
                { new: true }
            );

            if (!userPoints) {
                return res.status(404).json({ 
                    success: false, 
                    message: '找不到用戶集點卡' 
                });
            }

            res.json({ success: true, data: userPoints });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                success: false, 
                message: '更新用戶點數失敗', 
                error: error.message 
            });
        }
    },

    // 兌換獎勵
    async redeemReward(req, res) {
        try {
            const { storeSlug, lineId } = req.params;
            const { rewardId } = req.body;

            // 獲取獎勵資訊
            const db = getClientDb(storeSlug, 'CDB');
            const PointsRewards = db.model('PointsRewards', pointsRewardsSchema);
            const reward = await PointsRewards.findById(rewardId);

            if (!reward) {
                return res.status(404).json({ 
                    success: false, 
                    message: '找不到該獎勵' 
                });
            }

            // 更新用戶點數
            const userDb = getClientDb(storeSlug, 'ADB');
            const UserPoints = userDb.model('UserPoints', userPointsSchema);
            const userPoints = await UserPoints.findOne({ lineId });

            if (!userPoints) {
                return res.status(404).json({ 
                    success: false, 
                    message: '找不到用戶集點卡' 
                });
            }

            if (userPoints.points < reward.points) {
                return res.status(400).json({ 
                    success: false, 
                    message: '點數不足' 
                });
            }

            // 更新用戶點數並記錄兌換
            userPoints.points -= reward.points;
            userPoints.rewards.push({
                rewardId: reward._id,
                redeemedAt: new Date()
            });
            await userPoints.save();

            res.json({ success: true, data: userPoints });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                success: false, 
                message: '兌換獎勵失敗', 
                error: error.message 
            });
        }
    }
};

module.exports = userPointsController;
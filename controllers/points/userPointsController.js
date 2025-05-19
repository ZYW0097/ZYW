const { UserPoints, PointsRewards } = require('../../models');

const userPointsController = {
    // 獲取用戶集點卡資訊
    async getUserPoints(req, res) {
        try {
            const { lineId } = req.params;

            const userPoints = await UserPoints.findOne({ lineId })
                .populate('ah_coupon_id');

            if (!userPoints) {
                return res.status(404).json({ 
                    success: false, 
                    message: '用戶集點卡不存在' 
                });
            }

            res.json({ 
                success: true, 
                data: userPoints 
            });
        } catch (error) {
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
            const { lineId, u_name } = req.body;

            const userPoints = await UserPoints.create({
                lineId,
                u_name,
                ah_points: 0,
                ah_coupon: 0,
                ah_coupon_id: [],
                updatedAt: new Date()
            });

            res.status(201).json({ 
                success: true, 
                data: userPoints 
            });
        } catch (error) {
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
            const { lineId } = req.params;
            const { points } = req.body;

            const userPoints = await UserPoints.findOneAndUpdate(
                { lineId },
                { 
                    $inc: { ah_points: points },
                    updatedAt: new Date()
                },
                { new: true }
            );

            if (!userPoints) {
                return res.status(404).json({ 
                    success: false, 
                    message: '用戶集點卡不存在' 
                });
            }

            res.json({ 
                success: true, 
                data: userPoints 
            });
        } catch (error) {
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
            const { lineId } = req.params;
            const { rewardId } = req.body;

            const reward = await PointsRewards.findById(rewardId);
            if (!reward) {
                return res.status(404).json({ 
                    success: false, 
                    message: '獎勵不存在' 
                });
            }

            const userPoints = await UserPoints.findOne({ lineId });
            if (!userPoints) {
                return res.status(404).json({ 
                    success: false, 
                    message: '用戶集點卡不存在' 
                });
            }

            if (userPoints.ah_points < reward.points) {
                return res.status(400).json({ 
                    success: false, 
                    message: '點數不足' 
                });
            }

            userPoints.ah_points -= reward.points;
            userPoints.ah_coupon += 1;
            userPoints.ah_coupon_id.push(rewardId);
            userPoints.updatedAt = new Date();
            await userPoints.save();

            res.json({ 
                success: true, 
                data: userPoints 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: '兌換獎勵失敗', 
                error: error.message 
            });
        }
    }
};

module.exports = userPointsController;
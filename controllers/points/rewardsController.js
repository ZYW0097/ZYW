const { PointsRewards } = require('../../models');

const rewardsController = {
    // 獲取所有獎勵
    async getAllRewards(req, res) {
        try {
            const rewards = await PointsRewards.find({ 
                type: 'points_reward' 
            }).sort({ points: 1 });

            res.json({ 
                success: true, 
                data: rewards 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: '獲取獎勵失敗', 
                error: error.message 
            });
        }
    },

    // 創建新獎勵
    async createReward(req, res) {
        try {
            const { points, img, name } = req.body;

            const reward = await PointsRewards.create({
                type: 'points_reward',
                points,
                img,
                name,
                updatedAt: new Date()
            });

            res.status(201).json({ 
                success: true, 
                data: reward 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: '創建獎勵失敗', 
                error: error.message 
            });
        }
    },

    // 更新獎勵
    async updateReward(req, res) {
        try {
            const { id } = req.params;
            const { points, img, name } = req.body;

            const reward = await PointsRewards.findByIdAndUpdate(
                id,
                { 
                    points, 
                    img, 
                    name,
                    updatedAt: new Date()
                },
                { new: true }
            );

            if (!reward) {
                return res.status(404).json({ 
                    success: false, 
                    message: '獎勵不存在' 
                });
            }

            res.json({ 
                success: true, 
                data: reward 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: '更新獎勵失敗', 
                error: error.message 
            });
        }
    },

    // 刪除獎勵
    async deleteReward(req, res) {
        try {
            const { id } = req.params;

            const reward = await PointsRewards.findByIdAndDelete(id);

            if (!reward) {
                return res.status(404).json({ 
                    success: false, 
                    message: '獎勵不存在' 
                });
            }

            res.json({ 
                success: true, 
                message: '獎勵已刪除' 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: '刪除獎勵失敗', 
                error: error.message 
            });
        }
    }
};

module.exports = rewardsController;
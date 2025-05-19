const getClientDb = require('../../utils/dbManager');
const pointsRewardsSchema = require('../../models/points/rewards');

const rewardsController = {
    // 獲取所有獎勵
    async getAllRewards(req, res) {
        try {
            const { storeSlug } = req.params;
            const db = getClientDb(storeSlug, 'CDB');
            const PointsRewards = db.model('PointsRewards', pointsRewardsSchema);

            const rewards = await PointsRewards.find({ type: 'points_reward' });
            res.json({ success: true, data: rewards });
        } catch (error) {
            console.error('Error:', error);
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
            const { storeSlug } = req.params;
            const { points, img, name } = req.body;
            const db = getClientDb(storeSlug, 'CDB');
            const PointsRewards = db.model('PointsRewards', pointsRewardsSchema);

            const reward = await PointsRewards.create({
                type: 'points_reward',
                points,
                img,
                name
            });

            res.json({ success: true, data: reward });
        } catch (error) {
            console.error('Error:', error);
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
            const { storeSlug, id } = req.params;
            const { points, img, name } = req.body;
            const db = getClientDb(storeSlug, 'CDB');
            const PointsRewards = db.model('PointsRewards', pointsRewardsSchema);

            const reward = await PointsRewards.findByIdAndUpdate(
                id,
                { points, img, name, updatedAt: new Date() },
                { new: true }
            );

            if (!reward) {
                return res.status(404).json({ 
                    success: false, 
                    message: '找不到該獎勵' 
                });
            }

            res.json({ success: true, data: reward });
        } catch (error) {
            console.error('Error:', error);
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
            const { storeSlug, id } = req.params;
            const db = getClientDb(storeSlug, 'CDB');
            const PointsRewards = db.model('PointsRewards', pointsRewardsSchema);

            const reward = await PointsRewards.findByIdAndDelete(id);

            if (!reward) {
                return res.status(404).json({ 
                    success: false, 
                    message: '找不到該獎勵' 
                });
            }

            res.json({ success: true, message: '獎勵已刪除' });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                success: false, 
                message: '刪除獎勵失敗', 
                error: error.message 
            });
        }
    }
};

module.exports = rewardsController;
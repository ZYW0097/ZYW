const getClientDb = require('../../utils/dbManager');
const pointsRulesSchema = require('../../models/points/rules');

const rulesController = {
    // 獲取所有規則
    async getAllRules(req, res) {
        try {
            const { storeSlug } = req.params;
            const db = getClientDb(storeSlug, 'CDB');
            const PointsRules = db.model('PointsRules', pointsRulesSchema);

            const rules = await PointsRules.find({ type: 'points_rule' });
            res.json({ success: true, data: rules });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                success: false, 
                message: '獲取規則失敗', 
                error: error.message 
            });
        }
    },

    // 創建新規則
    async createRule(req, res) {
        try {
            const { storeSlug } = req.params;
            const { points, img, name } = req.body;
            const db = getClientDb(storeSlug, 'CDB');
            const PointsRules = db.model('PointsRules', pointsRulesSchema);

            const rule = await PointsRules.create({
                type: 'points_rule',
                points,
                img,
                name
            });

            res.json({ success: true, data: rule });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                success: false, 
                message: '創建規則失敗', 
                error: error.message 
            });
        }
    },

    // 更新規則
    async updateRule(req, res) {
        try {
            const { storeSlug, id } = req.params;
            const { points, img, name } = req.body;
            const db = getClientDb(storeSlug, 'CDB');
            const PointsRules = db.model('PointsRules', pointsRulesSchema);

            const rule = await PointsRules.findByIdAndUpdate(
                id,
                { points, img, name, updatedAt: new Date() },
                { new: true }
            );

            if (!rule) {
                return res.status(404).json({ 
                    success: false, 
                    message: '找不到該規則' 
                });
            }

            res.json({ success: true, data: rule });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                success: false, 
                message: '更新規則失敗', 
                error: error.message 
            });
        }
    },

    // 刪除規則
    async deleteRule(req, res) {
        try {
            const { storeSlug, id } = req.params;
            const db = getClientDb(storeSlug, 'CDB');
            const PointsRules = db.model('PointsRules', pointsRulesSchema);

            const rule = await PointsRules.findByIdAndDelete(id);

            if (!rule) {
                return res.status(404).json({ 
                    success: false, 
                    message: '找不到該規則' 
                });
            }

            res.json({ success: true, message: '規則已刪除' });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                success: false, 
                message: '刪除規則失敗', 
                error: error.message 
            });
        }
    }
};

module.exports = rulesController;
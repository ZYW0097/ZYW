const { PointsRules } = require('../../models');

const rulesController = {
    // 獲取所有規則
    async getAllRules(req, res) {
        try {
            const rules = await PointsRules.find({ 
                type: 'points_settings', 
                class: 'rule_settings' 
            }).sort({ article: 1 });

            res.json({ 
                success: true, 
                data: rules 
            });
        } catch (error) {
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
            const { article, text } = req.body;

            const rule = await PointsRules.create({
                type: 'points_settings',
                class: 'rule_settings',
                article,
                text,
                updatedAt: new Date()
            });

            res.status(201).json({ 
                success: true, 
                data: rule 
            });
        } catch (error) {
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
            const { id } = req.params;
            const { article, text } = req.body;

            const rule = await PointsRules.findByIdAndUpdate(
                id,
                { 
                    article, 
                    text,
                    updatedAt: new Date()
                },
                { new: true }
            );

            if (!rule) {
                return res.status(404).json({ 
                    success: false, 
                    message: '規則不存在' 
                });
            }

            res.json({ 
                success: true, 
                data: rule 
            });
        } catch (error) {
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
            const { id } = req.params;

            const rule = await PointsRules.findByIdAndDelete(id);

            if (!rule) {
                return res.status(404).json({ 
                    success: false, 
                    message: '規則不存在' 
                });
            }

            res.json({ 
                success: true, 
                message: '規則已刪除' 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: '刪除規則失敗', 
                error: error.message 
            });
        }
    }
};

module.exports = rulesController;
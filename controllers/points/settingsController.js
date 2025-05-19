const { PointsSettings } = require('../../models');
const getClientDb = require('../../utils/dbManager');

const settingsController = {
    // 獲取集點卡設定
    async getSettings(req, res) {
        try {
            const { storeSlug } = req.params;
            
            // 使用客戶特定的資料庫
            const db = getClientDb(storeSlug, 'CDB');
            const PointsSettings = db.model('PointsSettings', pointsSettingsSchema);

            const settings = await PointsSettings.findOne({ 
                type: 'points_settings', 
                class: 'main_settings'
            });
            
            if (!settings) {
                return res.status(404).json({ 
                    success: false, 
                    message: '集點卡設定不存在' 
                });
            }

            res.json({ 
                success: true, 
                data: settings 
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                success: false, 
                message: '獲取集點卡設定失敗', 
                error: error.message 
            });
        }
    },

    // 更新集點卡設定
    async updateSettings(req, res) {
        try {
            const { storeSlug } = req.params;
            const { state, s_reward } = req.body;

            // 使用客戶特定的資料庫
            const db = getClientDb(storeSlug, 'CDB');
            const PointsSettings = db.model('PointsSettings', pointsSettingsSchema);

            const settings = await PointsSettings.findOneAndUpdate(
                { 
                    type: 'points_settings', 
                    class: 'main_settings'
                },
                { 
                    state, 
                    s_reward,
                    updatedAt: new Date()
                },
                { 
                    new: true, 
                    upsert: true 
                }
            );

            res.json({ 
                success: true, 
                data: settings 
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                success: false, 
                message: '更新集點卡設定失敗', 
                error: error.message 
            });
        }
    }
};

module.exports = settingsController;
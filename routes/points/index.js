const express = require('express');
const router = express.Router();
const { validateStoreSlug } = require('../../middleware/clientAuth');
const { isAuthenticated, isAdmin } = require('../../middleware/auth');
const getClientDb = require('../../utils/dbManager');
const pointsSettingsSchema = require('../../models/points/settings');
const pointsRewardsSchema = require('../../models/points/rewards');
const userPointsSchema = require('../../models/points/userPoints');
const multer = require('multer');
const { storage } = require('../../config/cloudinary');
const upload = multer({ storage });
const pointsController = require('../../controllers/admin/pointsController');

const settingsRoutes = require('./settingsRoutes');
const rulesRoutes = require('./rulesRoutes');
const rewardsRoutes = require('./rewardsRoutes');
const userPointsRoutes = require('./userPointsRoutes');

// 所有點數相關路由都會先經過 validateStoreSlug 中間件
router.use('/:storeSlug/card', validateStoreSlug);

// 設定路由 (需要管理員權限)
router.use('/:storeSlug/card/settings', isAuthenticated, isAdmin, settingsRoutes);

// 規則路由 (需要管理員權限)
router.use('/:storeSlug/card/rules', isAuthenticated, isAdmin, rulesRoutes);

// 獎勵路由 (需要管理員權限)
router.use('/:storeSlug/card/rewards', isAuthenticated, isAdmin, rewardsRoutes);

// 用戶集點卡路由 (需要登入)
router.use('/:storeSlug/card/users', isAuthenticated, userPointsRoutes);

router.post('/:storeSlug/points/create', upload.any(), pointsController.createCard);

router.get('/:storeSlug/card', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const db = getClientDb(storeSlug, 'CDB');
        
        // 獲取設定
        const settings = await db.model('PointsSettings', pointsSettingsSchema)
            .findOne({ type: 'points_settings', class: 'main_settings' });

        // 獲取獎勵
        const rewards = await db.model('PointsRewards', pointsRewardsSchema)
            .find({ type: 'points_reward' });

        // 如果用戶已登入，獲取用戶點數
        let userPoints = null;
        if (req.user) {
            const userDb = getClientDb(storeSlug, 'ADB');
            userPoints = await userDb.model('UserPoints', userPointsSchema)
                .findOne({ lineId: req.user.lineId });
        }

        res.render('card', {
            settings,
            rewards,
            userPoints,
            storeSlug
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            message: '載入集點卡失敗'
        });
    }
});

module.exports = router; 
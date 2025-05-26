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

        // 確保 storeName 一定有值
        let storeName = storeSlug;
        if (settings && settings.name) {
            storeName = settings.name;
        }

        res.render('card', {
            storeName,
            settings,
            rewards,
            userPoints,
            storeSlug,
            rules: settings?.rules || [],
            req: req  
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            message: '載入集點卡失敗'
        });
    }
});

// 領取集點卡 API
router.post('/:storeSlug/api/points/claim', isAuthenticated, async (req, res) => {
    try {
        const { storeSlug } = req.params;
        if (!storeSlug) {
            return res.status(400).json({ error: '商店資訊不完整' });
        }

        const userDb = getClientDb(storeSlug, 'ADB');
        const UserPoints = userDb.model('UserPoints', userPointsSchema);

        // 檢查是否已經有集點卡
        const existingCard = await UserPoints.findOne({ 
            lineId: req.user.lineId,
            type: 'user_points'
        });

        if (existingCard) {
            return res.status(400).json({ error: '您已經領取過集點卡了' });
        }

        // 創建新的集點卡
        const newCard = await UserPoints.create({
            lineId: req.user.lineId,
            'u-name': req.user.name || '未命名用戶',
            'ah-points': 0,
            'ah-coupon': 0,
            'ah-coupon-id': [],
            updateat: new Date(),
            type: 'user_points'
        });

        res.json({ 
            success: true, 
            card: newCard,
            message: '集點卡領取成功'
        });
    } catch (error) {
        console.error('Error in claim card:', error);
        res.status(500).json({ 
            error: '領取集點卡失敗，請稍後再試',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 兌換獎勵 API
router.post('/:storeSlug/api/points/redeem', isAuthenticated, async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { rewardId } = req.body;

        if (!storeSlug || !rewardId) {
            return res.status(400).json({ error: '參數不完整' });
        }

        // 獲取用戶點數資料
        const userDb = getClientDb(storeSlug, 'ADB');
        const UserPoints = userDb.model('UserPoints', userPointsSchema);
        const userPoints = await UserPoints.findOne({ 
            lineId: req.user.lineId,
            type: 'user_points'
        });

        if (!userPoints) {
            return res.status(404).json({ error: '找不到用戶點數資料' });
        }

        // 獲取獎勵資料
        const cdb = getClientDb(storeSlug, 'CDB');
        const Rewards = cdb.model('PointsRewards', pointsRewardsSchema);
        const reward = await Rewards.findOne({ 
            _id: rewardId,
            type: 'points_reward'
        });

        if (!reward) {
            return res.status(404).json({ error: '找不到獎勵資料' });
        }

        // 檢查點數是否足夠
        if (userPoints['ah-points'] < reward.points) {
            return res.status(400).json({ error: '點數不足' });
        }

        // 更新用戶點數和優惠券資訊
        userPoints['ah-points'] -= reward.points;
        userPoints['ah-coupon'] += 1;  // 增加優惠券數量
        
        // 處理優惠券 ID 陣列
        if (!userPoints['ah-coupon-id']) {
            userPoints['ah-coupon-id'] = [];
        }
        
        // 查找是否已經有這個獎勵
        const existingCoupon = userPoints['ah-coupon-id'].find(c => 
            c && c.rewardId && c.rewardId.equals(reward._id)
        );
        
        if (existingCoupon) {
            // 如果已經有這個獎勵，增加數量
            existingCoupon.count += 1;
        } else {
            // 如果沒有，新增一個
            userPoints['ah-coupon-id'].push({ 
                rewardId: reward._id, 
                count: 1 
            });
        }
        
        userPoints.updateat = new Date();
        await userPoints.save();

        res.json({ 
            success: true, 
            message: '兌換成功',
            remainingPoints: userPoints['ah-points'],
            couponCount: userPoints['ah-coupon'],
            coupons: userPoints['ah-coupon-id']
        });
    } catch (error) {
        console.error('Error in redeem reward:', error);
        res.status(500).json({ 
            error: '兌換失敗，請稍後再試',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router; 
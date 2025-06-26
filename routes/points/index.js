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
        
        // 獲取Client資訊
        const Client = require('../../models/Client');
        const client = await Client.findOne({ slugname: storeSlug });
        
        // 確保 storeName 一定有值
        let storeName = client ? client.clientname : storeSlug;
        
        // 檢查集點卡功能是否啟用
        const settings = await db.model('PointsSettings', pointsSettingsSchema)
            .findOne({ type: 'points_settings', class: 'main_settings' });
            
        if (!settings || settings.state !== 'enable') {
            return res.render('card', {
                storeName,
                storeSlug,
                systemDisabled: true,
                message: '集點卡功能目前未開啟',
                customSettings: {
                    cardBackgroundImage: client ? client.cardBackgroundImage : '/images/dine.jpg'
                },
                req: req
            });
        }

        // 檢查設定完整性
        const incompleteness = [];
        
        // 檢查規則設定
        if (settings.maxPointsPerDay === undefined || settings.pointsExpireDays === undefined) {
            incompleteness.push('集點規則設定不完整');
        }

        // 檢查獎勵設定
        let activeRewards = [];
        if (client.customSettings?.rewards && Array.isArray(client.customSettings.rewards)) {
            activeRewards = client.customSettings.rewards.filter(reward => 
                reward.name && reward.points && reward.points > 0 && reward.active === true
            );
        }
        
        if (activeRewards.length === 0) {
            incompleteness.push('沒有設定有效的獎勵項目');
        }

        // 如果設定不完整，顯示錯誤頁面
        if (incompleteness.length > 0) {
            return res.render('card', {
                storeName,
                storeSlug,
                systemDisabled: false,
                systemIncomplete: true,
                message: `集點卡設定不完整：${incompleteness.join('、')}。請聯繫商家完善設定。`,
                customSettings: {
                    cardBackgroundImage: client ? client.cardBackgroundImage : '/images/dine.jpg'
                },
                req: req
            });
        }

        // 獲取獎勵 (從Client.customSettings而不是單獨的rewards表)
        const rewards = activeRewards;

        // 如果用戶已登入，獲取用戶點數
        let userPoints = null;
        if (req.user) {
            const userDb = getClientDb(storeSlug, 'ADB');
            userPoints = await userDb.model('UserPoints', userPointsSchema)
                .findOne({ lineId: req.user.lineId });
        }

        // 獲取規則
        const rules = await db.model('PointsRules', require('../../models/points/rules'))
            .find({ slug: storeSlug, type: 'points_settings', class: 'rule_settings' })
            .sort({ article: 1 });

        res.render('card', {
            storeName,
            settings,
            rewards,
            userPoints,
            storeSlug,
            rules,
            systemDisabled: false,
            systemIncomplete: false,
            customSettings: {
                cardBackgroundImage: client ? client.cardBackgroundImage : '/images/dine.jpg'
            },
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

        // 獲取首次領取獎勵設定
        let welcomePoints = 0;
        let pointsExpireDays = 365;
        
        try {
            const cdb = getClientDb(storeSlug, 'CDB');
            const pointsSettingsSchema = require('../../models/points/settings');
            const PointsSettings = cdb.model('PointsSettings', pointsSettingsSchema);
            const settings = await PointsSettings.findOne({
                slug: storeSlug,
                type: 'points_settings',
                class: 'main_settings'
            });
            
            if (settings) {
                welcomePoints = settings.s_reward || 0;
                pointsExpireDays = settings.pointsExpireDays || 365;
            }
        } catch (settingsError) {
            console.error('無法獲取點數設定:', settingsError);
        }

        // 創建新的集點卡
        const newCard = await UserPoints.create({
            lineId: req.user.lineId,
            'u-name': req.user.name || '未命名用戶',
            'ah-points': welcomePoints,
            'ah-coupon': 0,
            'ah-coupon-id': [],
            dailyPointsHistory: [],
            pointsHistory: welcomePoints > 0 ? [{
                points: welcomePoints,
                earnedDate: new Date(),
                expiredDate: new Date(Date.now() + pointsExpireDays * 24 * 60 * 60 * 1000),
                isExpired: false
            }] : [],
            updateat: new Date(),
            type: 'user_points'
        });

        res.json({ 
            success: true, 
            card: newCard,
            welcomePoints: welcomePoints,
            message: welcomePoints > 0 ? `集點卡領取成功！獲得 ${welcomePoints} 點歡迎獎勵` : '集點卡領取成功'
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

        // 獲取獎勵資料 - 從Client模型的customSettings中獲取
        const Client = require('../../models/Client');
        const client = await Client.findOne({ slugname: storeSlug });
        
        if (!client || !client.customSettings || !client.customSettings.rewards) {
            return res.status(404).json({ error: '找不到商家獎勵設定' });
        }
        
        const rewardIndex = parseInt(rewardId);
        const reward = client.customSettings.rewards[rewardIndex];
        
        if (!reward || !reward.active) {
            return res.status(404).json({ error: '找不到獎勵資料或獎勵未啟用' });
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
            c && c.rewardId && c.rewardId.toString() === rewardIndex.toString()
        );
        
        if (existingCoupon) {
            // 如果已經有這個獎勵，增加數量
            existingCoupon.count += 1;
        } else {
            // 如果沒有，新增一個
            userPoints['ah-coupon-id'].push({ 
                rewardId: rewardIndex, 
                count: 1,
                rewardName: reward.name,
                rewardImg: reward.img,
                redeemedAt: new Date()
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

// 使用優惠券 API
router.post('/:storeSlug/api/coupons/use', isAuthenticated, async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { couponId } = req.body;

        if (!storeSlug || !couponId) {
            return res.status(400).json({ 
                success: false, 
                message: '參數不完整' 
            });
        }

        // 獲取用戶點數資料
        const userDb = getClientDb(storeSlug, 'ADB');
        const UserPoints = userDb.model('UserPoints', userPointsSchema);
        const userPoints = await UserPoints.findOne({ 
            lineId: req.user.lineId,
            type: 'user_points'
        });

        if (!userPoints) {
            return res.status(404).json({ 
                success: false, 
                message: '找不到用戶點數資料' 
            });
        }

        // 檢查優惠券是否存在
        const couponIndex = userPoints['ah-coupon-id'].findIndex(
            coupon => coupon.rewardId.toString() === couponId
        );

        if (couponIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: '找不到優惠券' 
            });
        }

        // 檢查優惠券數量
        if (userPoints['ah-coupon-id'][couponIndex].count <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: '優惠券已用完' 
            });
        }

        // 減少優惠券數量
        userPoints['ah-coupon-id'][couponIndex].count -= 1;
        userPoints['ah-coupon'] -= 1;

        // 如果數量為 0，移除該優惠券
        if (userPoints['ah-coupon-id'][couponIndex].count === 0) {
            userPoints['ah-coupon-id'].splice(couponIndex, 1);
        }

        userPoints.updateat = new Date();
        await userPoints.save();

        // 計算剩餘優惠券總數
        const remainingCoupons = userPoints['ah-coupon'];

        res.json({
            success: true,
            message: '使用優惠券成功',
            remainingCoupons
        });
    } catch (error) {
        console.error('Error using coupon:', error);
        res.status(500).json({ 
            error: '使用優惠券失敗，請稍後再試',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 獲取單個獎勵詳情
router.get('/:storeSlug/api/points/reward/:rewardId', async (req, res) => {
    try {
        const { storeSlug, rewardId } = req.params;
        
        if (!storeSlug || !rewardId) {
            return res.status(400).json({ success: false, error: '參數不完整' });
        }
        
        const db = getClientDb(storeSlug, 'CDB');
        const Rewards = db.model('PointsRewards', pointsRewardsSchema);
        
        const reward = await Rewards.findById(rewardId);
        
        if (!reward) {
            return res.status(404).json({ success: false, error: '找不到獎勵資料' });
        }
        
        res.json({ 
            success: true, 
            reward: {
                id: reward._id,
                name: reward.name,
                points: reward.points,
                img: reward.img
            }
        });
    } catch (error) {
        console.error('Error getting reward details:', error);
        res.status(500).json({ 
            success: false, 
            error: '獲取獎勵詳情失敗，請稍後再試',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 獲取用戶優惠券列表
router.get('/:storeSlug/api/points/coupons', isAuthenticated, async (req, res) => {
    try {
        const { storeSlug } = req.params;
        
        if (!storeSlug) {
            return res.status(400).json({ success: false, error: '參數不完整' });
        }
        
        // 獲取用戶點數資料
        const userDb = getClientDb(storeSlug, 'ADB');
        const UserPoints = userDb.model('UserPoints', userPointsSchema);
        const userPoints = await UserPoints.findOne({ 
            lineId: req.user.lineId,
            type: 'user_points'
        });

        if (!userPoints || !userPoints['ah-coupon-id'] || userPoints['ah-coupon-id'].length === 0) {
            return res.json({ success: true, coupons: [] });
        }
        
        // 獲取商家獎勵設定
        const Client = require('../../models/Client');
        const client = await Client.findOne({ slugname: storeSlug });
        
        if (!client || !client.customSettings || !client.customSettings.rewards) {
            return res.json({ success: true, coupons: [] });
        }
        
        // 合併優惠券和獎勵數據
        const coupons = userPoints['ah-coupon-id'].map(coupon => {
            // 如果coupon已經包含rewardName和rewardImg，直接使用
            if (coupon.rewardName && coupon.rewardImg) {
                return {
                    id: coupon.rewardId,
                    count: coupon.count || 1,
                    name: coupon.rewardName,
                    img: coupon.rewardImg
                };
            }
            
            // 否則從client.customSettings.rewards中獲取
            const rewardIndex = parseInt(coupon.rewardId);
            const rewardData = client.customSettings.rewards[rewardIndex];
            
            return {
                id: coupon.rewardId,
                count: coupon.count || 1,
                name: rewardData ? rewardData.name : '未知獎勵',
                img: rewardData ? rewardData.img : '/images/coupon-default.svg'
            };
        });
        
        res.json({ 
            success: true, 
            coupons: coupons
        });
    } catch (error) {
        console.error('Error getting user coupons:', error);
        res.status(500).json({ 
            success: false, 
            error: '獲取優惠券列表失敗，請稍後再試',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// QR碼兌換點數 API
router.get('/:storeSlug/points/qr/:code', async (req, res) => {
    try {
        const { storeSlug, code } = req.params;
        
        // 基本驗證
        if (!storeSlug || !code) {
            return res.status(400).render('error', { 
                message: '無效的QR碼連結',
                layout: false 
            });
        }

        const { validateQRCode, isQRCodeExpired } = require('../../utils/qrcodeHelper');
        
        // 驗證QR碼格式
        if (!validateQRCode(code)) {
            return res.status(400).render('error', { 
                message: 'QR碼格式無效',
                layout: false 
            });
        }

        // 查找QR碼
        const cardDB = getClientDb(storeSlug, 'CDB');
        const qrcodeSchema = require('../../models/points/qrcode');
        const QRCode = cardDB.model('QRCode', qrcodeSchema);
        
        const qrcode = await QRCode.findOne({ code: code });
        
        if (!qrcode) {
            return res.status(404).render('error', { 
                message: 'QR碼不存在或已失效',
                layout: false 
            });
        }

        // 檢查QR碼狀態
        if (qrcode.status !== 'active') {
            return res.status(400).render('error', { 
                message: 'QR碼已被使用',
                layout: false 
            });
        }

        // 檢查是否過期
        if (isQRCodeExpired(qrcode.expiresAt)) {
            // 更新QR碼狀態為過期
            qrcode.status = 'expired';
            await qrcode.save();
            
            return res.status(400).render('error', { 
                message: 'QR碼已過期',
                layout: false 
            });
        }

        // 獲取商家名稱
        const Client = require('../../models/Client');
        const client = await Client.findOne({ slugname: storeSlug });
        const storeName = client ? client.clientname : storeSlug;

        // 顯示QR碼兌換頁面（不需要登入驗證）
        res.render('qr-redeem', {
            layout: false,
            storeSlug: storeSlug,
            storeName: storeName,
            qrcode: {
                code: code,
                points: qrcode.points
            }
        });
        
    } catch (error) {
        console.error('QR碼處理錯誤:', error);
        res.status(500).render('error', { 
            message: '系統錯誤，請稍後再試',
            layout: false 
        });
    }
});

// QR碼兌換確認 API
router.post('/:storeSlug/points/qr/:code/redeem', isAuthenticated, async (req, res) => {
    try {
        const { storeSlug, code } = req.params;
        const lineId = req.user.lineId;
        
        const { validateQRCode, isQRCodeExpired } = require('../../utils/qrcodeHelper');
        const { addPointsWithExpiry, checkDailyPointsLimit, recordDailyPoints } = require('../../utils/pointsHelper');
        
        // 驗證QR碼格式
        if (!validateQRCode(code)) {
            return res.status(400).json({ success: false, message: 'QR碼格式無效' });
        }

        const cardDB = getClientDb(storeSlug, 'CDB');
        const userDb = getClientDb(storeSlug, 'ADB');
        
        const qrcodeSchema = require('../../models/points/qrcode');
        const userPointsSchema = require('../../models/points/userPoints');
        const pointsSettingsSchema = require('../../models/points/settings');
        
        const QRCode = cardDB.model('QRCode', qrcodeSchema);
        const UserPoints = userDb.model('UserPoints', userPointsSchema);
        const PointsSettings = cardDB.model('PointsSettings', pointsSettingsSchema);
        
        // 查找QR碼
        const qrcode = await QRCode.findOne({ code: code });
        
        if (!qrcode) {
            return res.status(404).json({ success: false, message: 'QR碼不存在或已失效' });
        }

        if (qrcode.status !== 'active') {
            return res.status(400).json({ success: false, message: 'QR碼已被使用' });
        }

        if (isQRCodeExpired(qrcode.expiresAt)) {
            qrcode.status = 'expired';
            await qrcode.save();
            return res.status(400).json({ success: false, message: 'QR碼已過期' });
        }

        // 檢查用戶是否已兌換過此QR碼
        let userCard = await UserPoints.findOne({ 
            lineId: lineId,
            type: 'user_points'
        });
        
        if (userCard && userCard.redeemedQRCodes && userCard.redeemedQRCodes.includes(code)) {
            return res.status(400).json({ success: false, message: '您已經兌換過此QR碼' });
        }
        
        let isFirstTimeUser = false;
        let firstReward = 0;
        
        // 如果用戶沒有集點卡，自動創建一個
        if (!userCard) {
            isFirstTimeUser = true;
            const settings = await PointsSettings.findOne({ slug: storeSlug });
            firstReward = settings?.s_reward || 0;
            
            userCard = new UserPoints({
                lineId: lineId,
                type: 'user_points',
                'ah-points': firstReward,
                pointsHistory: firstReward > 0 ? [{
                    points: firstReward,
                    type: 'reward',
                    description: '首次領取集點卡獎勵',
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + (settings?.pointsExpireDays || 365) * 24 * 60 * 60 * 1000)
                }] : [],
                dailyPointsHistory: [],
                redeemedQRCodes: [],
                createdAt: new Date()
            });
            
            await userCard.save();
        }

        // 獲取點數設定
        const settings = await PointsSettings.findOne({ slug: storeSlug }) || {};
        
        // 檢查每日點數限制（如果是首次用戶或沒有設定上限則跳過檢查）
        if (settings.maxPointsPerDay && settings.maxPointsPerDay > 0 && !isFirstTimeUser) {
            const canAdd = await checkDailyPointsLimit(userCard, qrcode.points, settings.maxPointsPerDay);
            if (!canAdd) {
                return res.status(400).json({ 
                    success: false, 
                    message: `已達到今日上限 ${settings.maxPointsPerDay} 點` 
                });
            }
        }

        // 添加QR碼點數
        await addPointsWithExpiry(userCard, qrcode.points, settings.pointsExpireDays || 365, `QR碼兌換：${qrcode.points}點`);
        
        // 記錄每日點數（僅記錄QR碼點數，首次獎勵不計入每日上限）
        if (settings.maxPointsPerDay && settings.maxPointsPerDay > 0) {
            await recordDailyPoints(userCard, qrcode.points);
        }
        
        // 記錄已兌換的QR碼
        if (!userCard.redeemedQRCodes) {
            userCard.redeemedQRCodes = [];
        }
        userCard.redeemedQRCodes.push(code);
        
        await userCard.save();

        // 更新QR碼狀態
        qrcode.status = 'redeemed';
        qrcode.redeemedBy = lineId;
        qrcode.redeemedAt = new Date();
        await qrcode.save();

        // 組成返回訊息
        let message = `成功兌換 ${qrcode.points} 點數！`;
        if (isFirstTimeUser && firstReward > 0) {
            message = `集點卡領取成功！獲得首次獎勵 ${firstReward} 點 + QR碼兌換 ${qrcode.points} 點，共 ${firstReward + qrcode.points} 點！`;
        }

        res.json({
            success: true,
            message: message,
            qrPoints: qrcode.points,
            firstReward: isFirstTimeUser ? firstReward : 0,
            totalPoints: userCard['ah-points'],
            isFirstTime: isFirstTimeUser
        });

    } catch (error) {
        console.error('QR碼兌換錯誤:', error);
        res.status(500).json({ success: false, message: '兌換失敗，請稍後再試' });
    }
});

module.exports = router; 
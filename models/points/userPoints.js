const mongoose = require('mongoose');

const userPointsSchema = new mongoose.Schema({
    type: {
        type: String,
        default: 'user_points'
    },
    lineId: {
        type: String,
        required: true
    },
    'u-name': {
        type: String
    },
    // 點數系統
    'ah-points': {
        type: Number,
        default: 0
    },
    'ah-coupon': {
        type: Number,
        default: 0
    },
    'ah-coupon-id': [{
        rewardId: { type: mongoose.Schema.Types.ObjectId, ref: 'PointsRewards' },
        count: { type: Number, default: 1 }
    }],
    // 每日點數限制追蹤
    dailyPointsHistory: [{
        date: { type: Date, required: true },
        pointsEarned: { type: Number, default: 0 }
    }],
    // 點數歷史記錄（用於追蹤有效期）
    pointsHistory: [{
        points: { type: Number, required: true },
        type: { type: String, enum: ['earned', 'redeemed', 'expired', 'reward'], default: 'earned' },
        description: { type: String },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date }
    }],
    // 已兌換的QR碼記錄
    redeemedQRCodes: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updateat: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = userPointsSchema;
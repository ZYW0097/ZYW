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
        type: String,
        required: true
    },
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
        earnedDate: { type: Date, default: Date.now },
        expiredDate: { type: Date, required: true },
        isExpired: { type: Boolean, default: false }
    }],
    updateat: {
        type: Date,
        default: Date.now
    },
}, { timestamps: true });

module.exports = userPointsSchema;
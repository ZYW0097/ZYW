const mongoose = require('mongoose');

const pointsCouponsSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['points_coupon'],
        default: 'points_coupon',
        required: true
    },
    couponId: {
        type: String,
        required: true,
        unique: true
    },
    lineId: {
        type: String,
        required: true
    },
    rewardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PointsRewards'
    },
    rewardName: {
        type: String,
        required: true
    },
    rewardPoints: {
        type: Number,
        required: true
    },
    rewardImg: {
        type: String,
        default: '/images/coupon-default.svg'
    },
    status: {
        type: String,
        enum: ['issued', 'used', 'expired'],
        default: 'issued'
    },
    usedAt: {
        type: Date
    },
    expiresAt: {
        type: Date,
        required: true
    },
    slug: {
        type: String,
        required: true
    }
}, { timestamps: true });

// 索引設定
pointsCouponsSchema.index({ couponId: 1 }, { unique: true });
pointsCouponsSchema.index({ lineId: 1 });
pointsCouponsSchema.index({ slug: 1 });
pointsCouponsSchema.index({ status: 1 });
pointsCouponsSchema.index({ createdAt: 1 });
pointsCouponsSchema.index({ expiresAt: 1 });

module.exports = pointsCouponsSchema; 
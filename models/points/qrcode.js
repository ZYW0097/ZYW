const mongoose = require('mongoose');

const qrcodeSchema = new mongoose.Schema({
    type: {
        type: String,
        default: 'points_qrcode'
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    points: {
        type: Number,
        required: true,
        min: 1,
        max: 100
    },
    slug: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'redeemed', 'expired'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    usedAt: {
        type: Date
    },
    usedBy: {
        type: String
    },
    redeemedAt: {
        type: Date
    },
    redeemedBy: {
        type: String
    }
}, { 
    timestamps: true,
    // 自動刪除過期的QR碼
    expireAfterSeconds: 0,
    expires: 'expiresAt'
});

// 索引優化
qrcodeSchema.index({ code: 1 }, { unique: true });
qrcodeSchema.index({ slug: 1, status: 1 });
qrcodeSchema.index({ expiresAt: 1 });

module.exports = qrcodeSchema; 
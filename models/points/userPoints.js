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
    'ah-coupon-id': {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PointsRewards'
    },
    updateat: {
        type: Date,
        default: Date.now
    },
}, { timestamps: true });

module.exports = userPointsSchema;
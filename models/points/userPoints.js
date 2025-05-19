const mongoose = require('mongoose');

const userPointsSchema = new mongoose.Schema({
    lineId: {
        type: String,
        required: true,
        unique: true
    },
    points: {
        type: Number,
        default: 0,
        min: 0
    },
    rewards: [{
        rewardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PointsRewards'
        },
        redeemedAt: {
            type: Date,
            default: Date.now
        }
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('UserPoints', userPointsSchema); 
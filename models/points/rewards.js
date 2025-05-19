const mongoose = require('mongoose');

const pointsRewardsSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['points_reward'],
        default: 'points_reward',
        required: true
    },
    points: {
        type: Number,
        required: true,
        min: 0
    },
    img: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 15
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('PointsRewards', pointsRewardsSchema);
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
    active: {
        type: Boolean,
        default: true,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    slug: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = pointsRewardsSchema;
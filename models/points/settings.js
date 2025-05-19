const mongoose = require('mongoose');

const pointsSettingsSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['points_settings'],
        default: 'points_settings',
        required: true
    },
    class: {
        type: String,
        enum: ['main_settings'],
        required: true
    },
    state: {
        type: String,
        enum: ['enable', 'disabled'],
        default: 'disabled',
        required: true
    },
    s_reward: {
        type: Number,
        default: 0,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// 確保只能有一個主要設定
pointsSettingsSchema.index({ slug: 1, type: 1, class: 1 }, { unique: true });

module.exports = pointsSettingsSchema;
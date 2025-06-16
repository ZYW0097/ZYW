const mongoose = require('mongoose');

const bookingSettingsSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['booking_settings'],
        default: 'booking_settings',
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
        default: 'enable', // BDB 預設開啟
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

// 確保只能有一個主要設定
bookingSettingsSchema.index({ slug: 1, type: 1, class: 1 }, { unique: true });

module.exports = bookingSettingsSchema; 
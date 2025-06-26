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
    // 人數限制設定
    limitType: {
        type: String,
        enum: ['separate', 'total'],
        default: 'separate'
    },
    maxAdults: {
        type: Number,
        default: 6,
        min: 1,
        max: 20
    },
    maxChildren: {
        type: Number,
        default: 6,
        min: 0,
        max: 20
    },
    maxTotalPeople: {
        type: Number,
        default: 10,
        min: 1,
        max: 30
    },
    // 餐廳特色選項
    enableVegetarian: {
        type: Boolean,
        default: false
    },
    // 特殊需求設定
    enableSpecialRequests: {
        type: Boolean,
        default: false
    },
    specialRequestsType: {
        type: String,
        enum: ['default', 'custom'],
        default: 'default'
    },
    customSpecialRequests: {
        type: [String],
        default: []
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
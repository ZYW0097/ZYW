const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    customBookingId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    adults: {
        type: Number,
        required: false,
        min: 0,
        max: 10,
        default: 1
    },
    children: {
        type: Number,
        required: false,
        min: 0,
        max: 10,
        default: 0
    },
    guests: {
        type: Number,
        required: false 
    },
    gender: {
        type: String,
        required: false, // 改為非必填
        default: '先生'
    },
    vegetarian: {
        type: String,
        default: 'no'
    },
    special: {
        type: String
    },
    note: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'confirmed'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    cancelledAt: {
        type: Date
    },
    // 提醒相關欄位
    reminderSent: {
        type: Boolean,
        default: false
    },
    reminderSentAt: {
        type: Date
    },
    reminderConfirmed: {
        type: Boolean,
        default: false
    },
    reminderConfirmedAt: {
        type: Date
    },
    cancelReason: {
        type: String
    }
});

module.exports = reservationSchema; 
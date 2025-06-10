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
        type: String, // 改為String因為前端發送'YYYY-MM-DD'格式
        required: true
    },
    time: {
        type: String,
        required: true
    },
    adults: {
        type: Number,
        required: true,
        min: 1,
        max: 6
    },
    children: {
        type: Number,
        required: true,
        min: 0,
        max: 6
    },
    guests: {
        type: Number,
        required: true
    },
    gender: {
        type: String,
        required: true
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
    }
});

module.exports = reservationSchema; 
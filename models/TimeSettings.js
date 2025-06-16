const mongoose = require('mongoose');

const timeSettingsSchema = new mongoose.Schema({
    time: {
        type: String,
        required: true
    },
    available: {
        type: Boolean,
        default: true
    },
    maxBookings: {
        type: Number,
        default: 10
    }
}, {
    timestamps: true
});

module.exports = timeSettingsSchema; 
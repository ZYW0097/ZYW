const mongoose = require('mongoose');

const bookingRulesSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = bookingRulesSchema; 
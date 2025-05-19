const mongoose = require('mongoose');

const pointsRulesSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['points_settings'],
        default: 'points_settings',
        required: true
    },
    class: {
        type: String,
        enum: ['rule_settings'],
        required: true
    },
    article: {
        type: Number,
        required: true
    },
    text: {
        type: String,
        required: true,
        maxlength: 30
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

module.exports = pointsRulesSchema;
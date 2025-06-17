const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    clientname: {
        type: String,
        required: true
    },
    slugname: {
        type: String,
        required: true,
        unique: true,
        match: /^[a-zA-Z0-9]+$/
    },
    restaurantImage: {
        type: String,
        default: '/images/dine.jpg'
    },
    cardBackgroundImage: {
        type: String,
        default: '/images/dine.jpg'
    },
    restaurantAddress: {
        type: String,
        default: ''
    },
    adminPassword: {
        type: String,
        default: ''
    },
    tutorialImage1: {
        type: String,
        default: ''
    },
    tutorialImage2: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Client', clientSchema); 
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
    cardpagetext: {
        type: String,
        required: true
    },
    accountpagetext: {
        type: String,
        required: true
    },
    bookingpagetext: {
        type: String,
        required: true
    },
    backstagepagetext: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Client', clientSchema); 
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    lineId: { type: String, required: true, unique: true },
    name: String,
    avatar: String, // Cloudinary URL
    phone: String,
    birthday: String,
    gender: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = userSchema;

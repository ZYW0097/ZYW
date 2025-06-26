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
    ownerid: {
        type: String,
        required: true,
        index: true  // 為擁有者ID添加索引以提高查詢性能
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
    // customSettings 已移除
    // 注意：之前此欄位被誤用來存放集點卡和訂位相關資料
    // 現在這些資料正確存放在各自的專用資料庫中：
    // - 集點卡相關：clientCDB (pointsrewards, pointsrules, pointssettings等)
    // - 訂位相關：clientBDB (bookingsettings, timesettings, bookingrules等)
    // - 商家基本資訊：此Client模型（名稱、地址、照片等）
}, {
    timestamps: true
});

module.exports = mongoose.model('Client', clientSchema); 
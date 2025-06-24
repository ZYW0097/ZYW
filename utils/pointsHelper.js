const mongoose = require('mongoose');

/**
 * 檢查用戶今日是否能夠獲得指定點數（不超過每日上限）
 * @param {Object} userPoints - 用戶點數記錄
 * @param {number} pointsToAdd - 要添加的點數
 * @param {number} maxPointsPerDay - 每日點數上限
 * @returns {boolean} - 是否可以添加這些點數
 */
function checkDailyPointsLimit(userPoints, pointsToAdd, maxPointsPerDay) {
    if (!maxPointsPerDay || maxPointsPerDay <= 0) {
        return true; // 沒有設定限制
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 查找今日點數記錄
    const todayRecord = userPoints.dailyPointsHistory.find(record => {
        const recordDate = new Date(record.date);
        return recordDate >= today && recordDate < tomorrow;
    });

    const todayEarned = todayRecord ? todayRecord.pointsEarned : 0;
    return (todayEarned + pointsToAdd) <= maxPointsPerDay;
}

/**
 * 記錄用戶今日獲得的點數
 * @param {Object} userPoints - 用戶點數記錄
 * @param {number} points - 獲得的點數
 */
async function recordDailyPoints(userPoints, points) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 查找今日記錄
    const todayRecordIndex = userPoints.dailyPointsHistory.findIndex(record => {
        const recordDate = new Date(record.date);
        return recordDate >= today && recordDate < tomorrow;
    });

    if (todayRecordIndex >= 0) {
        // 更新今日記錄
        userPoints.dailyPointsHistory[todayRecordIndex].pointsEarned += points;
    } else {
        // 創建新的今日記錄
        userPoints.dailyPointsHistory.push({
            date: today,
            pointsEarned: points
        });
    }

    // 清理超過30天的記錄
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    userPoints.dailyPointsHistory = userPoints.dailyPointsHistory.filter(record => {
        return new Date(record.date) >= thirtyDaysAgo;
    });
}

/**
 * 添加點數並記錄有效期
 * @param {Object} userPoints - 用戶點數記錄
 * @param {number} points - 添加的點數
 * @param {number} expireDays - 點數有效天數
 * @param {string} description - 點數來源描述
 */
async function addPointsWithExpiry(userPoints, points, expireDays, description = '獲得點數') {
    const createdAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expireDays);

    // 添加到新的點數系統
    userPoints.points += points;
    
    // 兼容舊系統
    if (userPoints['ah-points'] !== undefined) {
        userPoints['ah-points'] += points;
    }

    // 記錄點數歷史
    userPoints.pointsHistory.push({
        points: points,
        type: 'earned',
        description: description,
        createdAt: createdAt,
        expiresAt: expiresAt
    });
}

/**
 * 清理過期點數
 * @param {Object} userPoints - 用戶點數記錄
 * @returns {number} - 被清理的過期點數總數
 */
function cleanExpiredPoints(userPoints) {
    const now = new Date();
    let expiredPointsTotal = 0;

    // 標記過期點數並計算總數
    userPoints.pointsHistory.forEach(record => {
        if (!record.isExpired && new Date(record.expiredDate) <= now) {
            record.isExpired = true;
            expiredPointsTotal += record.points;
        }
    });

    // 從總點數中扣除過期點數
    if (expiredPointsTotal > 0) {
        userPoints['ah-points'] = Math.max(0, userPoints['ah-points'] - expiredPointsTotal);
    }

    return expiredPointsTotal;
}

/**
 * 獲取用戶有效點數的詳細資訊
 * @param {Object} userPoints - 用戶點數記錄
 * @returns {Object} - 點數詳細資訊
 */
function getPointsDetails(userPoints) {
    const now = new Date();
    let validPoints = 0;
    let expiredPoints = 0;
    let soonToExpire = [];

    userPoints.pointsHistory.forEach(record => {
        if (record.isExpired || new Date(record.expiredDate) <= now) {
            expiredPoints += record.points;
        } else {
            validPoints += record.points;
            
            // 檢查30天內即將過期的點數
            const thirtyDaysLater = new Date();
            thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
            
            if (new Date(record.expiredDate) <= thirtyDaysLater) {
                soonToExpire.push({
                    points: record.points,
                    expiredDate: record.expiredDate
                });
            }
        }
    });

    return {
        totalPoints: userPoints['ah-points'],
        validPoints,
        expiredPoints,
        soonToExpire
    };
}

module.exports = {
    checkDailyPointsLimit,
    recordDailyPoints,
    addPointsWithExpiry,
    cleanExpiredPoints,
    getPointsDetails
}; 
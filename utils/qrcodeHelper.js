const crypto = require('crypto');

/**
 * 生成唯一的QR碼代碼
 * @param {string} slug - 商店slug
 * @param {number} points - 點數
 * @returns {string} - 唯一的QR碼代碼
 */
function generateQRCode(slug, points) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const content = `${slug}-${points}-${timestamp}-${random}`;
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    
    // 取前16個字符作為QR碼，確保唯一性和合理長度
    return hash.substring(0, 16).toUpperCase();
}

/**
 * 生成QR碼網址
 * @param {string} slug - 商店slug
 * @param {string} code - QR碼代碼
 * @returns {string} - 完整的QR碼網址
 */
function generateQRCodeURL(slug, code) {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseURL}/${slug}/points/qr/${code}`;
}

/**
 * 驗證QR碼格式
 * @param {string} code - QR碼代碼
 * @returns {boolean} - 是否有效
 */
function validateQRCode(code) {
    // QR碼應該是16個字符的大寫字母和數字組合
    const qrCodeRegex = /^[A-F0-9]{16}$/;
    return qrCodeRegex.test(code);
}

/**
 * 檢查QR碼是否過期
 * @param {Date} expiresAt - 過期時間
 * @returns {boolean} - 是否過期
 */
function isQRCodeExpired(expiresAt) {
    return new Date() > new Date(expiresAt);
}

/**
 * 計算QR碼過期時間（5分鐘後）
 * @returns {Date} - 過期時間
 */
function calculateExpireTime() {
    const now = new Date();
    return new Date(now.getTime() + 5 * 60 * 1000); // 5分鐘後過期
}

module.exports = {
    generateQRCode,
    generateQRCodeURL,
    validateQRCode,
    isQRCodeExpired,
    calculateExpireTime
}; 
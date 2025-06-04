const nodemailer = require('nodemailer');
const EmailTemplateEngine = require('../utils/emailTemplateEngine');

// 創建SMTP傳輸配置
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// 創建郵件模板引擎實例
const emailEngine = new EmailTemplateEngine();

/**
 * 發送郵件的通用函數
 * @param {string} to - 收件人郵箱
 * @param {string} templateType - 郵件模板類型
 * @param {object} data - 郵件資料
 * @returns {Promise}
 */
async function sendEmail(to, templateType, data) {
    try {
        // 生成郵件HTML和主旨
        const { html, subject } = await emailEngine.generateEmail(templateType, data);

        // 郵件配置
        const mailOptions = {
            from: process.env.SMTP_USER,
            to,
            subject,
            html
        };

        // 發送郵件
        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('發送郵件失敗:', error);
        throw new Error(`郵件發送失敗: ${error.message}`);
    }
}

/**
 * 發送訂位確認郵件
 * @param {string} to - 收件人郵箱
 * @param {object} bookingInfo - 訂位資訊
 */
async function sendBookingConfirmation(to, bookingInfo) {
    return await sendEmail(to, 'booking-confirmation', {
        clientname: bookingInfo.clientname || 'Restaurant',
        logoUrl: bookingInfo.logoUrl,
        date: bookingInfo.date,
        time: bookingInfo.time,
        adults: bookingInfo.adults,
        children: bookingInfo.children,
        bookingId: bookingInfo.bookingId
    });
}

/**
 * 發送取消訂位郵件
 * @param {string} to - 收件人郵箱
 * @param {object} bookingInfo - 訂位資訊
 */
async function sendBookingCancellation(to, bookingInfo) {
    return await sendEmail(to, 'booking-cancellation', {
        clientname: bookingInfo.clientname || 'Restaurant',
        logoUrl: bookingInfo.logoUrl,
        date: bookingInfo.date,
        time: bookingInfo.time,
        bookingId: bookingInfo.bookingId,
        cancelTime: bookingInfo.cancelTime || new Date().toLocaleString('zh-TW')
    });
}

/**
 * 發送密碼重置郵件
 * @param {string} to - 收件人郵箱
 * @param {object} resetInfo - 重置資訊
 */
async function sendPasswordReset(to, resetInfo) {
    return await sendEmail(to, 'password-reset', {
        clientname: resetInfo.clientname || 'Restaurant',
        logoUrl: resetInfo.logoUrl,
        resetUrl: resetInfo.resetUrl,
        expiryTime: resetInfo.expiryTime || 30,
        requestTime: new Date().toLocaleString('zh-TW')
    });
}

/**
 * 發送歡迎郵件
 * @param {string} to - 收件人郵箱
 * @param {object} userInfo - 用戶資訊
 */
async function sendWelcomeEmail(to, userInfo) {
    return await sendEmail(to, 'welcome', {
        clientname: userInfo.clientname || 'Restaurant',
        logoUrl: userInfo.logoUrl,
        userName: userInfo.userName,
        userEmail: to
    });
}

/**
 * 發送用餐提醒郵件
 * @param {string} to - 收件人郵箱
 * @param {object} reminderInfo - 提醒資訊
 */
async function sendBookingReminder(to, reminderInfo) {
    return await sendEmail(to, 'booking-reminder', {
        clientname: reminderInfo.clientname || 'Restaurant',
        logoUrl: reminderInfo.logoUrl,
        date: reminderInfo.date,
        time: reminderInfo.time,
        bookingId: reminderInfo.bookingId
    });
}

/**
 * 測試郵件連接
 */
async function testEmailConnection() {
    try {
        await transporter.verify();
        console.log('郵件服務連接正常');
        return true;
    } catch (error) {
        console.error('郵件服務連接失敗:', error);
        return false;
    }
}

/**
 * 獲取可用的郵件模板類型
 */
function getAvailableEmailTypes() {
    return emailEngine.getAvailableTypes();
}

/**
 * 清除模板快取 (開發環境用)
 */
function clearTemplateCache() {
    emailEngine.clearCache();
    console.log('郵件模板快取已清除');
}

module.exports = {
    sendEmail,
    sendBookingConfirmation,
    sendBookingCancellation,
    sendPasswordReset,
    sendWelcomeEmail,
    sendBookingReminder,
    testEmailConnection,
    getAvailableEmailTypes,
    clearTemplateCache
};
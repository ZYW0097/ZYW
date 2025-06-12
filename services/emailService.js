const nodemailer = require('nodemailer');
const EmailTemplateEngine = require('../utils/emailTemplateEngine');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            service: 'Gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        this.emailEngine = new EmailTemplateEngine();
    }

    /**
     * 檢查郵件服務是否已設定
     */
    isConfigured() {
        return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    }

    /**
     * 發送郵件的通用函數
     */
    async sendEmail(to, templateType, data) {
        if (!this.isConfigured()) {
            console.log('郵件服務未設定，跳過發送');
            return 'not_configured';
        }

        try {
            const { html, subject } = await this.emailEngine.generateEmail(templateType, data);
            
            const mailOptions = {
                from: process.env.SMTP_USER,
                to,
                subject,
                html
            };

            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('郵件發送失敗:', error);
            console.error('錯誤詳情:', error.message);
            return false;
        }
    }

    /**
     * 發送訂位確認郵件
     */
    async sendBookingConfirmation(to, bookingInfo) {
        return await this.sendEmail(to, 'booking-confirmation', {
            clientname: bookingInfo.clientname || 'Restaurant',
            logoUrl: bookingInfo.logoUrl,
            date: bookingInfo.date,
            time: bookingInfo.time,
            adults: bookingInfo.adults,
            children: bookingInfo.children,
            bookingId: bookingInfo.bookingCode || bookingInfo.customBookingId || bookingInfo.bookingId
        });
    }

    /**
     * 發送取消訂位郵件
     */
    async sendBookingCancellation(to, bookingInfo) {
        return await this.sendEmail(to, 'booking-cancellation', {
            clientname: bookingInfo.clientname || 'Restaurant',
            logoUrl: bookingInfo.logoUrl,
            date: bookingInfo.date,
            time: bookingInfo.time,
            bookingId: bookingInfo.bookingCode || bookingInfo.customBookingId || bookingInfo.bookingId,
            cancelTime: new Date().toLocaleString('zh-TW')
        });
    }

    /**
     * 發送用餐提醒郵件
     */
    async sendBookingReminder(to, reminderInfo) {
        return await this.sendEmail(to, 'booking-reminder', {
            clientname: reminderInfo.clientname || 'Restaurant',
            logoUrl: reminderInfo.logoUrl,
            date: reminderInfo.date,
            time: reminderInfo.time,
            adults: reminderInfo.adults,
            children: reminderInfo.children,
            bookingId: reminderInfo.bookingCode || reminderInfo.customBookingId || reminderInfo.bookingId,
            confirmUrl: reminderInfo.confirmUrl,
            cancelUrl: reminderInfo.cancelUrl
        });
    }
}

module.exports = new EmailService();
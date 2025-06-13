const nodemailer = require('nodemailer');
const EmailTemplateEngine = require('../utils/emailTemplateEngine');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
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
     * 處理素食需求文字
     */
    getVegetarianText(vegetarian) {
        if (vegetarian === 'yes' || vegetarian === true || vegetarian === '是') return '是';
        if (vegetarian === 'no' || vegetarian === false || vegetarian === '否') return '否';
        return '否';
    }

    /**
     * 安全處理字串值
     */
    safeString(value, defaultValue = '無') {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }
        const stringValue = String(value).trim();
        return stringValue === '' ? defaultValue : stringValue;
    }

    /**
     * 發送訂位確認郵件
     */
    async sendBookingConfirmation(to, bookingInfo) {
        
        const emailData = {
            clientname: bookingInfo.storeName || bookingInfo.clientname || 'Restaurant',
            customerName: bookingInfo.name || bookingInfo.customerName || '顧客',
            gender: bookingInfo.gender || '先生',
            phone: bookingInfo.phone || '',
            email: bookingInfo.email || to,
            logoUrl: bookingInfo.logoUrl,
            date: bookingInfo.date,
            time: bookingInfo.time,
            adults: bookingInfo.adults || 1,
            children: bookingInfo.children || 0,
            vegetarianRequirement: this.getVegetarianText(bookingInfo.vegetarian),
            specialRequirement: this.safeString(bookingInfo.special || bookingInfo.specialNeeds),
            note: this.safeString(bookingInfo.note || bookingInfo.notes),
            bookingId: bookingInfo.bookingCode || bookingInfo.customBookingId || bookingInfo.bookingId
        };
        
        return await this.sendEmail(to, 'booking-confirmation', emailData);
    }

    /**
     * 發送取消訂位郵件
     */
    async sendBookingCancellation(to, bookingInfo) {
        
        const emailData = {
            clientname: bookingInfo.storeName || bookingInfo.clientname || 'Restaurant',
            customerName: bookingInfo.name || bookingInfo.customerName || '顧客',
            gender: bookingInfo.gender || '先生',
            phone: bookingInfo.phone || '',
            email: bookingInfo.email || to,
            logoUrl: bookingInfo.logoUrl,
            date: bookingInfo.date,
            time: bookingInfo.time,
            adults: bookingInfo.adults || 1,
            children: bookingInfo.children || 0,
            bookingId: bookingInfo.bookingCode || bookingInfo.customBookingId || bookingInfo.bookingId,
            cancelTime: new Date().toLocaleString('zh-TW')
        };

        
        return await this.sendEmail(to, 'booking-cancellation', emailData);
    }

    /**
     * 發送用餐提醒郵件
     */
    async sendBookingReminder(to, reminderInfo) {
        
        const emailData = {
            clientname: reminderInfo.storeName || reminderInfo.clientname || 'Restaurant',
            customerName: reminderInfo.name || reminderInfo.customerName || '顧客',
            gender: reminderInfo.gender || '先生',
            phone: reminderInfo.phone || '',
            email: reminderInfo.email || to,
            logoUrl: reminderInfo.logoUrl,
            date: reminderInfo.date,
            time: reminderInfo.time,
            adults: reminderInfo.adults || 1,
            children: reminderInfo.children || 0,
            bookingId: reminderInfo.bookingCode || reminderInfo.customBookingId || reminderInfo.bookingId,
            confirmUrl: reminderInfo.confirmUrl,
            cancelUrl: reminderInfo.cancelUrl
        };
        
        return await this.sendEmail(to, 'booking-reminder', emailData);
    }
}

module.exports = new EmailService();
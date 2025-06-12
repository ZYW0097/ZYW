const axios = require('axios');
const fs = require('fs');
const path = require('path');

class LineService {
    constructor() {
        this.accessToken = process.env.LINE_BOT_ACCESS_TOKEN;
        this.templates = {};
        this.loadTemplates();
    }

    /**
     * 載入所有 LINE Flex 模板
     */
    loadTemplates() {
        try {
            const templatesPath = path.join(__dirname, '../templates/line');
            const templateFiles = fs.readdirSync(templatesPath);
            
            templateFiles.forEach(file => {
                if (file.endsWith('.json')) {
                    const templateName = file.replace('.json', '');
                    const templatePath = path.join(templatesPath, file);
                    this.templates[templateName] = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
                }
            });
        } catch (error) {
            console.error('載入LINE模板失敗:', error);
            throw error;
        }
    }

    /**
     * 檢查 LINE Bot 是否已設定
     */
    isConfigured() {
        return !!this.accessToken;
    }

    /**
     * 發送 Push Message
     */
    async sendPushMessage(userId, message) {
        if (!this.isConfigured()) {
            console.log('LINE Bot未設定，跳過發送');
            return 'not_configured';
        }

        try {
            const response = await axios.post('https://api.line.me/v2/bot/message/push', {
                to: userId,
                messages: Array.isArray(message) ? message : [message]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return true;
        } catch (error) {
            console.error('LINE訊息發送失敗');
            console.error('錯誤狀態:', error.response?.status);
            console.error('錯誤訊息:', error.response?.data?.message || error.message);
            return false;
        }
    }

    /**
     * 替換模板變數
     */
    replaceTemplateVariables(template, data) {
        let templateStr = JSON.stringify(template);
        
        // 定義變數映射
        const variableMap = {
            '{{storeName}}': data.storeName || '餐廳',
            '{{bookingDate}}': data.date || data.bookingDate || '',
            '{{timeSlot}}': data.time || data.timeSlot || '',
            '{{customerName}}': data.name || data.customerName || '',
            '{{phone}}': data.phone || '',
            '{{email}}': data.email || '',
            '{{partySize}}': `${data.adults ?? 0}大${data.children ?? 0}小`,
            '{{vegetarianRequirement}}': data.vegetarian === 'yes' ? '是' : '否',
            '{{specialRequirement}}': data.special || '無',
            '{{note}}': data.note || data.notes || '無',
            '{{bookingId}}': data.bookingCode || data.customBookingId || data.bookingId || ''
        };

        // 替換所有變數
        Object.entries(variableMap).forEach(([placeholder, value]) => {
            templateStr = templateStr.replace(new RegExp(placeholder, 'g'), value);
        });

        return JSON.parse(templateStr);
    }

    /**
     * 發送訂位成功通知
     */
    async sendBookingConfirmation(lineUserId, reservationData) {
        if (!lineUserId) {
            return 'no_line_id';
        }

        try {
            const template = this.replaceTemplateVariables(
                this.templates['booking-confirmation'], 
                reservationData
            );

            const message = {
                type: 'flex',
                altText: '訂位成功通知',
                contents: template
            };

            return await this.sendPushMessage(lineUserId, message);
        } catch (error) {
            console.error('發送訂位成功通知失敗:', error.message);
            return false;
        }
    }

    /**
     * 發送訂位提醒通知
     */
    async sendBookingReminder(lineUserId, reservationData) {
        if (!lineUserId) {
            return 'no_line_id';
        }

        try {
            const template = this.replaceTemplateVariables(
                this.templates['booking-reminder'], 
                reservationData
            );

            const message = {
                type: 'flex',
                altText: '訂位提醒通知',
                contents: template
            };

            return await this.sendPushMessage(lineUserId, message);
        } catch (error) {
            console.error('發送訂位提醒失敗:', error);
            console.error('錯誤詳情:', error.message);
            return false;
        }
    }

    /**
     * 發送訂位取消通知
     */
    async sendBookingCancellation(lineUserId, reservationData) {
        if (!lineUserId) {
            return 'no_line_id';
        }

        try {
            const template = this.replaceTemplateVariables(
                this.templates['booking-cancellation'], 
                reservationData
            );

            const message = {
                type: 'flex',
                altText: '訂位取消通知',
                contents: template
            };

            return await this.sendPushMessage(lineUserId, message);
        } catch (error) {
            console.error('發送訂位取消通知失敗:', error);
            console.error('錯誤詳情:', error.message);
            return false;
        }
    }
}

module.exports = new LineService(); 
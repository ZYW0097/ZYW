const https = require('https');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class LineService {
    constructor() {
        // LINE 通知機器人設定（用於發送訂位通知）
        this.channelAccessToken = process.env.LINE_BOT_ACCESS_TOKEN;
        
        // LINE API 端點
        this.apiBaseUrl = 'api.line.me';
        
        if (!this.channelAccessToken) {
            console.warn('⚠️  請設定 LINE_BOT_ACCESS_TOKEN 環境變數（通知機器人）');
        }
    }

    /**
     * 檢查 LINE Bot 是否已設定
     */
    isConfigured() {
        return !!this.channelAccessToken;
    }

    /**
     * 載入 LINE 訊息模板
     */
    async loadTemplate(templateName) {
        try {
            const templatePath = path.join(__dirname, '../templates/line', `${templateName}.json`);
            const templateContent = await fs.readFile(templatePath, 'utf8');
            return JSON.parse(templateContent);
        } catch (error) {
            console.error(`載入 LINE 模板失敗 (${templateName}):`, error);
            throw new Error(`無法載入 LINE 訊息模板: ${templateName}`);
        }
    }

    /**
     * 替換模板中的變數 {{變數名}}
     */
    replaceTemplateVariables(template, variables) {
        let templateString = JSON.stringify(template);
        
        // 替換所有 {{變數}} 格式的變數
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            const value = variables[key] || '';
            templateString = templateString.replace(regex, value);
        });
        
        return JSON.parse(templateString);
    }

    /**
     * 發送 HTTP 請求到 LINE API
     */
    async sendLineRequest(path, data) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(data);
            
            const options = {
                hostname: this.apiBaseUrl,
                port: 443,
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': `Bearer ${this.channelAccessToken}`
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            data: responseData
                        });
                    } else {
                        reject({
                            success: false,
                            statusCode: res.statusCode,
                            error: responseData
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject({
                    success: false,
                    error: error.message
                });
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * 發送訂位成功通知
     */
    async sendBookingConfirmation(userId, bookingData) {
        // 檢查是否有 LINE User ID
        if (!userId) {
            console.log('📝 用戶未提供 LINE ID，跳過 LINE 訂位確認通知');
            return 'no_line_id';
        }

        if (!this.isConfigured()) {
            console.warn('⚠️  LINE Bot 未設定，跳過發送通知');
            return false;
        }

        try {
            // 載入訂位成功模板
            const template = await this.loadTemplate('booking-confirmation');
            
            // 準備替換變數
            const variables = {
                'storeName': bookingData.storeName || '餐廳',
                'bookingDate': bookingData.date || '',
                'timeSlot': bookingData.timeSlot || '',
                'customerName': bookingData.customerName || '',
                'phone': bookingData.phone || '',
                'email': bookingData.email || '',
                'partySize': bookingData.partySize || '',
                'vegetarianRequirement': bookingData.vegetarianRequirement || '無',
                'specialRequirement': bookingData.specialRequirement || '無',
                'note': bookingData.note || '無',
                'bookingId': bookingData.bookingId || ''
            };

            // 替換模板變數
            const message = this.replaceTemplateVariables(template, variables);

            // 準備發送的資料
            const requestData = {
                to: userId,
                messages: [{
                    type: 'flex',
                    altText: '訂位成功通知',
                    contents: message
                }]
            };

            // 發送訊息
            await this.sendLineRequest('/v2/bot/message/push', requestData);

            console.log(`LINE 訂位成功通知已發送給用戶: ${userId}`);
            return true;

        } catch (error) {
            console.error('發送 LINE 訂位成功通知失敗:', error);
            return false;
        }
    }

    /**
     * 發送訂位提醒通知
     */
    async sendBookingReminder(userId, bookingData) {
        // 檢查是否有 LINE User ID
        if (!userId) {
            console.log('⏰ 用戶未提供 LINE ID，跳過 LINE 訂位提醒通知');
            return 'no_line_id';
        }

        if (!this.isConfigured()) {
            console.warn('⚠️  LINE Bot 未設定，跳過發送提醒');
            return false;
        }

        try {
            // 載入訂位提醒模板
            const template = await this.loadTemplate('booking-reminder');
            
            // 準備替換變數
            const variables = {
                'storeName': bookingData.storeName || '餐廳',
                'bookingDate': bookingData.date || '',
                'timeSlot': bookingData.timeSlot || '',
                'customerName': bookingData.customerName || '',
                'partySize': bookingData.partySize || '',
                'bookingId': bookingData.bookingId || ''
            };

            // 替換模板變數
            const flexMessage = this.replaceTemplateVariables(template, variables);

            const message = {
                type: 'flex',
                altText: '訂位提醒通知',
                contents: flexMessage
            };

            const requestData = {
                to: userId,
                messages: [message]
            };

            await this.sendLineRequest('/v2/bot/message/push', requestData);
            console.log(`LINE 訂位提醒已發送給用戶: ${userId}`);
            return true;

        } catch (error) {
            console.error('發送 LINE 訂位提醒失敗:', error);
            return false;
        }
    }

    /**
     * 發送訂位取消通知
     */
    async sendBookingCancellation(userId, bookingData) {
        // 檢查是否有 LINE User ID
        if (!userId) {
            console.log('❌ 用戶未提供 LINE ID，跳過 LINE 取消通知');
            return 'no_line_id';
        }

        if (!this.isConfigured()) {
            console.warn('⚠️  LINE Bot 未設定，跳過發送取消通知');
            return false;
        }

        try {
            const message = {
                type: 'text',
                text: `❌ 訂位取消通知\n\n親愛的 ${bookingData.customerName}，您好！\n\n您的訂位已成功取消：\n🏪 餐廳：${bookingData.storeName}\n🗓️ 日期：${bookingData.date}\n🕐 時間：${bookingData.timeSlot}\n🆔 訂位編號：${bookingData.bookingId}\n\n如有任何問題，歡迎聯繫我們。`
            };

            const requestData = {
                to: userId,
                messages: [message]
            };

            await this.sendLineRequest('/v2/bot/message/push', requestData);
            console.log(`LINE 訂位取消通知已發送給用戶: ${userId}`);
            return true;

        } catch (error) {
            console.error('發送 LINE 訂位取消通知失敗:', error);
            return false;
        }
    }

    /**
     * 發送自訂訊息
     */
    async sendCustomMessage(userId, message) {
        if (!this.isConfigured()) {
            console.warn('LINE Bot 未設定，跳過發送訊息');
            return false;
        }

        try {
            const requestData = {
                to: userId,
                messages: [message]
            };

            await this.sendLineRequest('/v2/bot/message/push', requestData);
            console.log(`LINE 自訂訊息已發送給用戶: ${userId}`);
            return true;

        } catch (error) {
            console.error('發送 LINE 自訂訊息失敗:', error);
            return false;
        }
    }

    /**
     * 回覆訊息（用於 Webhook）
     */
    async replyMessage(replyToken, message) {
        if (!this.isConfigured()) {
            console.warn('LINE Bot 未設定，無法回覆訊息');
            return false;
        }

        try {
            const requestData = {
                replyToken: replyToken,
                messages: Array.isArray(message) ? message : [message]
            };

            await this.sendLineRequest('/v2/bot/message/reply', requestData);
            console.log(`LINE 回覆訊息已發送，Reply Token: ${replyToken}`);
            return true;

        } catch (error) {
            console.error('回覆 LINE 訊息失敗:', error);
            return false;
        }
    }
}

module.exports = new LineService(); 
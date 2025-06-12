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
            // 處理 Flex Message 格式
            let messages;
            if (typeof message === 'string') {
                messages = [{ type: 'text', text: message }];
            } else if (Array.isArray(message)) {
                messages = message;
            } else if (message.type === 'flex') {
                // 深拷貝訊息以避免修改原始物件
                const flexMessage = JSON.parse(JSON.stringify(message));
                
                // 移除可能導致錯誤的屬性
                this.cleanFlexMessage(flexMessage);
                
                messages = [flexMessage];
            } else {
                messages = [message];
            }

            const requestData = {
                to: userId,
                messages: messages
            };

            const response = await axios.post('https://api.line.me/v2/bot/message/push', requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            console.log('LINE訊息發送成功');
            return true;
        } catch (error) {
            console.error('LINE訊息發送失敗');
            console.error('錯誤狀態:', error.response?.status);
            console.error('錯誤訊息:', error.response?.data?.message || error.message);
            console.error('完整錯誤回應:', JSON.stringify(error.response?.data, null, 2));
            
            return false;
        }
    }

    /**
     * 清理 Flex Message 中可能有問題的屬性
     */
    cleanFlexMessage(flexMessage) {
        const cleanObject = (obj) => {
            if (Array.isArray(obj)) {
                obj.forEach(item => cleanObject(item));
            } else if (obj && typeof obj === 'object') {
                // 移除 action 中的 color 屬性
                if (obj.action && obj.action.color) {
                    delete obj.action.color;
                }
                
                // 遞迴處理所有子物件
                Object.values(obj).forEach(value => {
                    if (typeof value === 'object') {
                        cleanObject(value);
                    }
                });
            }
        };

        if (flexMessage.contents) {
            cleanObject(flexMessage.contents);
        }
    }

    /**
     * 替換模板變數
     */
    replaceTemplateVariables(template, data) {
        let templateStr = JSON.stringify(template);
        
        // 安全的變數處理函數
        const safeValue = (value, defaultValue = '') => {
            if (value === null || value === undefined) return defaultValue;
            return String(value);
        };
        
        // 處理素食需求
        const vegetarianText = data.vegetarian === 'yes' || data.vegetarian === true || data.vegetarian === '是' ? '是' : '否';
        
        // 處理用餐人數
        const adults = parseInt(data.adults) || 0;
        const children = parseInt(data.children) || 0;
        const partySize = children > 0 ? `${adults}大${children}小` : `${adults}人`;
        
        // 定義變數映射 - 使用 ${} 格式
        const variableMap = {
            '${storeName}': safeValue(data.storeName, '餐廳'),
            '${bookingDate}': safeValue(data.date || data.bookingDate),
            '${timeSlot}': safeValue(data.time || data.timeSlot),
            '${date}': safeValue(data.date || data.bookingDate),
            '${time}': safeValue(data.time || data.timeSlot),
            '${customerName}': safeValue(data.name || data.customerName),
            '${maskedName}': safeValue(data.maskedName || data.name || data.customerName),
            '${phone}': safeValue(data.phone),
            '${maskedPhone}': safeValue(data.maskedPhone || data.phone),
            '${email}': safeValue(data.email),
            '${partySize}': partySize,
            '${vegetarianRequirement}': vegetarianText,
            '${specialRequirement}': safeValue(data.special || data.specialNeeds, '無'),
            '${note}': safeValue(data.note || data.notes, '無'),
            '${bookingId}': safeValue(data.bookingCode || data.customBookingId || data.bookingId)
        };

        // 替換所有變數
        Object.entries(variableMap).forEach(([placeholder, value]) => {
            templateStr = templateStr.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        });

        try {
            const result = JSON.parse(templateStr);
            
            // 檢查是否還有未替換的變數
            const unreplacedVars = templateStr.match(/\$\{[^}]+\}/g);
            if (unreplacedVars) {
                console.warn('發現未替換的變數:', unreplacedVars);
            }
            
            return result;
        } catch (parseError) {
            console.error('模板解析失敗:', parseError.message);
            console.error('處理後的模板:', templateStr.substring(0, 500));
            throw parseError;
        }
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
            console.error('錯誤堆疊:', error.stack);
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
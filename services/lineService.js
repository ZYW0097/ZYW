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
            console.log('準備發送LINE訊息到:', userId);
            console.log('訊息類型:', message.type);
            
            const response = await axios.post('https://api.line.me/v2/bot/message/push', {
                to: userId,
                messages: Array.isArray(message) ? message : [message]
            }, {
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
            
            // 如果有詳細錯誤資訊，也輸出
            if (error.response?.data?.details) {
                console.error('錯誤詳情:', JSON.stringify(error.response.data.details, null, 2));
            }
            
            return false;
        }
    }

    /**
     * 替換模板變數
     */
    replaceTemplateVariables(template, data) {
        console.log('🔧 開始替換模板變數，輸入資料:', JSON.stringify(data, null, 2));
        
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
        
        // 定義變數映射
        const variableMap = {
            '{{storeName}}': safeValue(data.storeName, '餐廳'),
            '{{bookingDate}}': safeValue(data.date || data.bookingDate),
            '{{timeSlot}}': safeValue(data.time || data.timeSlot),
            '{{customerName}}': safeValue(data.name || data.customerName),
            '{{phone}}': safeValue(data.phone),
            '{{email}}': safeValue(data.email),
            '{{partySize}}': partySize,
            '{{vegetarianRequirement}}': vegetarianText,
            '{{specialRequirement}}': safeValue(data.special || data.specialNeeds, '無'),
            '{{note}}': safeValue(data.note || data.notes, '無'),
            '{{bookingId}}': safeValue(data.bookingCode || data.customBookingId || data.bookingId)
        };

        console.log('🔧 變數映射表:', JSON.stringify(variableMap, null, 2));

        // 替換所有變數
        Object.entries(variableMap).forEach(([placeholder, value]) => {
            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedPlaceholder, 'g');
            const beforeCount = (templateStr.match(regex) || []).length;
            templateStr = templateStr.replace(regex, value);
            const afterCount = (templateStr.match(regex) || []).length;
            
            if (beforeCount > 0) {
                console.log(`🔧 替換 ${placeholder}: ${beforeCount} -> ${afterCount} (值: "${value}")`);
            }
        });

        try {
            const result = JSON.parse(templateStr);
            
            // 檢查是否還有未替換的變數
            const unreplacedVars = templateStr.match(/\{\{[^}]+\}\}/g);
            if (unreplacedVars) {
                console.warn('⚠️  發現未替換的變數:', unreplacedVars);
            } else {
                console.log('✅ 所有變數替換完成');
            }
            
            return result;
        } catch (parseError) {
            console.error('❌ 模板解析失敗:', parseError.message);
            console.error('❌ 處理後的模板(前1000字元):', templateStr.substring(0, 1000));
            throw parseError;
        }
    }

    /**
     * 發送訂位成功通知
     */
    async sendBookingConfirmation(lineUserId, reservationData) {
        if (!lineUserId) {
            console.log('沒有LINE用戶ID，跳過發送');
            return 'no_line_id';
        }

        try {
            console.log('準備發送訂位成功通知到:', lineUserId);
            console.log('訂位資料:', JSON.stringify(reservationData, null, 2));
            
            console.log('📝 開始模板變數替換...');
            const template = this.replaceTemplateVariables(
                this.templates['booking-confirmation'], 
                reservationData
            );
            console.log('📝 模板替換完成');

            const message = {
                type: 'flex',
                altText: '訂位成功通知',
                contents: template
            };

            // 檢查最終的 message 結構
            console.log('📱 最終 Flex Message (前500字元):', JSON.stringify(message, null, 2).substring(0, 500));
            
            // 檢查 message 大小
            const messageSize = JSON.stringify(message).length;
            console.log('📱 Flex Message 大小:', messageSize, 'bytes');
            
            if (messageSize > 50000) {
                console.error('❌ Flex Message 過大，超過 LINE 限制');
                return false;
            }

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
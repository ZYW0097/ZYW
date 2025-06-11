const axios = require('axios');

class LineService {
    constructor() {
        this.accessToken = process.env.LINE_BOT_ACCESS_TOKEN;
    }

    /**
     * 檢查 LINE Bot 是否已設定
     */
    isConfigured() {
        return !!this.accessToken;
    }

    /**
     * 發送 LINE HTTP 請求的通用方法
     */
    async sendLineRequest(endpoint, data, method = 'POST') {
        if (!this.isConfigured()) {
            throw new Error('LINE Bot 未設定');
        }

        try {
            console.log(`📤 發送 LINE API 請求: ${method} ${endpoint}`);
            console.log('📄 請求資料:', JSON.stringify(data, null, 2));

            const response = await axios({
                method: method,
                url: `https://api.line.me${endpoint}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                data: data
            });

            console.log('✅ LINE API 請求成功');
            console.log('📥 回應狀態:', response.status);
            console.log('📥 回應內容:', response.data);

            return response.data;

        } catch (error) {
            console.error('❌ LINE API 請求失敗:');
            console.error('錯誤狀態碼:', error.response?.status);
            console.error('錯誤訊息:', error.response?.statusText);
            console.error('錯誤內容:', error.response?.data);
            throw error;
        }
    }

    /**
     * 發送 Push Message
     */
    async sendPushMessage(userId, message) {
        const requestData = {
            to: userId,
            messages: Array.isArray(message) ? message : [message]
        };

        return await this.sendLineRequest('/v2/bot/message/push', requestData);
    }

    /**
     * 發送訂位成功通知
     */
    async sendBookingConfirmation(lineUserId, reservationData) {
        if (!lineUserId) {
            console.log('📝 用戶未提供 LINE ID，跳過 LINE 通知');
            return 'no_line_id';
        }

        if (!this.isConfigured()) {
            console.warn('⚠️  LINE Bot 未設定，跳過發送通知');
            return 'not_configured';
        }

        try {
            console.log(`📱 發送 LINE 訂位成功通知給用戶: ${lineUserId}`);

            // 建立訂位成功通知訊息
            const message = {
                type: 'text',
                text: `✅ 訂位成功通知\n\n親愛的 ${reservationData.name}，您好！\n\n您的訂位已確認：\n🗓️ 日期：${reservationData.date}\n🕐 時間：${reservationData.time}\n👥 人數：${reservationData.adults}大${reservationData.children}小\n🍽️ 素食：${reservationData.vegetarian}\n📝 特殊需求：${reservationData.specialNeeds || '無'}\n📝 備註：${reservationData.notes || '無'}\n🆔 訂位代碼：${reservationData.bookingCode}\n\n期待您的光臨！\n\n芝麻柚子 とんかつ\n電話：03 558 7360\n地址：新竹縣竹北市光明一路490號`
            };

            await this.sendPushMessage(lineUserId, message);
            console.log(`✅ LINE 訂位成功通知已發送`);
            return true;

        } catch (error) {
            console.error('❌ 發送 LINE 訂位成功通知失敗:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * 發送訂位提醒通知
     */
    async sendBookingReminder(lineUserId, reservationData) {
        if (!lineUserId) {
            console.log('⏰ 用戶未提供 LINE ID，跳過 LINE 提醒通知');
            return 'no_line_id';
        }

        if (!this.isConfigured()) {
            console.warn('⚠️  LINE Bot 未設定，跳過發送提醒');
            return 'not_configured';
        }

        try {
            console.log(`📱 發送 LINE 訂位提醒給用戶: ${lineUserId}`);

            const message = {
                type: 'text',
                text: `⏰ 訂位提醒通知\n\n親愛的 ${reservationData.name}，您好！\n\n提醒您即將到來的訂位：\n🗓️ 日期：${reservationData.date}\n🕐 時間：${reservationData.time}\n👥 人數：${reservationData.adults}大${reservationData.children}小\n🆔 訂位代碼：${reservationData.bookingCode}\n\n請準時前往，期待您的光臨！\n\n芝麻柚子 とんかつ\n電話：03 558 7360\n地址：新竹縣竹北市光明一路490號`
            };

            await this.sendPushMessage(lineUserId, message);
            console.log(`✅ LINE 訂位提醒已發送`);
            return true;

        } catch (error) {
            console.error('❌ 發送 LINE 訂位提醒失敗:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * 發送訂位取消通知
     */
    async sendBookingCancellation(lineUserId, reservationData) {
        if (!lineUserId) {
            console.log('❌ 用戶未提供 LINE ID，跳過 LINE 取消通知');
            return 'no_line_id';
        }

        if (!this.isConfigured()) {
            console.warn('⚠️  LINE Bot 未設定，跳過發送取消通知');
            return 'not_configured';
        }

        try {
            console.log(`📱 發送 LINE 訂位取消通知給用戶: ${lineUserId}`);

            const message = {
                type: 'text',
                text: `❌ 訂位取消通知\n\n親愛的 ${reservationData.name}，您好！\n\n您的訂位已成功取消：\n🗓️ 日期：${reservationData.date}\n🕐 時間：${reservationData.time}\n🆔 訂位代碼：${reservationData.bookingCode}\n\n如有任何問題，歡迎聯繫我們。\n\n芝麻柚子 とんかつ\n電話：03 558 7360\n地址：新竹縣竹北市光明一路490號`
            };

            await this.sendPushMessage(lineUserId, message);
            console.log(`✅ LINE 訂位取消通知已發送`);
            return true;

        } catch (error) {
            console.error('❌ 發送 LINE 訂位取消通知失敗:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * 發送入座通知
     */
    async sendSeatedNotification(lineUserId, reservationData) {
        if (!lineUserId) {
            console.log('📍 用戶未提供 LINE ID，跳過 LINE 入座通知');
            return 'no_line_id';
        }

        if (!this.isConfigured()) {
            console.warn('⚠️  LINE Bot 未設定，跳過發送入座通知');
            return 'not_configured';
        }

        try {
            console.log(`📱 發送 LINE 入座通知給用戶: ${lineUserId}`);

            const seatedTime = new Intl.DateTimeFormat('zh-TW', {
                timeZone: 'Asia/Taipei',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date());

            const message = {
                type: 'text',
                text: `🍽️ 入座通知\n\n親愛的 ${reservationData.name}，您好！\n\n您已成功入座\n🕐 入座時間：${seatedTime}\n\n祝您用餐愉快！\n\n芝麻柚子 とんかつ`
            };

            await this.sendPushMessage(lineUserId, message);
            console.log(`✅ LINE 入座通知已發送`);
            return true;

        } catch (error) {
            console.error('❌ 發送 LINE 入座通知失敗:', error.response?.data || error.message);
            return false;
        }
    }
}

module.exports = new LineService(); 
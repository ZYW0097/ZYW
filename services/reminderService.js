const Client = require('../models/Client');
const reservationSchema = require('../models/Reservation');
const getClientDb = require('../utils/dbManager');
const lineService = require('./lineService');
const emailService = require('./emailService');

class ReminderService {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.lastCheckTime = null;
    }

    /**
     * 啟動提醒服務
     */
    start() {
        if (this.isRunning) {
            console.log('提醒服務已在運行中');
            return;
        }

        try {
            // 伺服器啟動時先執行一次檢查
            this.checkAndSendReminders();
            
            // 設定每30分鐘檢查一次
            this.intervalId = setInterval(() => {
                this.checkAndSendReminders();
            }, 30 * 60 * 1000); // 30分鐘

            this.isRunning = true;
            console.log('提醒服務已啟動，每30分鐘檢查一次');
        } catch (error) {
            console.error('啟動提醒服務失敗:', error);
            console.error('錯誤詳情:', error.message);
            this.isRunning = false;
        }
    }

    /**
     * 停止提醒服務
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('提醒服務已停止');
    }

    // 檢查是否在提醒時間範圍內（中午12:00-13:00）GMT
    isReminderTime() {
        const now = new Date();
        const hour = now.getHours();
        return hour >= 4 && hour < 5;
    }

    /**
     * 檢查並發送提醒
     */
    async checkAndSendReminders() {
        this.lastCheckTime = new Date();
        
        if (!this.isReminderTime()) {
            console.log('非提醒時間，跳過檢查');
            return;
        }

        console.log('開始檢查訂位提醒');

        try {
            const clients = await Client.find({});
            
            for (const client of clients) {
                await this.processClientReminders(client);
            }
        } catch (error) {
            console.error('提醒檢查失敗:', error);
            console.error('錯誤詳情:', error.message);
        }
    }

    /**
     * 處理單一客戶的提醒
     */
    async processClientReminders(client) {
        try {
            const { slugname, clientname } = client;
            const db = getClientDb(slugname, 'BDB');
            const Reservation = db.model('Reservation', reservationSchema);

            // 計算明天的日期
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const targetDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD格式

            // 查找明天的所有確認訂位
            const reservations = await Reservation.find({
                date: targetDate,
                status: 'confirmed',
                $or: [
                    { email: { $exists: true, $ne: '' } },
                    { lineUserId: { $exists: true, $ne: '' } }
                ],
                reminderSent: { $ne: true }
            });

            console.log(`找到 ${reservations.length} 筆 ${clientname} 的訂位需要提醒`);

            for (const reservation of reservations) {
                await this.sendReminder(reservation, client);
            }

        } catch (error) {
            console.error(`處理 ${client.clientname} 提醒失敗:`, error);
            console.error('錯誤詳情:', error.message);
        }
    }

    /**
     * 發送提醒通知
     */
    async sendReminder(reservation, client) {
        try {
            const { customBookingId, email, lineUserId, date, time, adults, children, name, gender, phone, vegetarian, special, note } = reservation;
            const { clientname } = client;

            const reminderData = {
                name,
                customerName: name,
                gender: gender || '先生',
                phone: phone || '',
                email: email || '',
                date,
                time,
                adults: adults || 1,
                children: children || 0,
                vegetarian: vegetarian || 'no',
                special: special || '',
                note: note || '',
                bookingCode: customBookingId,
                storeName: clientname,
                clientname
            };

            let emailResult = false;
            let lineResult = false;

            // 發送郵件提醒（如果有email）
            if (email) {
                emailResult = await emailService.sendBookingReminder(email, reminderData);
            }

            // 發送LINE提醒（如果有lineUserId）
            if (lineUserId) {
                lineResult = await lineService.sendBookingReminder(lineUserId, reminderData);
            }

            // 如果任一方式成功，標記為已發送
            if (emailResult || lineResult) {
                await reservation.updateOne({
                    reminderSent: true,
                    reminderSentAt: new Date()
                });
                console.log(`提醒發送成功 - 訂位 ${customBookingId}`);
            } else {
                console.log(`提醒發送失敗 - 訂位 ${customBookingId}`);
            }

        } catch (error) {
            console.error(`發送提醒失敗 - 訂位 ${reservation.customBookingId}:`, error);
            console.error('錯誤詳情:', error.message);
        }
    }

    /**
     * 手動觸發檢查（用於測試）
     */
    async triggerCheck() {
        console.log('手動觸發提醒檢查');
        await this.checkAndSendReminders();
    }

    /**
     * 獲取服務狀態
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastCheck: this.lastCheckTime,
            checkInterval: '30分鐘',
            reminderTime: '每天中午12:00-13:00',
            currentTime: new Date().toISOString(),
            isCurrentlyReminderTime: this.isReminderTime()
        };
    }
}

module.exports = new ReminderService(); 
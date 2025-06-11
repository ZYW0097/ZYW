const cron = require('node-cron');
const Client = require('../models/Client');
const reservationSchema = require('../models/Reservation');
const getClientDb = require('../utils/dbManager');
const notificationService = require('./notificationService');

class ReminderService {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
        this.lastCheckTime = null;
    }

    // 啟動提醒服務
    start() {
        if (this.isRunning) {
            console.log('Reminder service is already running');
            return;
        }

        try {
            console.log('Creating cron job...');
            // 每小時檢查一次是否有需要發送提醒的訂位
            this.cronJob = cron.schedule('0 * * * *', async () => {
                console.log('Running booking reminder check...');
                this.lastCheckTime = new Date();
                await this.checkAndSendReminders();
            }, {
                scheduled: false
            });

            console.log('Starting cron job...');
            this.cronJob.start();
            this.isRunning = true;
            console.log('Booking reminder service started successfully - checking every hour');
        } catch (error) {
            console.error('Error starting reminder service:', error);
            this.isRunning = false;
        }
    }

    // 停止提醒服務
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }
        this.isRunning = false;
        console.log('Booking reminder service stopped');
    }

    // 檢查並發送提醒
    async checkAndSendReminders() {
        try {
            // 獲取所有客戶
            const clients = await Client.find({});
            
            for (const client of clients) {
                await this.processClientReminders(client);
            }
        } catch (error) {
            console.error('Error in reminder check:', error);
        }
    }

    // 處理單一客戶的提醒
    async processClientReminders(client) {
        try {
            const { slugname, clientname } = client;
            const db = getClientDb(slugname, 'BDB');
            const Reservation = db.model('Reservation', reservationSchema);

            // 計算12小時後的時間範圍 (放寬到40分鐘窗口以配合20分鐘檢查間隔)
            const now = new Date();
            const targetTime = new Date(now.getTime() + (12 * 60 * 60 * 1000)); // 12小時後
            const startWindow = new Date(targetTime.getTime() - (40 * 60 * 1000)); // 提前40分鐘
            const endWindow = new Date(targetTime.getTime() + (40 * 60 * 1000)); // 延後40分鐘
            
            const targetDate = targetTime.toISOString().split('T')[0];
            const startTime = this.formatTime(startWindow);
            const endTime = this.formatTime(endWindow);

            // 查找需要發送提醒的訂位（只要有 email 或 lineUserId 即可）
            const reservations = await Reservation.find({
                date: targetDate,
                time: { $gte: startTime, $lte: endTime },
                status: 'confirmed',
                $or: [
                    { email: { $exists: true, $ne: '' } },
                    { lineUserId: { $exists: true, $ne: '' } }
                ],
                reminderSent: { $ne: true } // 尚未發送提醒
            });

            console.log(`Found ${reservations.length} reservations for ${clientname} requiring reminders`);

            // 發送提醒通知（郵件 + LINE）
            for (const reservation of reservations) {
                await this.sendReminder(reservation, client);
            }

        } catch (error) {
            console.error(`Error processing reminders for ${client.clientname}:`, error);
        }
    }

    // 發送提醒通知（郵件 + LINE）
    async sendReminder(reservation, client) {
        try {
            const { customBookingId, email, lineUserId, date, time, adults, children } = reservation;
            const { slugname, clientname } = client;

            console.log(`發送提醒 - 訂位 ${customBookingId}:`, {
                email: !!email,
                lineUserId: !!lineUserId
            });

            // 準備提醒資料
            const reminderData = {
                ...reservation.toObject(),
                storeName: clientname,
                customBookingId,
                email,
                lineUserId,
                date,
                time,
                adults: adults || 1,
                children: children || 0
            };

            // 使用通知服務發送提醒
            const results = await notificationService.sendBookingReminder(reminderData);

            // 記錄通知狀態
            await notificationService.logNotificationStatus(customBookingId, 'reminder', results);

            // 標記為已發送提醒（只要有任一方式成功即可）
            if (results.success) {
                await reservation.updateOne({
                    reminderSent: true,
                    reminderSentAt: new Date()
                });
                console.log(`✅ 提醒成功發送 - 訂位 ${customBookingId}`);
            } else {
                console.log(`⚠️  提醒發送失敗 - 訂位 ${customBookingId}:`, results);
            }

        } catch (error) {
            console.error(`❌ 發送提醒失敗 - 訂位 ${reservation.customBookingId}:`, error);
        }
    }

    // 格式化時間（HH:MM）
    formatTime(date) {
        return date.toTimeString().substring(0, 5);
    }

    // 手動觸發檢查（用於測試）
    async triggerCheck() {
        console.log('Manually triggering reminder check...');
        this.lastCheckTime = new Date();
        await this.checkAndSendReminders();
    }

    // 獲取服務狀態
    getStatus() {
        return {
            isRunning: this.isRunning,
            cronExpression: this.isRunning ? '0 * * * * (內部每小時執行，外部20分鐘檢查)' : null,
            lastCheck: this.lastCheckTime || null,
            cronJobExists: !!this.cronJob,
            nodeVersion: process.version,
            uptime: process.uptime(),
            timeWindow: '12小時前 ±40分鐘'
        };
    }

    // 檢查和修復服務
    checkAndRepair() {
        console.log('Checking reminder service health...');
        
        if (!this.isRunning || !this.cronJob) {
            console.log('Service appears to be stopped, attempting to restart...');
            this.stop();
            this.start();
        } else {
            console.log('Service appears to be running normally');
        }
        
        return this.getStatus();
    }
}

// 創建單一實例
const reminderService = new ReminderService();

module.exports = reminderService; 
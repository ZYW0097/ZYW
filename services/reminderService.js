const cron = require('node-cron');
const Client = require('../models/Client');
const reservationSchema = require('../models/Reservation');
const getClientDb = require('../utils/dbManager');
const { sendBookingReminder } = require('./emailService');

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

            // 查找需要發送提醒的訂位
            const reservations = await Reservation.find({
                date: targetDate,
                time: { $gte: startTime, $lte: endTime },
                status: 'confirmed',
                email: { $exists: true, $ne: '' },
                reminderSent: { $ne: true } // 尚未發送提醒
            });

            console.log(`Found ${reservations.length} reservations for ${clientname} requiring reminders`);

            // 發送提醒郵件
            for (const reservation of reservations) {
                await this.sendReminderEmail(reservation, client);
            }

        } catch (error) {
            console.error(`Error processing reminders for ${client.clientname}:`, error);
        }
    }

    // 發送提醒郵件
    async sendReminderEmail(reservation, client) {
        try {
            const { customBookingId, email, date, time, adults, children } = reservation;
            const { slugname, clientname } = client;

            // 生成token（用於確認/取消連結）
            const timestamp = Date.now();
            const tokenData = `${customBookingId}_${slugname}_${timestamp}`;
            const token = Buffer.from(tokenData).toString('base64');

            // 構建確認和取消連結
            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
            const confirmUrl = `${baseUrl}/booking-reminder/confirm/${token}`;
            const cancelUrl = `${baseUrl}/booking-reminder/cancel/${token}`;
            const logoUrl = `${baseUrl}/images/dineplus.png`;

            // 發送提醒郵件
            await sendBookingReminder(email, {
                clientname,
                logoUrl,
                date,
                time,
                adults: adults || 1,
                children: children || 0,
                bookingId: customBookingId,
                confirmUrl,
                cancelUrl
            });

            // 標記為已發送提醒
            await reservation.updateOne({
                reminderSent: true,
                reminderSentAt: new Date()
            });

            console.log(`Reminder sent for booking ${customBookingId} to ${email}`);

        } catch (error) {
            console.error(`Error sending reminder for booking ${reservation.customBookingId}:`, error);
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
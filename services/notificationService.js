const emailService = require('./emailService');
const lineService = require('./lineService');
const getClientDb = require('../utils/dbManager');
const userSchema = require('../models/user');

class NotificationService {

    /**
     * 發送訂位成功通知（郵件 + LINE）
     */
    async sendBookingConfirmation(reservationData) {
        const results = {
            email: null,
            line: null,
            success: false
        };

        try {
            // 使用訂位記錄中的 lineUserId
            const lineUserId = reservationData.lineUserId;
            if (lineUserId) {
                console.log(`📱 使用訂位記錄中的 LINE ID:`, lineUserId);
            }
            // 準備通知資料
            const notificationData = {
                storeName: reservationData.storeName || '餐廳',
                date: reservationData.date,
                timeSlot: reservationData.time,
                customerName: reservationData.name,
                phone: reservationData.phone,
                email: reservationData.email,
                partySize: (reservationData.adults || 0) + (reservationData.children || 0) || reservationData.guests,
                vegetarianRequirement: reservationData.vegetarian === 'yes' ? '有素食需求' : '無',
                specialRequirement: reservationData.special || '無',
                note: reservationData.note || '無',
                bookingId: reservationData.customBookingId
            };

            // 發送郵件通知
            if (reservationData.email) {
                try {
                    results.email = await emailService.sendBookingConfirmation(
                        reservationData.email,
                        notificationData
                    );
                    console.log('✅ 郵件通知發送結果:', results.email ? '成功' : '失敗');
                } catch (error) {
                    console.error('❌ 郵件通知發送失敗:', error.message);
                    results.email = false;
                }
            } else {
                console.log('📧 無郵件地址，跳過郵件通知');
                results.email = 'no_email';
            }

            // 發送 LINE 通知
            if (lineUserId) {
                try {
                    results.line = await lineService.sendBookingConfirmation(
                        lineUserId,
                        notificationData
                    );
                    console.log('✅ LINE 通知發送結果:', results.line === true ? '成功' : results.line);
                } catch (error) {
                    console.error('❌ LINE 通知發送失敗:', error.message);
                    results.line = false;
                }
            } else {
                console.log('📱 用戶未登入或無 LINE ID，跳過 LINE 通知');
                results.line = 'no_line_id';
            }

            // 判斷整體成功
            results.success = results.email === true || results.line === true;

            return results;

        } catch (error) {
            console.error('❌ 發送訂位確認通知時發生錯誤:', error);
            return {
                email: false,
                line: false,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 發送訂位提醒通知（郵件 + LINE）
     */
    async sendBookingReminder(reservationData) {
        const results = {
            email: null,
            line: null,
            success: false
        };

        try {
            // 使用訂位記錄中的 lineUserId
            const lineUserId = reservationData.lineUserId;
            if (lineUserId) {
                console.log(`📱 使用訂位記錄中的 LINE ID:`, lineUserId);
            }

            // 準備通知資料
            const notificationData = {
                storeName: reservationData.storeName || '餐廳',
                date: reservationData.date,
                timeSlot: reservationData.time,
                customerName: reservationData.name,
                phone: reservationData.phone,
                email: reservationData.email,
                partySize: (reservationData.adults || 0) + (reservationData.children || 0) || reservationData.guests,
                bookingId: reservationData.customBookingId
            };

            // 發送郵件提醒
            if (reservationData.email) {
                try {
                    // 這裡可以添加郵件提醒功能
                    console.log('📧 郵件提醒功能待實現');
                    results.email = 'not_implemented';
                } catch (error) {
                    console.error('❌ 郵件提醒發送失敗:', error.message);
                    results.email = false;
                }
            } else {
                results.email = 'no_email';
            }

            // 發送 LINE 提醒
            if (lineUserId) {
                try {
                    results.line = await lineService.sendBookingReminder(
                        lineUserId,
                        notificationData
                    );
                    console.log('✅ LINE 提醒發送結果:', results.line === true ? '成功' : results.line);
                } catch (error) {
                    console.error('❌ LINE 提醒發送失敗:', error.message);
                    results.line = false;
                }
            } else {
                console.log('📱 用戶未登入或無 LINE ID，跳過 LINE 提醒');
                results.line = 'no_line_id';
            }

            // 判斷整體成功
            results.success = results.line === true; // 目前主要依賴 LINE 提醒

            return results;

        } catch (error) {
            console.error('❌ 發送訂位提醒通知時發生錯誤:', error);
            return {
                email: false,
                line: false,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 發送訂位取消通知（郵件 + LINE）
     */
    async sendBookingCancellation(reservationData, reason = '') {
        const results = {
            email: null,
            line: null,
            success: false
        };

        try {
            // 使用訂位記錄中的 lineUserId
            const lineUserId = reservationData.lineUserId;
            if (lineUserId) {
                console.log(`📱 使用訂位記錄中的 LINE ID:`, lineUserId);
            }

            // 準備通知資料
            const notificationData = {
                storeName: reservationData.storeName || '餐廳',
                date: reservationData.date,
                timeSlot: reservationData.time,
                customerName: reservationData.name,
                bookingId: reservationData.customBookingId,
                reason: reason
            };

            // 發送郵件通知
            if (reservationData.email) {
                try {
                    // 這裡可以添加郵件取消通知功能
                    console.log('📧 郵件取消通知功能待實現');
                    results.email = 'not_implemented';
                } catch (error) {
                    console.error('❌ 郵件取消通知發送失敗:', error.message);
                    results.email = false;
                }
            } else {
                results.email = 'no_email';
            }

            // 發送 LINE 通知
            if (lineUserId) {
                try {
                    results.line = await lineService.sendBookingCancellation(
                        lineUserId,
                        notificationData
                    );
                    console.log('✅ LINE 取消通知發送結果:', results.line === true ? '成功' : results.line);
                } catch (error) {
                    console.error('❌ LINE 取消通知發送失敗:', error.message);
                    results.line = false;
                }
            } else {
                console.log('📱 用戶未登入或無 LINE ID，跳過 LINE 取消通知');
                results.line = 'no_line_id';
            }

            // 判斷整體成功
            results.success = results.line === true;

            return results;

        } catch (error) {
            console.error('❌ 發送訂位取消通知時發生錯誤:', error);
            return {
                email: false,
                line: false,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 記錄通知發送狀態到資料庫
     */
    async logNotificationStatus(reservationId, type, results) {
        try {
            // 這裡可以添加記錄邏輯到資料庫
            console.log(`📝 通知記錄 [${type}] - 訂位 ${reservationId}:`, {
                email: results.email,
                line: results.line,
                success: results.success
            });
        } catch (error) {
            console.error('❌ 記錄通知狀態失敗:', error);
        }
    }
}

module.exports = new NotificationService(); 
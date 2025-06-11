const emailService = require('./emailService');
const lineService = require('./lineService');

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
            console.log('📝 開始發送訂位確認通知...');

            // 發送郵件通知
            if (reservationData.email) {
                try {
                    console.log('📧 發送郵件通知...');
                    results.email = await emailService.sendBookingConfirmation(
                        reservationData.email,
                        reservationData
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
            if (reservationData.lineUserId) {
                try {
                    console.log('📱 發送 LINE 通知...');
                    results.line = await lineService.sendBookingConfirmation(
                        reservationData.lineUserId,
                        reservationData
                    );
                    console.log('✅ LINE 通知發送結果:', results.line);
                } catch (error) {
                    console.error('❌ LINE 通知發送失敗:', error.message);
                    results.line = false;
                }
            } else {
                console.log('📱 無 LINE ID，跳過 LINE 通知');
                results.line = 'no_line_id';
            }

            // 判斷整體成功
            results.success = results.email === true || results.line === true;
            console.log('📋 訂位確認通知發送完成:', results);

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
            console.log('⏰ 開始發送訂位提醒通知...');

            // 發送郵件提醒
            if (reservationData.email) {
                try {
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
            if (reservationData.lineUserId) {
                try {
                    console.log('📱 發送 LINE 提醒...');
                    results.line = await lineService.sendBookingReminder(
                        reservationData.lineUserId,
                        reservationData
                    );
                    console.log('✅ LINE 提醒發送結果:', results.line);
                } catch (error) {
                    console.error('❌ LINE 提醒發送失敗:', error.message);
                    results.line = false;
                }
            } else {
                console.log('📱 無 LINE ID，跳過 LINE 提醒');
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
            console.log('❌ 開始發送訂位取消通知...');

            // 發送郵件通知
            if (reservationData.email) {
                try {
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
            if (reservationData.lineUserId) {
                try {
                    console.log('📱 發送 LINE 取消通知...');
                    // 添加取消原因到訂位資料
                    const notificationData = {
                        ...reservationData,
                        cancelReason: reason
                    };
                    
                    results.line = await lineService.sendBookingCancellation(
                        reservationData.lineUserId,
                        notificationData
                    );
                    console.log('✅ LINE 取消通知發送結果:', results.line);
                } catch (error) {
                    console.error('❌ LINE 取消通知發送失敗:', error.message);
                    results.line = false;
                }
            } else {
                console.log('📱 無 LINE ID，跳過 LINE 取消通知');
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
     * 發送入座通知（郵件 + LINE）
     */
    async sendSeatedNotification(reservationData) {
        const results = {
            email: null,
            line: null,
            success: false
        };

        try {
            console.log('🍽️ 開始發送入座通知...');

            // 發送郵件通知
            if (reservationData.email) {
                try {
                    console.log('📧 郵件入座通知功能待實現');
                    results.email = 'not_implemented';
                } catch (error) {
                    console.error('❌ 郵件入座通知發送失敗:', error.message);
                    results.email = false;
                }
            } else {
                results.email = 'no_email';
            }

            // 發送 LINE 通知
            if (reservationData.lineUserId) {
                try {
                    console.log('📱 發送 LINE 入座通知...');
                    results.line = await lineService.sendSeatedNotification(
                        reservationData.lineUserId,
                        reservationData
                    );
                    console.log('✅ LINE 入座通知發送結果:', results.line);
                } catch (error) {
                    console.error('❌ LINE 入座通知發送失敗:', error.message);
                    results.line = false;
                }
            } else {
                console.log('📱 無 LINE ID，跳過 LINE 入座通知');
                results.line = 'no_line_id';
            }

            // 判斷整體成功
            results.success = results.line === true;

            return results;

        } catch (error) {
            console.error('❌ 發送入座通知時發生錯誤:', error);
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
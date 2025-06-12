const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const reservationSchema = require('../models/Reservation');
const getClientDb = require('../utils/dbManager');
const emailService = require('../services/emailService');
const lineService = require('../services/lineService');

// 確認訂位（用戶點擊郵件中的確認連結）
router.get('/confirm/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        // 解析token（格式：bookingId_storeSlug_timestamp）
        const [bookingId, storeSlug, timestamp] = Buffer.from(token, 'base64').toString().split('_');
        
        // 驗證token是否過期（24小時有效期）
        const tokenTime = parseInt(timestamp);
        const now = Date.now();
        const expiryTime = 24 * 60 * 60 * 1000; // 24小時
        
        if (now - tokenTime > expiryTime) {
            return res.render('booking/reminder-result', {
                success: false,
                message: '確認連結已過期',
                type: 'confirm'
            });
        }
        
        // 查找訂位記錄
        const db = getClientDb(storeSlug, 'BDB');
        const Reservation = db.model('Reservation', reservationSchema);
        
        const reservation = await Reservation.findOne({ customBookingId: bookingId });
        
        if (!reservation) {
            return res.render('booking/reminder-result', {
                success: false,
                message: '找不到訂位記錄',
                type: 'confirm'
            });
        }
        
        if (reservation.status === 'cancelled') {
            return res.render('booking/reminder-result', {
                success: false,
                message: '此訂位已經被取消',
                type: 'confirm'
            });
        }
        
        // 檢查是否已經確認過
        if (reservation.reminderConfirmed) {
            return res.render('booking/reminder-result', {
                success: true,
                message: '您已經確認過此訂位',
                bookingInfo: reservation,
                type: 'confirm'
            });
        }
        
        // 更新訂位記錄為已確認
        await Reservation.findOneAndUpdate(
            { customBookingId: bookingId },
            { 
                reminderConfirmed: true,
                reminderConfirmedAt: new Date()
            }
        );
        
        res.render('booking/reminder-result', {
            success: true,
            message: '感謝您的確認！我們期待您的光臨',
            bookingInfo: reservation,
            type: 'confirm'
        });
        
    } catch (error) {
        console.error('Error confirming booking reminder:', error);
        res.render('booking/reminder-result', {
            success: false,
            message: '確認過程發生錯誤，請稍後再試',
            type: 'confirm'
        });
    }
});

// 取消訂位（用戶點擊郵件中的取消連結）
router.get('/cancel/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        // 解析token
        const [bookingId, storeSlug, timestamp] = Buffer.from(token, 'base64').toString().split('_');
        
        // 驗證token是否過期（24小時有效期）
        const tokenTime = parseInt(timestamp);
        const now = Date.now();
        const expiryTime = 24 * 60 * 60 * 1000; // 24小時
        
        if (now - tokenTime > expiryTime) {
            return res.render('booking/reminder-result', {
                success: false,
                message: '取消連結已過期',
                type: 'cancel'
            });
        }
        
        // 查找訂位記錄
        const db = getClientDb(storeSlug, 'BDB');
        const Reservation = db.model('Reservation', reservationSchema);
        
        const reservation = await Reservation.findOne({ customBookingId: bookingId });
        
        if (!reservation) {
            return res.render('booking/reminder-result', {
                success: false,
                message: '找不到訂位記錄',
                type: 'cancel'
            });
        }
        
        if (reservation.status === 'cancelled') {
            return res.render('booking/reminder-result', {
                success: true,
                message: '此訂位已經被取消',
                type: 'cancel'
            });
        }
        
        // 取消訂位
        const updatedReservation = await Reservation.findOneAndUpdate(
            { customBookingId: bookingId },
            { 
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelReason: 'cancelled_via_reminder'
            },
            { new: true }
        );
        
        // 獲取客戶資訊
        const client = await Client.findOne({ slugname: storeSlug });
        const clientname = client ? client.clientname : '';
        
        // 發送取消通知（郵件 + LINE）
        try {
            // 一定發送郵件通知
            await emailService.sendBookingCancellation(reservation.email, {
                ...reservation.toObject(),
                customBookingId: bookingId,
                bookingCode: bookingId,
                storeName: clientname
            });

            // 如果有LINE ID，發送LINE通知
            if (reservation.lineUserId) {
                await lineService.sendBookingCancellation(reservation.lineUserId, {
                    ...reservation.toObject(),
                    customBookingId: bookingId,
                    bookingCode: bookingId,
                    storeName: clientname
                });
            }

            console.log('取消通知已發送');
        } catch (notificationError) {
            console.error('取消通知發送失敗:', notificationError);
        }
        
        res.render('booking/reminder-result', {
            success: true,
            message: '訂位已成功取消，我們已發送確認郵件給您',
            bookingInfo: updatedReservation,
            type: 'cancel'
        });
        
    } catch (error) {
        console.error('Error cancelling booking via reminder:', error);
        res.render('booking/reminder-result', {
            success: false,
            message: '取消過程發生錯誤，請稍後再試',
            type: 'cancel'
        });
    }
});

module.exports = router; 
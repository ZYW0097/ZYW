const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const reservationSchema = require('../models/Reservation');
const getClientDb = require('../utils/dbManager');
const { sendBookingConfirmation, sendBookingCancellation } = require('../services/emailService');

// 生成訂位編號的輔助函數
function generateBookingId(storeSlug) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${storeSlug.toUpperCase()}-${randomPart}`;
}

// 驗證訂位session的輔助函數
function validateBookingSession(req, bookingId, storeSlug) {
    return req.session.lastBooking && 
           req.session.lastBooking.bookingId === bookingId &&
           req.session.lastBooking.storeSlug === storeSlug &&
           Date.now() - req.session.lastBooking.timestamp <= 60000; // 1分鐘過期
}

// 獲取客戶資訊的輔助函數
async function getClientInfo(storeSlug) {
    const client = await Client.findOne({ slugname: storeSlug });
    return {
        clientname: client ? client.clientname : '餐廳名稱',
        bookingpagetext: client ? client.bookingpagetext : '歡迎使用訂位系統'
    };
}

// ==================== 頁面路由 ====================

// 訂位主頁重定向
router.get('/:storeSlug/booking', (req, res) => {
    res.redirect(`/${req.params.storeSlug}/booking/step1`);
});

// 訂位第一步
router.get('/:storeSlug/booking/step1', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const clientInfo = await getClientInfo(storeSlug);
        
        // 設置session中的storeSlug
        req.session.storeSlug = storeSlug;
        
        res.render('booking/step1', {
            storeSlug,
            ...clientInfo
        });
    } catch (error) {
        console.error('Error in booking step1:', error);
        res.status(500).render('error', { message: '系統錯誤' });
    }
});

// 訂位第二步
router.get('/:storeSlug/booking/step2', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const clientInfo = await getClientInfo(storeSlug);
        
        // 設置session中的storeSlug
        req.session.storeSlug = storeSlug;
        
        res.render('booking/step2', {
            storeSlug,
            ...clientInfo
        });
    } catch (error) {
        console.error('Error in booking step2:', error);
        res.status(500).render('error', { message: '系統錯誤' });
    }
});

// 訂位成功頁面
router.get('/:storeSlug/booking/success', async (req, res) => {
    try {
        const { bookingId } = req.query;
        const { storeSlug } = req.params;
        
        // 檢查session驗證（防止直接訪問）
        if (!validateBookingSession(req, bookingId, storeSlug)) {
            return res.redirect(`/${storeSlug}/booking/step1`);
        }
        
        // 獲取訂位資訊和客戶資訊
        const bookingInfo = req.session.lastBooking;
        const clientInfo = await getClientInfo(storeSlug);
        
        // 渲染成功頁面
        res.render('booking/success', { 
            bookingId,
            storeSlug,
            clientname: clientInfo.clientname,
            bookingInfo,
            timestamp: bookingInfo.timestamp
        });
    } catch (error) {
        console.error('Error in booking success:', error);
        res.redirect(`/${req.params.storeSlug}/booking/step1`);
    }
});

// 取消訂位頁面
router.get('/:storeSlug/booking/cancel', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const clientInfo = await getClientInfo(storeSlug);
        
        // 設置session中的storeSlug
        req.session.storeSlug = storeSlug;
        
        res.render('booking/cancel', {
            storeSlug,
            ...clientInfo
        });
    } catch (error) {
        console.error('Error in booking cancel page:', error);
        res.status(500).render('error', { message: '系統錯誤' });
    }
});

// ==================== API路由 ====================

// 創建訂位
router.post(['/api/booking', '/:storeSlug/api/booking'], async (req, res) => {
    try {
        // 獲取storeSlug（優先session，其次params/body/query）
        let storeSlug = req.session && req.session.storeSlug;
        if (!storeSlug) storeSlug = req.params.storeSlug || req.body.storeSlug || req.query.storeSlug;
        if (!storeSlug) {
            return res.status(400).json({ success: false, error: 'storeSlug required' });
        }

        // 驗證必要欄位（後端驗證，不依賴前端）
        const { name, phone, email, date, time, guests } = req.body;
        if (!name || !phone || !date || !time || !guests) {
            return res.status(400).json({ 
                success: false, 
                error: '請填寫所有必要欄位' 
            });
        }

        // 驗證日期格式和未來日期
        const bookingDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (bookingDate < today) {
            return res.status(400).json({ 
                success: false, 
                error: '不能預訂過去的日期' 
            });
        }

        // 驗證人數範圍
        const guestNum = parseInt(guests);
        if (guestNum < 1 || guestNum > 20) {
            return res.status(400).json({ 
                success: false, 
                error: '用餐人數必須在1-20人之間' 
            });
        }

        // 使用客戶特定的訂位資料庫
        const db = getClientDb(storeSlug, 'BDB');
        const Reservation = db.model('Reservation', reservationSchema);

        // 生成自訂訂位編號
        const customBookingId = generateBookingId(storeSlug);

        // 準備訂位資料（過濾和清理輸入）
        const reservationData = {
            customBookingId,
            name: name.trim(),
            phone: phone.trim(),
            email: email ? email.trim() : '',
            date,
            time,
            guests: guestNum,
            vegetarian: req.body.vegetarian || 'no',
            special: req.body.special ? req.body.special.trim() : '',
            createdAt: new Date(),
            status: 'confirmed'
        };
        
        // 創建訂位記錄
        const reservation = await Reservation.create(reservationData);

        // 獲取客戶名稱
        const client = await Client.findOne({ slugname: storeSlug });
        const clientname = client ? client.clientname : '';

        // 保存訂位資訊到session（用於success頁面驗證）
        req.session.lastBooking = {
            bookingId: customBookingId,
            storeSlug,
            timestamp: Date.now(),
            ...reservationData
        };

        // 發送確認郵件（如果有提供email）
        if (email) {
            try {
                const protocol = req.protocol;
                const host = req.get('host');
                const logoUrl = `${protocol}://${host}/images/dineplus.png`;
                
                await sendBookingConfirmation(email, {
                    ...reservationData,
                    bookingId: customBookingId,
                    clientname,
                    logoUrl
                });
            } catch (emailError) {
                console.error('Email sending failed:', emailError);
                // 不因為郵件發送失敗而影響訂位成功
            }
        }

        res.json({ 
            success: true, 
            bookingId: customBookingId,
            message: '訂位成功' 
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ 
            success: false, 
            error: '系統錯誤，請稍後再試' 
        });
    }
});

// 取消訂位（來自success頁面）
router.post('/:storeSlug/api/booking/cancel', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { bookingId } = req.body;
        
        // 驗證session
        if (!validateBookingSession(req, bookingId, storeSlug)) {
            return res.status(400).json({ 
                success: false, 
                error: '無效的訂位資訊或已過期' 
            });
        }
        
        // 使用客戶特定的訂位資料庫
        const db = getClientDb(storeSlug, 'BDB');
        const Reservation = db.model('Reservation', reservationSchema);
        
        // 更新訂位狀態為已取消
        const reservation = await Reservation.findOneAndUpdate(
            { customBookingId: bookingId },
            { 
                status: 'cancelled',
                cancelledAt: new Date()
            },
            { new: true }
        );

        if (!reservation) {
            return res.status(404).json({ 
                success: false, 
                error: '找不到訂位記錄' 
            });
        }
        
        // 獲取客戶資訊
        const client = await Client.findOne({ slugname: storeSlug });
        const clientname = client ? client.clientname : '';
        
        // 發送取消確認郵件
        const bookingInfo = req.session.lastBooking;
        if (bookingInfo.email) {
            try {
                const protocol = req.protocol;
                const host = req.get('host');
                const logoUrl = `${protocol}://${host}/images/dineplus.png`;
                
                await sendBookingCancellation(bookingInfo.email, {
                    ...bookingInfo,
                    bookingId,
                    clientname,
                    logoUrl,
                    cancelTime: new Date().toLocaleString('zh-TW')
                });
            } catch (emailError) {
                console.error('Cancel email sending failed:', emailError);
            }
        }
        
        // 清除session中的訂位資訊
        delete req.session.lastBooking;
        
        res.json({ 
            success: true, 
            message: '訂位已成功取消' 
        });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ 
            success: false, 
            error: '取消訂位時發生錯誤' 
        });
    }
});

// 搜尋訂位（取消訂位頁面使用）
router.post('/:storeSlug/api/booking/search', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { searchType, searchValue } = req.body;
        
        if (!searchType || !searchValue) {
            return res.status(400).json({ 
                success: false, 
                error: '請提供搜尋類型和搜尋值' 
            });
        }
        
        let results = [];
        
        if (searchType === 'bookingId') {
            // 搜尋特定訂位編號
            const db = getClientDb(storeSlug, 'BDB');
            const Reservation = db.model('Reservation', reservationSchema);
            
            const reservation = await Reservation.findOne({ 
                customBookingId: searchValue.trim().toUpperCase(),
                status: { $ne: 'cancelled' },
                date: { $gte: new Date().toISOString().split('T')[0] }
            });
            
            if (reservation) {
                const client = await Client.findOne({ slugname: storeSlug });
                results.push({
                    ...reservation.toObject(),
                    clientname: client ? client.clientname : '餐廳',
                    storeSlug
                });
            }
        } else if (searchType === 'customerInfo') {
            // 搜尋姓名和電話（所有餐廳）
            const searchParts = searchValue.split(',').map(s => s.trim());
            const [name, phone] = searchParts;
            
            if (!name || !phone) {
                return res.status(400).json({ 
                    success: false, 
                    error: '請提供姓名和電話，格式：姓名,電話' 
                });
            }
            
            const clients = await Client.find({});
            
            for (const client of clients) {
                try {
                    const db = getClientDb(client.slugname, 'BDB');
                    const Reservation = db.model('Reservation', reservationSchema);
                    
                    const reservations = await Reservation.find({
                        name: new RegExp(name, 'i'),
                        phone: phone,
                        status: { $ne: 'cancelled' },
                        date: { $gte: new Date().toISOString().split('T')[0] }
                    });
                    
                    reservations.forEach(reservation => {
                        results.push({
                            ...reservation.toObject(),
                            clientname: client.clientname,
                            storeSlug: client.slugname
                        });
                    });
                } catch (error) {
                    console.error(`Error searching in ${client.slugname}:`, error);
                }
            }
        }
        
        res.json({ success: true, results });
    } catch (error) {
        console.error('Error searching bookings:', error);
        res.status(500).json({ 
            success: false, 
            error: '搜尋時發生錯誤' 
        });
    }
});

// 獲取當前餐廳的用戶訂位
router.get('/:storeSlug/api/booking/current', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        const { name, phone } = req.query;
        
        if (!name || !phone) {
            return res.json({ success: true, results: [] });
        }
        
        // 後端驗證輸入
        if (name.trim().length < 1 || phone.trim().length < 8) {
            return res.status(400).json({ 
                success: false, 
                error: '請提供有效的姓名和電話' 
            });
        }
        
        const db = getClientDb(storeSlug, 'BDB');
        const Reservation = db.model('Reservation', reservationSchema);
        
        const reservations = await Reservation.find({
            name: new RegExp(name.trim(), 'i'),
            phone: phone.trim(),
            status: { $ne: 'cancelled' },
            date: { $gte: new Date().toISOString().split('T')[0] }
        }).sort({ date: 1, time: 1 });
        
        res.json({ success: true, results: reservations });
    } catch (error) {
        console.error('Error fetching current bookings:', error);
        res.status(500).json({ 
            success: false, 
            error: '獲取訂位資訊時發生錯誤' 
        });
    }
});

// 執行取消訂位（取消訂位頁面使用）
router.post('/:storeSlug/api/booking/cancel-by-id', async (req, res) => {
    try {
        const { bookingId, targetStoreSlug } = req.body;
        const actualStoreSlug = targetStoreSlug || req.params.storeSlug;
        
        if (!bookingId) {
            return res.status(400).json({ 
                success: false, 
                error: '請提供訂位編號' 
            });
        }
        
        // 使用目標餐廳的資料庫
        const db = getClientDb(actualStoreSlug, 'BDB');
        const Reservation = db.model('Reservation', reservationSchema);
        
        // 找到並更新訂位狀態
        const reservation = await Reservation.findOneAndUpdate(
            { 
                customBookingId: bookingId.trim().toUpperCase(),
                status: { $ne: 'cancelled' } // 確保不重複取消
            },
            { 
                status: 'cancelled',
                cancelledAt: new Date()
            },
            { new: true }
        );
        
        if (!reservation) {
            return res.status(404).json({ 
                success: false, 
                error: '找不到訂位資訊或訂位已被取消' 
            });
        }
        
        // 獲取客戶資訊
        const client = await Client.findOne({ slugname: actualStoreSlug });
        const clientname = client ? client.clientname : '';
        
        // 發送取消確認郵件
        if (reservation.email) {
            try {
                const protocol = req.protocol;
                const host = req.get('host');
                const logoUrl = `${protocol}://${host}/images/dineplus.png`;
                
                await sendBookingCancellation(reservation.email, {
                    ...reservation.toObject(),
                    bookingId,
                    clientname,
                    logoUrl,
                    cancelTime: new Date().toLocaleString('zh-TW')
                });
            } catch (emailError) {
                console.error('Cancel email sending failed:', emailError);
            }
        }
        
        res.json({ 
            success: true, 
            message: '訂位已成功取消' 
        });
    } catch (error) {
        console.error('Error cancelling booking by ID:', error);
        res.status(500).json({ 
            success: false, 
            error: '取消訂位時發生錯誤' 
        });
    }
});

module.exports = router; 
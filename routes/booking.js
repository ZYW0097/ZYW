const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const reservationSchema = require('../models/Reservation');
const getClientDb = require('../utils/dbManager');
const emailService = require('../services/emailService');
const lineService = require('../services/lineService');

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

// 檢查訂位功能是否啟用的輔助函數
async function checkBookingEnabled(storeSlug) {
    try {
        const bookingDB = getClientDb(storeSlug, 'BDB');
        const bookingSettingsSchema = require('../models/BookingSettings');
        const BookingSettings = bookingDB.model('BookingSettings', bookingSettingsSchema);
        const bookingSettings = await BookingSettings.findOne({ 
            slug: storeSlug, 
            type: 'booking_settings', 
            class: 'main_settings' 
        });
        
        // 如果沒有設定，預設為啟用；如果有設定，則檢查 state
        return !bookingSettings || bookingSettings.state === 'enable';
    } catch (error) {
        console.error('Error checking booking settings:', error);
        return true; // 如果檢查出錯，預設允許訂位
    }
}

// 獲取客戶資訊的輔助函數
async function getClientInfo(storeSlug) {
    const client = await Client.findOne({ slugname: storeSlug });
    
    // 獲取時段設定
    let timeSlots = [];
    let diningRules = [];
    
    try {
        const bookingDB = getClientDb(storeSlug, 'BDB');
        
        // 獲取時段設定
        const timeSettingsSchema = require('../models/TimeSettings');
        const TimeSettings = bookingDB.model('TimeSettings', timeSettingsSchema);
        timeSlots = await TimeSettings.find({ available: true }).sort({ createdAt: 1 });
        
        // 獲取訂位規則
        const bookingRulesSchema = require('../models/BookingRules');
        const BookingRules = bookingDB.model('BookingRules', bookingRulesSchema);
        diningRules = await BookingRules.find({ isActive: true }).sort({ order: 1 });
    } catch (error) {
        console.error('Error fetching booking settings:', error);
    }
    
    return {
        clientname: client ? client.clientname : '餐廳名稱',
        restaurantImage: client ? client.restaurantImage : '/images/dine.jpg',
        restaurantAddress: client ? client.restaurantAddress : '餐廳地址',
        timeSlots,
        diningRules
    };
}

// 發送訂位通知的輔助函數
async function sendBookingNotifications(reservationData, type = 'confirmation') {
    try {
        
        // 一定發送郵件通知
        if (type === 'confirmation') {
            await emailService.sendBookingConfirmation(reservationData.email, reservationData);
        } else if (type === 'cancellation') {
            await emailService.sendBookingCancellation(reservationData.email, reservationData);
        }

        // 檢查是否有 LINE 用戶 ID
        let lineUserId = reservationData.lineUserId;
        
        // 如果沒有 lineUserId，嘗試通過電話號碼查找
        if (!lineUserId && reservationData.phone) {
            try {
                // 使用正確的 User 模型
                const userSchema = require('../models/user');
                const adb = getClientDb('main', 'ADB');
                const User = adb.model('User', userSchema);
                
                const existingLineUser = await User.findOne({ phone: reservationData.phone }).select('lineId');
                if (existingLineUser && existingLineUser.lineId) {
                    lineUserId = existingLineUser.lineId;
                }
            } catch (lineUserError) {
                console.error('查找 LINE 用戶時發生錯誤:', lineUserError);
            }
        }

        // 發送 LINE 通知
        if (lineUserId) {
            try {
                if (type === 'confirmation') {
                    await lineService.sendBookingConfirmation(lineUserId, reservationData);
                } else if (type === 'cancellation') {
                    await lineService.sendBookingCancellation(lineUserId, reservationData);
                }
            } catch (lineError) {
                console.error('📱 LINE 通知發送失敗:', lineError);
            }
        } else {
            console.log('ℹ️  沒有 LINE 用戶 ID，跳過 LINE 通知');
        }

        return true;
    } catch (error) {
        console.error('發送通知失敗:', error);
        console.error('錯誤詳情:', error.message);
        return false;
    }
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
        
        // 檢查訂位功能是否啟用
        try {
            const bookingDB = getClientDb(storeSlug, 'BDB');
            const bookingSettingsSchema = require('../models/BookingSettings');
            const BookingSettings = bookingDB.model('BookingSettings', bookingSettingsSchema);
            const bookingSettings = await BookingSettings.findOne({ 
                slug: storeSlug, 
                type: 'booking_settings', 
                class: 'main_settings' 
            });
            
            // 如果設定存在且為 disabled，則返回錯誤
            if (bookingSettings && bookingSettings.state === 'disabled') {
                return res.status(403).render('error', { 
                    message: '此商家暫時關閉訂位功能' 
                });
            }
        } catch (settingsError) {
            console.error('Error checking booking settings:', settingsError);
            // 如果檢查設定時出錯，繼續執行（預設允許訂位）
        }
        
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
        
        // 檢查訂位功能是否啟用
        try {
            const bookingDB = getClientDb(storeSlug, 'BDB');
            const bookingSettingsSchema = require('../models/BookingSettings');
            const BookingSettings = bookingDB.model('BookingSettings', bookingSettingsSchema);
            const bookingSettings = await BookingSettings.findOne({ 
                slug: storeSlug, 
                type: 'booking_settings', 
                class: 'main_settings' 
            });
            
            if (bookingSettings && bookingSettings.state === 'disabled') {
                return res.status(403).render('error', { 
                    message: '此商家暫時關閉訂位功能' 
                });
            }
        } catch (settingsError) {
            console.error('Error checking booking settings:', settingsError);
        }
        
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

        // 檢查訂位功能是否啟用
        try {
            const bookingDB = getClientDb(storeSlug, 'BDB');
            const bookingSettingsSchema = require('../models/BookingSettings');
            const BookingSettings = bookingDB.model('BookingSettings', bookingSettingsSchema);
            const bookingSettings = await BookingSettings.findOne({ 
                slug: storeSlug, 
                type: 'booking_settings', 
                class: 'main_settings' 
            });
            
            if (bookingSettings && bookingSettings.state === 'disabled') {
                return res.status(403).json({ 
                    success: false, 
                    error: '此商家暫時關閉訂位功能' 
                });
            }
        } catch (settingsError) {
            console.error('Error checking booking settings:', settingsError);
        }

        // 驗證必要欄位（後端驗證，不依賴前端）
        const { name, phone, email, date, time, guests } = req.body;
        if (!name || !phone || !date || !time || !guests) {
            return res.status(400).json({ 
                success: false, 
                error: '請填寫所有必要欄位' 
            });
        }

        // 驗證日期格式和未來日期（使用台灣時區）
        const bookingDate = new Date(date + 'T00:00:00+08:00'); // 明確指定台灣時區
        const today = new Date();
        // 使用台灣時區的今天日期進行比較
        const taiwanToday = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
        taiwanToday.setHours(0, 0, 0, 0);
        
        if (bookingDate < taiwanToday) {
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

        // 檢查時段容量限制
        try {
            const TimeSettingsSchema = require('../models/TimeSettings');
            const TimeSettings = db.model('TimeSettings', TimeSettingsSchema);
            
            // 查找該時段的設定
            const timeSlotSetting = await TimeSettings.findOne({ time });
            
            if (timeSlotSetting) {
                // 檢查時段是否開放
                if (!timeSlotSetting.available) {
                    return res.status(400).json({ 
                        success: false, 
                        error: '此時段目前未開放訂位' 
                    });
                }
                
                // 檢查該日期時段的現有訂位數量
                const existingBookings = await Reservation.countDocuments({
                    date: date,
                    time: time,
                    status: { $in: ['confirmed', 'pending'] }
                });
                
                // 檢查是否已達到最大訂位組數
                if (existingBookings >= timeSlotSetting.maxBookings) {
                    return res.status(400).json({ 
                        success: false, 
                        error: `此時段已額滿，最多接受 ${timeSlotSetting.maxBookings} 組訂位` 
                    });
                }
            }
        } catch (timeSlotError) {
            console.error('檢查時段容量失敗:', timeSlotError);
            // 如果檢查失敗，繼續處理訂位（向下兼容）
        }

        // 生成自訂訂位編號
        const customBookingId = generateBookingId(storeSlug);

        // 取得用戶的 LINE ID（如果已登入）
        let lineUserId = null;
        if (req.session.userId) {
            try {
                const adb = require('../utils/dbManager')('main', 'ADB');
                const userSchema = require('../models/user');
                const User = adb.model('User', userSchema);
                const user = await User.findById(req.session.userId).select('lineId');
                if (user) {
                    lineUserId = user.lineId;
                }
            } catch (error) {
                console.error('❌ 取得用戶 LINE ID 失敗:', error);
            }
        }

        // 準備訂位資料（過濾和清理輸入）
        // 直接使用用戶選擇的人數，不進行估算
        const adults = parseInt(req.body.adults) || 0;
        const children = parseInt(req.body.children) || 0;
        
        // 驗證人數一致性
        if (adults + children !== guestNum) {
            console.warn(`人數不一致: adults(${adults}) + children(${children}) = ${adults + children}, 但guests=${guestNum}`);
        }
        

        const reservationData = {
            customBookingId,
            name: name.trim(),
            phone: phone.trim(),
            email: email ? email.trim() : '',
            date,
            time,
            adults: adults,
            children: children,
            guests: guestNum,
            gender: req.body.gender || '先生',
            vegetarian: req.body.vegetarian || 'no',
            special: req.body.special ? req.body.special.trim() : '',
            note: req.body.note ? req.body.note.trim() : '', // 添加 note 欄位
            createdAt: new Date(),
            status: 'confirmed',
            // 如果用戶已登入，儲存 LINE ID
            lineUserId: lineUserId
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

        // 發送通知（郵件 + LINE）
        try {
            const client = await Client.findOne({ slugname: storeSlug });
            const clientname = client ? client.clientname : '餐廳';
            
            await sendBookingNotifications({
                ...reservationData,
                storeName: clientname,
                customBookingId,
                bookingCode: customBookingId
            }, 'confirmation');
            console.log('訂位通知已發送');
        } catch (notificationError) {
            console.error('通知發送失敗:', notificationError);
            // 不因為通知發送失敗而影響訂位成功
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
        
        // 發送取消通知（郵件 + LINE）
        const bookingInfo = req.session.lastBooking;
        try {
            await sendBookingNotifications({
                ...bookingInfo,
                customBookingId: bookingId,
                bookingCode: bookingId,
                storeName: clientname
            }, 'cancellation');
            console.log('取消通知已發送');
        } catch (notificationError) {
            console.error('取消通知發送失敗:', notificationError);
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
                customBookingId: searchValue.trim(),
                status: { $ne: 'cancelled' },
                date: { $gte: new Date().toISOString().split('T')[0] }
            }).lean();
            
            if (reservation) {
                const client = await Client.findOne({ slugname: storeSlug }).lean();
                results.push({
                    ...reservation,
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
                    }).lean();
                    
                    reservations.forEach(reservation => {
                        results.push({
                            ...reservation,
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
        }).sort({ date: 1, time: 1 }).lean();
        
        res.json({ success: true, results: reservations });
    } catch (error) {
        console.error('Error fetching current bookings:', error);
        res.status(500).json({ 
            success: false, 
            error: '獲取訂位資訊時發生錯誤' 
        });
    }
});

// 獲取當前餐廳所有有效訂位（管理用）
router.get('/:storeSlug/api/booking/all-current', async (req, res) => {
    try {
        const { storeSlug } = req.params;
        
        const db = getClientDb(storeSlug, 'BDB');
        const Reservation = db.model('Reservation', reservationSchema);
        
        // 確保有適當的索引
        try {
            await Reservation.collection.createIndex({ status: 1, date: 1 });
            await Reservation.collection.createIndex({ customBookingId: 1 });
        } catch (indexError) {
            // 索引可能已存在，忽略錯誤
        }
        
        // 優化查詢：只查詢最近30天的訂位
        const today = new Date();
        const thirtyDaysLater = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
        const todayStr = today.toISOString().split('T')[0];
        const endDateStr = thirtyDaysLater.toISOString().split('T')[0];
        
        const reservations = await Reservation.find({
            status: { $ne: 'cancelled' },
            date: { 
                $gte: todayStr,
                $lte: endDateStr
            }
        })
        .select('customBookingId name phone date time adults children guests status createdAt') // 只選擇需要的欄位
        .sort({ date: 1, time: 1 })
        .limit(100)
        .lean(); // 使用lean()提高性能
        
        res.json({ success: true, results: reservations });
    } catch (error) {
        console.error('Error fetching all current bookings:', error);
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
                customBookingId: bookingId.trim(),
                status: { $ne: 'cancelled' }
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
        
        // 發送取消通知（郵件 + LINE）
        try {
            await sendBookingNotifications({
                ...reservation.toObject(),
                customBookingId: bookingId,
                bookingCode: bookingId,
                storeName: clientname
            }, 'cancellation');
            console.log('取消通知已發送');
        } catch (notificationError) {
            console.error('取消通知發送失敗:', notificationError);
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
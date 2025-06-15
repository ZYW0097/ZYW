const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const expressLayouts = require('express-ejs-layouts');
const indexRouter = require('./routes/index');
const MongoStore = require('connect-mongo');
const accountRouter = require('./routes/account');
const authRouter = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');
const pointsRoutes = require('./routes/points/index');
const bookingReminderRouter = require('./routes/booking-reminder');
const bookingRouter = require('./routes/booking');
const webhookRouter = require('./routes/webhook');
const reminderService = require('./services/reminderService');
const { loadUser } = require('./middleware/auth');
const axios = require('axios');
const LineService = require('./services/lineService');
require('dotenv').config();

const app = express();

// 連接數據庫
connectDB();

// 設置視圖引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// 中間件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/favicon.ico', express.static(path.join(__dirname, 'favicon.ico')));
app.use(cookieParser());

// Session 設置
app.use(session({
    secret: process.env.SESSION_SECRET || 'yourSecret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI,
        ttl: 14 * 24 * 60 * 60 
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
        maxAge: 14 * 24 * 60 * 60 * 1000, 
        sameSite: 'lax'
    },
    proxy: true
}));

// 用戶加載中間件 (替換原有的)
app.use(loadUser);

// 設置全局變數
app.use((req, res, next) => {
    // 從URL路徑中提取storeSlug
    const pathParts = req.path.split('/');
    let storeSlug = '';
    
    // 如果路徑符合 /:storeSlug/... 格式，提取storeSlug
    if (pathParts.length > 1 && pathParts[1] && 
        !['auth', 'account', 'api', 'setup', 'loading'].includes(pathParts[1])) {
        storeSlug = pathParts[1];
    }
    
    res.locals.storeSlug = storeSlug;
    next();
});

// line webhook 測試用
const lineService = new LineService();

app.post('/test-webhook', express.json(), async (req, res) => {
    const events = req.body.events;
  
    if (!events || events.length === 0) {
      return res.status(200).send('No events');
    }
  
    for (const event of events) {
      console.log('📨 收到 LINE 事件:', event.type);
      
      if (event.source && event.source.userId) {
        console.log('👤 用戶 ID:', event.source.userId);
      }
      
      // 處理文字訊息
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const userMessage = event.message.text.toLowerCase();
        
        console.log('💬 用戶訊息:', event.message.text);
        
        try {
          // 根據用戶輸入進行不同的測試
          if (userMessage.includes('test') || userMessage.includes('測試')) {
            // 測試訂位確認訊息
            const testData = {
              name: 'test',
              gender: '先生',
              phone: '0912345678',
              date: '2024-01-15',
              time: '18:00',
              adults: '2',
              children: '0',
              storeName: 'test',
              customBookingId: 'TEST123'
            };
            
            console.log('🧪 發送測試訂位確認訊息...');
            await lineService.sendBookingConfirmation(userId, testData);
            
          } else if (userMessage.includes('reminder') || userMessage.includes('提醒')) {
            // 測試訂位提醒訊息
            const testData = {
              name: 'test',
              gender: '先生',
              phone: '0912345678',
              date: '2024-01-16',
              time: '19:00',
              adults: '1',
              children: '1',
              storeName: 'test',
              customBookingId: 'REMIND123',
              confirmUrl: 'https://zyw.onrender.com/',
              cancelUrl: 'https://zyw.onrender.com/'
            };
            
            console.log('🔔 發送測試訂位提醒訊息...');
            await lineService.sendBookingReminder(userId, testData);
            
          } else if (userMessage.includes('cancel') || userMessage.includes('取消')) {
            // 測試訂位取消訊息
            const testData = {
              name: 'test',
              gender: '小姐',
              phone: '0987654321',
              date: '2024-01-14',
              time: '12:00',
              adults: '3',
              children: '0',
              storeName: 'test',
              customBookingId: 'CANCEL123'
            };
            
            console.log('❌ 發送測試訂位取消訊息...');
            await lineService.sendBookingCancellation(userId, testData);
            
          } else {
            // 發送使用說明
            const helpMessage = `🤖 LINE Bot 測試說明：

輸入以下關鍵字進行測試：
• "test" 或 "測試" - 測試訂位確認訊息
• "reminder" 或 "提醒" - 測試訂位提醒訊息  
• "cancel" 或 "取消" - 測試訂位取消訊息

所有測試訊息都會使用 "test" 作為文字內容，連結使用 https://zyw.onrender.com/`;
            
            console.log('📖 發送使用說明...');
            await lineService.sendPushMessage(userId, helpMessage);
          }
          
        } catch (error) {
          console.error('❌ 處理訊息時發生錯誤:', error);
          
          // 發送錯誤訊息給用戶
          try {
            await lineService.sendPushMessage(userId, '抱歉，處理您的訊息時發生錯誤，請稍後再試。');
          } catch (sendError) {
            console.error('❌ 發送錯誤訊息失敗:', sendError);
          }
        }
      }
    }
  
    res.status(200).send('OK');
  });

// 路由
app.use('/auth', authRouter);
app.use('/account', accountRouter);
app.use('/booking-reminder', bookingReminderRouter);
app.use('/', bookingRouter);
app.use('/webhook', webhookRouter);
app.use('/', pointsRoutes); 
app.use('/', indexRouter);  

// 404 錯誤處理 (必須在所有路由之後，errorHandler 之前)
app.use((req, res) => {
    res.status(404).render('error', { message: '頁面不存在' });
});

// 錯誤處理中間件
app.use(errorHandler);

// 啟動服務器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服務器運行在端口 ${PORT}`);
    
    reminderService.start();
});

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

app.post('/test-webhook', express.json(), (req, res) => {
    const events = req.body.events;
  
    if (!events || events.length === 0) {
      return res.status(200).send('No events');
    }
  
    events.forEach(event => {
      if (event.source && event.source.userId) {
        console.log('✅ LINE Messaging API 正確的 User ID:', event.source.userId);
        console.log('📋 完整事件資料:', JSON.stringify(event, null, 2));
        
        // 檢查資料庫中是否有對應的用戶
        const getClientDb = require('./utils/dbManager');
        const userSchema = require('./models/user');
        
        (async () => {
          try {
            const adb = getClientDb('main', 'ADB');
            const User = adb.model('User', userSchema);
            
            const user = await User.findOne({ lineId: event.source.userId });
            if (user) {
              console.log('🔍 找到對應用戶:', user.name, '- ID:', user._id);
            } else {
              console.log('❌ 資料庫中找不到此 LINE ID:', event.source.userId);
              
              // 列出所有用戶的 LINE ID 進行比較
              const allUsers = await User.find({}, 'lineId name').limit(10);
              console.log('📋 現有用戶的 LINE ID:');
              allUsers.forEach(u => {
                console.log(`   ${u.name}: ${u.lineId}`);
              });
            }
          } catch (error) {
            console.error('查詢用戶時發生錯誤:', error);
          }
        })();
      }
  
      // 如果你要回覆訊息（需要 replyToken + webhook）
      // 也可以在這裡處理
    });
  
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

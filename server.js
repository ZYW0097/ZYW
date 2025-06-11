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
const adminRouter = require('./routes/admin');
const reminderService = require('./services/reminderService');
const { loadUser } = require('./middleware/auth');
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

// 路由
app.use('/auth', authRouter);
app.use('/account', accountRouter);
app.use('/booking-reminder', bookingReminderRouter);
app.use('/admin', adminRouter);
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
    
    // 啟動訂位提醒服務
    reminderService.start();
});

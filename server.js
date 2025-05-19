const express = require('express');
const path = require('path');
const session = require('express-session');
const connectDB = require('./config/database');
const expressLayouts = require('express-ejs-layouts');
const indexRouter = require('./routes/index');
const MongoStore = require('connect-mongo');
const accountRouter = require('./routes/account');
const errorHandler = require('./middleware/errorHandler');
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

// Session 設置
app.use(session({
    secret: process.env.SESSION_SECRET || 'yourSecret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));

// 設置全局變數
app.use((req, res, next) => {
    res.locals.storeSlug = req.params.storeSlug || '';
    next();
});

// 路由
app.use('/account', accountRouter);
app.use('/', indexRouter);  // 這會包含所有點數系統的路由

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
});

const express = require('express');
const path = require('path');
const session = require('express-session');
const connectDB = require('./config/database');
const expressLayouts = require('express-ejs-layouts');
const indexRouter = require('./routes/index');
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

// Session 設置
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// 路由
app.use('/', indexRouter);

// 錯誤處理
app.use((req, res, next) => {
    res.status(404).render('error', { message: '頁面不存在' });
});

// 啟動服務器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服務器運行在端口 ${PORT}`);
});

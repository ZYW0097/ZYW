const express = require('express');
const router = express.Router();
const passport = require('passport');
const getClientDb = require('../utils/dbManager');
const userSchema = require('../models/user');
const LineStrategy = require('passport-line-auth').Strategy;

// /account → /account/profile
router.get('/account', (req, res) => {
    res.redirect('/account/profile');
});

// LINE 登入
router.get('/auth/line', passport.authenticate('line'));

// LINE callback
router.get('/auth/line/callback', passport.authenticate('line', {
    failureRedirect: '/',
    session: true
}), async (req, res) => {
    if (!req.user.birthday || !req.user.gender) {
        return res.redirect('/account/profile');
    } else {
        return res.redirect('/account/points');
    }
});

// 側邊欄共用 layout
function renderWithSidebar(res, view, params) {
    res.render(view, { ...params, layout: 'account_layout' });
}

// 基本資料頁
router.get('/account/profile', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    renderWithSidebar(res, 'account_profile', { user: req.user });
});

// 集點卡頁
router.get('/account/points', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    renderWithSidebar(res, 'account_points', { user: req.user });
});

// 帳號設定頁
router.get('/account/settings', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    renderWithSidebar(res, 'account_settings', { user: req.user });
});

// 儲存/更新基本資料
router.post('/account/profile', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    const { birthday, gender } = req.body;
    const adb = getClientDb('main', 'ADB');
    const User = adb.model('User', userSchema);
    await User.findByIdAndUpdate(req.user._id, { birthday, gender });
    res.redirect('/account/points');
});

// 登出
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

passport.use(new LineStrategy({
    channelID: process.env.LINE_CHANNEL_ID,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    callbackURL: process.env.LINE_CALLBACK_URL,
    scope: ['profile', 'openid', 'email']
}, async (accessToken, refreshToken, params, profile, done) => {
    // ...你的登入邏輯...
}));

module.exports = router;

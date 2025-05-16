const express = require('express');
const getClientDb = require('../utils/dbManager');
const userSchema = require('../models/user');
const axios = require('axios');
const cloudinary = require('../config/cloudinary');
const qs = require('querystring');

const router = express.Router();

const LINE_CLIENT_ID = process.env.LINE_CHANNEL_ID;
const LINE_CLIENT_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CALLBACK_URL = process.env.LINE_CALLBACK_URL;

// /account → /account/profile
router.get('/', (req, res) => {
    res.redirect('/account/profile');
});

// 1. 點擊 user icon → /account/login → 302 跳轉到 LINE 授權頁
router.get('/login', (req, res) => {
    const state = Math.random().toString(36).substring(2); // 可用 session 記錄
    const redirectUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINE_CALLBACK_URL)}&state=${state}&scope=profile%20openid%20email`;
    res.redirect(redirectUrl);
    console.log('LINE_CLIENT_ID:', LINE_CLIENT_ID);
    console.log('LINE_CLIENT_SECRET:', LINE_CLIENT_SECRET);
    console.log('LINE_CALLBACK_URL:', LINE_CALLBACK_URL);
});

// 2. LINE callback
router.get('/line/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/');

    try {
        // 取得 access_token
        const tokenRes = await axios.post('https://api.line.me/oauth2/v2.1/token',
            qs.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: LINE_CALLBACK_URL,
                client_id: LINE_CLIENT_ID,
                client_secret: LINE_CLIENT_SECRET
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        const access_token = tokenRes.data.access_token;

        // 取得用戶 profile
        const profileRes = await axios.get('https://api.line.me/v2/profile', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const { userId: lineId, displayName: name, pictureUrl: avatarUrl } = profileRes.data;

        // 上傳頭像到 Cloudinary
        let avatarCloudUrl = '';
        if (avatarUrl) {
            const uploadRes = await cloudinary.uploader.upload(avatarUrl, {
                folder: 'user_avatars',
                public_id: lineId
            });
            avatarCloudUrl = uploadRes.secure_url;
        }

        // 存入 ADB
        const adb = getClientDb('main', 'ADB');
        const User = adb.model('User', userSchema);
        let user = await User.findOne({ lineId });
        if (!user) {
            user = await User.create({
                lineId,
                name,
                avatar: avatarCloudUrl
            });
        } else if (!user.avatar && avatarCloudUrl) {
            user.avatar = avatarCloudUrl;
            await user.save();
        }

        // 設定 session
        req.session.userId = user._id;

        // 跳轉
        if (!user.birthday || !user.gender) {
            return res.redirect('/account/profile');
        } else {
            return res.redirect('/account/points');
        }
    } catch (err) {
        console.error('LINE login error:', err);
        return res.redirect('/');
    }
});

// 3. 登出
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// 4. 需要登入的頁面
function requireLogin(req, res, next) {
    if (!req.session.userId) return res.redirect('/account/login');
    next();
}

// 5. 側邊欄共用 layout
function renderWithSidebar(res, view, params) {
    res.render(view, { ...params, layout: 'account_layout' });
}

// 6. 基本資料頁
router.get('/profile', requireLogin, async (req, res) => {
    const adb = getClientDb('main', 'ADB');
    const User = adb.model('User', userSchema);
    const user = await User.findById(req.session.userId);
    renderWithSidebar(res, 'account_profile', { user });
});

// 7. 集點卡頁
router.get('/points', requireLogin, async (req, res) => {
    const adb = getClientDb('main', 'ADB');
    const User = adb.model('User', userSchema);
    const user = await User.findById(req.session.userId);
    renderWithSidebar(res, 'account_points', { user });
});

// 8. 帳號設定頁
router.get('/settings', requireLogin, async (req, res) => {
    const adb = getClientDb('main', 'ADB');
    const User = adb.model('User', userSchema);
    const user = await User.findById(req.session.userId);
    renderWithSidebar(res, 'account_settings', { user });
});

// 9. 儲存/更新基本資料
router.post('/profile', requireLogin, async (req, res) => {
    const { birthday, gender } = req.body;
    const adb = getClientDb('main', 'ADB');
    const User = adb.model('User', userSchema);
    await User.findByIdAndUpdate(req.session.userId, { birthday, gender });
    res.redirect('/account/points');
});

module.exports = router;

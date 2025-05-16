const passport = require('passport');
const LineStrategy = require('passport-line').Strategy;
const getClientDb = require('../utils/dbManager');
const userSchema = require('../models/user');
const cloudinary = require('./cloudinary');

passport.use(new LineStrategy({
    channelID: process.env.LINE_CHANNEL_ID,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    callbackURL: process.env.LINE_CALLBACK_URL,
    scope: ['profile', 'openid', 'email']
}, async (accessToken, refreshToken, params, profile, done) => {
    try {
        const lineId = profile.id;
        const name = profile.displayName;
        const avatarUrl = profile.pictureUrl;

        // 上傳頭像到 Cloudinary
        let avatarCloudUrl = '';
        if (avatarUrl) {
            const uploadRes = await cloudinary.uploader.upload(avatarUrl, {
                folder: 'user_avatars',
                public_id: lineId
            });
            avatarCloudUrl = uploadRes.secure_url;
        }

        // 連到主帳號DB
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
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    const adb = getClientDb('main', 'ADB');
    const User = adb.model('User', userSchema);
    const user = await User.findById(id);
    done(null, user);
});

module.exports = passport;

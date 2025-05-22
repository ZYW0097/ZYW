const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    // API 請求回傳 401，否則導向登入頁
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(401).json({ 
            success: false, 
            message: '請先登入' 
        });
    }
    res.redirect('/account/login');
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        return next();
    }
    res.status(403).json({ 
        success: false, 
        message: '需要管理員權限' 
    });
};

module.exports = {
    isAuthenticated,
    isAdmin
};
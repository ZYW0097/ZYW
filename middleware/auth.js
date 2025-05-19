const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ 
        success: false, 
        message: '請先登入' 
    });
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
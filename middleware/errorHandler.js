const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // 處理 Mongoose 驗證錯誤
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: '資料驗證失敗',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    // 處理 Mongoose 重複鍵錯誤
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: '資料已存在'
        });
    }

    // 處理 JWT 錯誤
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: '無效的 token'
        });
    }

    // 處理其他錯誤
    res.status(500).json({
        success: false,
        message: '系統錯誤',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

module.exports = errorHandler;

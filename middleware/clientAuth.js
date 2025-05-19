const Client = require('../models/Client');

const validateStoreSlug = async (req, res, next) => {
    try {
        const { storeSlug } = req.params;
        
        const client = await Client.findOne({ slugname: storeSlug });
        if (!client) {
            return res.status(404).json({
                success: false,
                message: '找不到該商店'
            });
        }

        // 將 client 資訊添加到 request 中，方便後續使用
        req.client = client;
        next();
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: '驗證商店失敗',
            error: error.message
        });
    }
};

module.exports = {
    validateStoreSlug
};
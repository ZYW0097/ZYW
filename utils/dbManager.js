const mongoose = require('mongoose');
const connections = {};

// 取 base uri（不帶 dbName）
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI not set in .env');

function getClientDb(storeSlug, type = 'BDB') {
    if (!storeSlug) throw new Error('storeSlug is required');
    // 取 base uri，移除 ? 及後面參數
    const [baseUri, params] = MONGODB_URI.split('?');
    const dbName = `${storeSlug}${type}`;
    const fullUri = `${baseUri.replace(/\/$/, '')}/${dbName}?${params || ''}`;
    if (!connections[dbName]) {
        connections[dbName] = mongoose.createConnection(
            fullUri,
            { useNewUrlParser: true, useUnifiedTopology: true }
        );
    }
    return connections[dbName];
}

module.exports = getClientDb; 
# 🚀 快速 Webhook 設定指南

## 步驟 1: 設定環境變數
在您的 `.env` 檔案添加：
```bash
# 推薦使用強密碼
WEBHOOK_SECRET=restaurant-reminder-secure-key-2024-abc123xyz789
# 或者使用 CRON_SECRET (兩個都會被檢查)
CRON_SECRET=restaurant-reminder-secure-key-2024-abc123xyz789
```

## 步驟 2: 測試 Webhook
1. 訪問：`https://yourdomain.com/admin/webhook-test`
2. 輸入您的 WEBHOOK_SECRET 或 CRON_SECRET
3. 選擇認證方式 (建議使用 X-API-Key Header)
4. 測試所有端點確保正常運作

## 步驟 3: 在 cron-job.org 設定

### 🔔 主要提醒檢查 (每20分鐘)
- **URL**: `https://yourdomain.com/webhook/reminder-check`
- **方法**: POST
- **時間**: `*/20 * * * *`
- **Headers**: `X-API-Key: restaurant-reminder-secure-key-2024-abc123xyz789`

### 💚 保活檢查 (每20分鐘)
- **URL**: `https://yourdomain.com/webhook/keepalive`
- **方法**: GET  
- **時間**: `*/20 * * * *`
- **Headers**: `X-API-Key: restaurant-reminder-secure-key-2024-abc123xyz789`

### 🩺 健康檢查 (每20分鐘)
- **URL**: `https://yourdomain.com/webhook/health`
- **方法**: GET
- **時間**: `*/20 * * * *`
- **無需認證**

## 🔒 安全性加強
- 使用 X-API-Key Header 而非 URL 參數
- 密鑰包含數字、字母和特殊字符
- 定期更換密鑰
- 監控異常訪問日誌

## 完成！
您的訂位提醒系統現在會：
- ✅ 每20分鐘檢查提醒 (±40分鐘時間窗口)
- ✅ 防止伺服器休眠
- ✅ 自動修復服務問題
- ✅ 安全的 API Key 認證

監控狀態：`https://yourdomain.com/admin/webhook-test` 
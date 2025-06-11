# 訂位提醒功能說明

## 功能概述

訂位提醒功能會在用戶訂位日期的前12小時自動發送郵件通知，用戶可以選擇確認到場或取消訂位。如果用戶不採取任何行動，系統將預設保留訂位。

## 核心功能

### 1. 自動提醒檢查
- **執行頻率**: 每小時檢查一次
- **提醒時機**: 訂位時間前12小時（±30分鐘容差）
- **檢查範圍**: 所有已確認且有email的訂位

### 2. 提醒郵件
- **內容**: 包含訂位詳情、確認按鈕、取消按鈕
- **安全性**: 使用加密token確保連結安全
- **有效期**: 24小時

### 3. 用戶操作
- **確認到場**: 點擊綠色確認按鈕
- **取消訂位**: 點擊紅色取消按鈕
- **不操作**: 預設保留訂位

## 技術架構

### 檔案結構
```
├── services/
│   └── reminderService.js          # 提醒服務核心邏輯
├── routes/
│   ├── booking-reminder.js         # 處理確認/取消請求
│   └── admin.js                    # 管理和測試功能
├── templates/email/content/
│   └── booking-reminder.html       # 提醒郵件模板
├── views/
│   ├── booking/reminder-result.ejs # 操作結果頁面
│   └── admin/reminder-test.ejs     # 測試管理頁面
└── models/
    └── Reservation.js              # 增加提醒相關欄位
```

### 資料庫欄位
新增到 `Reservation` 模型的欄位：
- `reminderSent`: Boolean - 是否已發送提醒
- `reminderSentAt`: Date - 提醒發送時間
- `reminderConfirmed`: Boolean - 用戶是否已確認
- `reminderConfirmedAt`: Date - 確認時間
- `cancelReason`: String - 取消原因

### 路由結構
```
GET  /booking-reminder/confirm/:token  # 確認訂位
GET  /booking-reminder/cancel/:token   # 取消訂位
GET  /admin/reminder-test              # 測試頁面
GET  /admin/reminder-status            # 服務狀態
POST /admin/trigger-reminder-check     # 手動觸發檢查
POST /admin/restart-reminder-service   # 重啟服務
```

## 使用說明

### 啟動服務
服務會在伺服器啟動時自動啟動：
```javascript
// 在 server.js 中
reminderService.start();
```

### 測試功能
1. 訪問 `/admin/reminder-test` 查看測試頁面
2. 點擊「手動觸發提醒檢查」測試功能
3. 查看服務狀態和運行情況

### 郵件模板自訂
編輯 `templates/email/content/booking-reminder.html` 來自訂郵件外觀。

## 安全機制

### Token 加密
- 格式: `bookingId_storeSlug_timestamp`
- 編碼: Base64
- 有效期: 24小時

### 驗證檢查
- Token 解析驗證
- 時間戳過期檢查
- 訂位狀態驗證
- 重複操作防護

## 配置選項

### 環境變數
```bash
BASE_URL=http://localhost:3000  # 用於生成連結
NODE_ENV=production             # 生產環境設定
```

### 時間設定
可在 `reminderService.js` 中調整：
- 檢查頻率: `'0 * * * *'` (每小時)
- 提醒時機: 12小時前
- 時間容差: ±30分鐘

## 監控和日誌

### 日誌輸出
- 服務啟動/停止
- 每次檢查結果
- 郵件發送狀態
- 錯誤處理

### 監控端點
```bash
GET /admin/reminder-status  # 檢查服務狀態
```

## 故障排除

### 常見問題

1. **服務未啟動**
   - 檢查 server.js 中是否正確啟動服務
   - 查看控制台錯誤訊息

2. **郵件未發送**
   - 確認郵件服務配置正確
   - 檢查訂位記錄是否有email欄位
   - 驗證時間計算邏輯

3. **Token 無效**
   - 檢查連結是否過期
   - 驗證Base64編碼/解碼

### 手動測試
1. 創建一個12小時後的測試訂位
2. 使用 `/admin/trigger-reminder-check` 手動觸發
3. 檢查郵件是否發送
4. 測試確認/取消連結

## 未來擴展

### 可能的改進
1. 支援多種提醒時間 (24小時前、1小時前等)
2. 簡訊提醒功能
3. 提醒頻率自訂
4. 批量提醒管理
5. 統計報表功能

### 效能優化
1. 資料庫索引優化
2. 批量處理提醒
3. 快取機制
4. 分散式任務處理

## 注意事項

1. **時區處理**: 確保伺服器時區與業務時區一致
2. **郵件限制**: 注意郵件服務的發送限制
3. **資料清理**: 定期清理過期的提醒記錄
4. **效能監控**: 監控定時任務對系統效能的影響

---

## 快速開始

1. 確保已安裝 `node-cron` 依賴
2. 啟動伺服器，提醒服務會自動啟動
3. 創建測試訂位 (12小時後的時間)
4. 使用管理頁面手動觸發檢查
5. 檢查郵件並測試確認/取消功能 
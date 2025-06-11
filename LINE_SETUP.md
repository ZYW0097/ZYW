# LINE 整合設定指南

## 📊 當前設定狀況

✅ **LINE Login** - 已設定完成
- 環境變數：`LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_CALLBACK_URL`
- 功能：用戶可以透過 LINE 登入網站

❌ **通知機器人** - 需要建立
- 需要環境變數：`LINE_BOT_ACCESS_TOKEN`
- 功能：發送訂位確認和提醒通知

⭕ **聊天機器人** - 已移除（不需要）
- 此功能已從系統中移除，因為只需要單向通知功能

## 系統架構說明

這個系統包含兩個獨立的 LINE 功能：

1. **LINE Login**：用於網站登入功能（已設定）
2. **通知機器人**：用於發送訂位確認、提醒等通知（需要新建立）

## ⚠️ 重要說明

您目前已經設定的 `LINE_CHANNEL_SECRET` 是用於 LINE Login 的，**不能**用於發送通知。
發送通知需要建立新的 **Messaging API Channel**。

## 1. LINE Login 設定（用於網站登入）

### 建立 LINE Login Channel
1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立「LINE Login」Channel
3. 設定 Callback URL：`https://你的網域/account/line/callback`
4. 取得：
   - Channel ID → `LINE_CHANNEL_ID`
   - Channel Secret → `LINE_CHANNEL_SECRET`

### 環境變數設定
```env
# LINE Login（網站登入用）
LINE_CHANNEL_ID=你的_Line_Login_Channel_ID
LINE_CHANNEL_SECRET=你的_Line_Login_Channel_Secret
LINE_CALLBACK_URL=https://你的網域/account/line/callback
```

## 2. 通知機器人設定（⭐ 您需要建立這個）

### 建立 Messaging API Channel
1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 選擇您的 Provider（或建立新的）
3. 點擊「Create a new channel」
4. 選擇「Messaging API」類型
5. 填寫基本資訊：
   - Channel name: `餐廳訂位通知機器人`
   - Description: `用於發送訂位確認和提醒通知`
   - Category: `Food & Restaurant`
6. 建立完成後，取得憑證：
   - Channel Access Token → `LINE_BOT_ACCESS_TOKEN`

### 設定 Webhook（通知用）
- 在 Messaging API 設定頁面
- Webhook URL：`https://你的網域/line/webhook`
- 這個主要用於接收系統通知，不處理用戶訊息
- **關閉自動回覆**和**問候訊息**（因為這只用於發送通知）

## 3. 官方帳號聊天機器人設定

### 建立官方帳號
1. 建立另一個「Messaging API」Channel（用於聊天）
2. 取得憑證：
   - Channel Secret → `LINE_OFFICIAL_SECRET`
   - Channel Access Token → `LINE_OFFICIAL_ACCESS_TOKEN`

### 設定 Webhook（聊天用）
- Webhook URL：`https://你的網域/line/official-webhook`
- 關閉自動回覆功能
- 啟用 Webhook

## 4. 完整環境變數

```env
# LINE Login（網站登入）
LINE_CHANNEL_ID=你的_Line_Login_Channel_ID
LINE_CHANNEL_SECRET=你的_Line_Login_Channel_Secret
LINE_CALLBACK_URL=https://你的網域/account/line/callback

# LINE 通知機器人（發送訂位通知）
LINE_BOT_ACCESS_TOKEN=你的_通知機器人_Access_Token
```

## 5. 系統流程

### 用戶註冊/登入流程：
1. 用戶點擊網站上的「LINE 登入」
2. 跳轉到 LINE 授權頁面
3. 用戶授權後返回網站
4. 系統取得用戶的 LINE ID 並存入主資料庫
5. 完成登入

### 訂位通知流程：
1. 用戶在網站訂位（已登入狀態）
2. 系統建立訂位記錄，關聯用戶 ID
3. 系統從主資料庫取得用戶的 LINE ID
4. 透過通知機器人發送訂位確認通知

### 聊天機器人功能：
- 餐廳資訊問答
- 引導用戶到網站訂位
- 基本客服功能

## 6. 測試步驟

1. **測試 LINE 登入**：
   - 訪問網站，點擊 LINE 登入
   - 確認能正常授權並取得用戶資訊

2. **測試訂位通知**：
   - 以登入用戶身份進行訂位
   - 檢查是否收到 LINE 通知

3. **測試聊天機器人**：
   - 加入官方帳號好友
   - 發送訊息測試回應

## 7. 機器人功能

### 官方帳號聊天機器人可回應：
- **問候**：「你好」、「hello」、「hi」
- **幫助**：「幫助」、「help」、「功能」
- **地址**：「地址」、「位置」
- **營業時間**：「營業時間」、「時間」
- **電話**：「電話」、「聯絡」
- **訂位**：「訂位」、「預約」

## 8. 注意事項

- 確保三個功能使用不同的憑證和端點
- 通知機器人主要用於單向發送，不處理用戶回應
- 官方帳號用於雙向聊天互動
- 用戶需要先透過 LINE Login 登入網站才能收到訂位通知
- 免費帳號每月有訊息限制，可考慮升級為付費方案

## 9. 常見問題

**Q: Webhook 驗證失敗？**
A: 檢查 URL 是否正確，確保伺服器可以接收 HTTPS 請求

**Q: 用戶登入後沒收到通知？**
A: 檢查用戶是否有正確的 LINE ID，以及通知機器人設定

**Q: 聊天機器人沒有回應？**
A: 檢查官方帳號的憑證和 webhook 設定

**Q: 如何客製化回應訊息？**
A: 編輯 `routes/line.js` 檔案中的官方帳號機器人邏輯

## 📞 技術支援

如果遇到設定問題，請：
1. 檢查伺服器日誌
2. 使用測試頁面驗證功能
3. 參考 LINE Developers 官方文檔
4. 聯繫技術人員協助

## 🔗 相關連結

- [LINE Official Account Manager](https://manager.line.biz/)
- [LINE Developers Console](https://developers.line.biz/)
- [LINE Messaging API 文檔](https://developers.line.biz/en/docs/messaging-api/)
- [Flex Message 設計工具](https://developers.line.biz/flex-simulator/)

---

設定完成後，您的餐廳就可以透過 LINE 自動發送訂位通知，提升客戶服務品質！ 
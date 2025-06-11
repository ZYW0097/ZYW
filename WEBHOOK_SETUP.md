# Webhook 設定教學 - 使用 cron-job.org

## 🎯 目標
使用外部定時服務防止伺服器冷處理問題，確保訂位提醒功能正常運作。

## 📋 準備工作

### 1. 設定環境變數
在您的 `.env` 檔案中添加：
```bash
# Webhook 安全令牌（請使用強密碼）
WEBHOOK_SECRET=your-very-secure-secret-token-here
```

### 2. 確認您的伺服器URL
假設您的網站是：`https://yourdomain.com`

## 🚀 在 cron-job.org 設定步驟

### 步驟 1: 註冊 cron-job.org
1. 前往 [https://cron-job.org](https://cron-job.org)
2. 註冊一個免費帳戶
3. 登入後台

### 步驟 2: 創建第一個 Cron Job（提醒檢查）

#### 基本設定
- **Job Title**: `Restaurant Reminder Check`
- **URL**: `https://yourdomain.com/webhook/reminder-check`
- **Request Method**: `POST`
- **Schedule**: 每20分鐘執行

#### 安全設定 (必需)
- **Headers** (強烈建議):
  ```
  X-API-Key: your-very-secure-secret-token-here
  Content-Type: application/json
  ```
- **替代方案 - URL參數** (較不安全):
  ```
  https://yourdomain.com/webhook/reminder-check?token=your-secret
  ```

#### 時間設定
- **分鐘**: `*/20` (每20分鐘)
- **小時**: `*` (每小時)
- **日**: `*` (每日)
- **月**: `*` (每月)
- **星期**: `*` (每週)

### 步驟 3: 創建第二個 Cron Job（伺服器保活）

#### 基本設定
- **Job Title**: `Server Keepalive`
- **URL**: `https://yourdomain.com/webhook/keepalive`
- **Request Method**: `GET`
- **Schedule**: 每20分鐘執行

#### 安全設定
- **Headers**:
  ```
  X-API-Key: your-very-secure-secret-token-here
  ```

#### 時間設定
- **分鐘**: `*/20` (每20分鐘)
- **小時**: `*` (每小時)
- **日**: `*` (每日)
- **月**: `*` (每月)
- **星期**: `*` (每週)

### 步驟 4: 創建第三個 Cron Job（健康檢查）

#### 基本設定
- **Job Title**: `Health Check`
- **URL**: `https://yourdomain.com/webhook/health`
- **Request Method**: `GET`
- **Schedule**: 每10分鐘執行

#### 時間設定
- **分鐘**: `*/20` (每20分鐘)

## 🔧 可用的 Webhook 端點

### 1. 提醒檢查 (主要功能)
```
POST /webhook/reminder-check
```
**功能**: 執行訂位提醒檢查，確保提醒服務運行
**頻率建議**: 每20分鐘 (時間窗口已調整為±40分鐘確保不遺漏)

### 2. 伺服器保活
```
GET /webhook/keepalive
```
**功能**: 防止伺服器冷處理，保持服務活躍
**頻率建議**: 每20分鐘

### 3. 健康檢查
```
GET /webhook/health
```
**功能**: 簡單的健康狀態檢查（無需認證）
**頻率建議**: 每20分鐘

### 4. 強制重啟提醒服務
```
POST /webhook/restart-reminder
```
**功能**: 當檢測到問題時強制重啟提醒服務
**頻率建議**: 手動觸發或每日一次

### 5. 詳細狀態查詢
```
GET /webhook/status
```
**功能**: 獲取詳細的系統和服務狀態
**頻率建議**: 根據需要查詢

## 🔐 安全設定

### 使用 URL 參數認證
```
https://yourdomain.com/webhook/reminder-check?token=your-secret
```

### 使用 Header 認證（推薦）
```
Authorization: Bearer your-secret-token
```

### 產生安全令牌
建議使用強密碼，例如：
```bash
# Linux/Mac
openssl rand -hex 32

# 或手動創建
echo "restaurant-reminder-$(date +%s)-$(openssl rand -hex 16)"
```

## 📊 監控和日誌

### 在 cron-job.org 查看執行記錄
1. 登入 cron-job.org 控制台
2. 點擊您的工作名稱
3. 查看 "Execution History"
4. 檢查執行狀態和響應

### 檢查伺服器日誌
Webhook 調用會在控制台輸出日誌：
```
[2024-01-01T12:00:00.000Z] Webhook triggered: reminder-check
[2024-01-01T12:05:00.000Z] Webhook triggered: keepalive
```

## 🛠️ 故障排除

### 1. 認證失敗 (401 錯誤)
- 檢查 WEBHOOK_SECRET 環境變數
- 確認令牌正確設定
- 檢查 URL 參數或 Header 格式

### 2. 伺服器無響應 (500 錯誤)
- 檢查伺服器是否正在運行
- 查看伺服器錯誤日誌
- 確認網路連接正常

### 3. 功能未正常執行
- 檢查提醒服務狀態：`GET /webhook/status`
- 手動觸發檢查：`POST /webhook/restart-reminder`
- 查看詳細日誌輸出

## 📈 進階配置

### 1. 多重保護機制
設定多個相同時間間隔的 Cron Job (避免違規)：
- 每20分鐘：主要提醒檢查 (±40分鐘時間窗口)
- 每20分鐘：伺服器保活
- 每20分鐘：健康檢查
- 每日：系統重啟（可選）

### 2. 監控告警
設定 cron-job.org 的郵件通知：
- 執行失敗時發送郵件
- 連續失敗達到閾值時告警

### 3. 備用方案
如果 cron-job.org 出現問題，也可以使用：
- UptimeRobot (免費監控服務)
- GitHub Actions (定時工作流)
- 其他定時服務提供商

## 🎯 最佳實踐

1. **令牌安全**: 定期更換 WEBHOOK_SECRET
2. **監控頻率**: 根據業務需求調整呼叫頻率
3. **錯誤處理**: 設定適當的重試機制
4. **日誌記錄**: 保持日誌以便故障分析
5. **測試驗證**: 定期測試所有端點功能

## 🔗 快速測試

使用以下命令測試您的 Webhook：

```bash
# 測試健康檢查（無需認證）
curl https://yourdomain.com/webhook/health

# 測試提醒檢查（需要認證）
curl -X POST "https://yourdomain.com/webhook/reminder-check?token=your-secret"

# 測試保活功能
curl "https://yourdomain.com/webhook/keepalive?token=your-secret"
```

完成設定後，您的訂位提醒系統將會：
✅ 每分鐘自動檢查提醒
✅ 防止伺服器冷處理
✅ 自動重啟故障服務
✅ 提供完整的監控日誌 
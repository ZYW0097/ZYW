# 認證系統架構說明

## 系統概述
完整的雙重認證系統，支援 LINE 登入和手機號碼+密碼登入，具備現代化的安全機制。

## 文件分類架構

### 1. 路由層 (Routes Layer)
#### `/routes/auth.js` - 新認證路由
- **GET** `/auth/register` - 註冊頁面
- **POST** `/auth/register` - 處理註冊
- **GET** `/auth/login` - 登入頁面  
- **POST** `/auth/login/phone` - 手機號碼登入
- **GET** `/auth/logout` - 登出
- **GET** `/auth/forgot-password` - 忘記密碼頁面
- **POST** `/auth/forgot-password` - 處理忘記密碼

#### `/routes/account.js` - 帳號管理路由 (已擴展)
- **POST** `/account/settings/password` - 密碼設定/修改
- **POST** `/account/settings/remove-password` - 移除密碼登入
- **POST** `/account/settings/delete-account` - 刪除帳號

### 2. 中間件層 (Middleware Layer)
#### `/middleware/auth.js` - 認證中間件
- `isAuthenticated()` - 檢查登入狀態 (支援記住登入)
- `loadUser()` - 載入用戶資料
- `redirectIfAuthenticated()` - 已登入時重導向
- `requirePasswordAuth()` - 檢查密碼登入功能

### 3. 模型層 (Model Layer)
#### `/models/user.js` - 用戶資料模型
```javascript
{
    lineId: String,           // LINE ID
    name: String,             // 姓名
    avatar: String,           // 頭像 URL
    phone: String,            // 手機號碼 (唯一)
    password: String,         // 加密密碼
    hasPassword: Boolean,     // 是否設定密碼
    birthday: String,         // 生日
    gender: String,           // 性別
    rememberToken: String,    // 記住登入 token
    rememberExpires: Date,    // token 過期時間
    loginAttempts: Number,    // 登入失敗次數
    lockUntil: Date,          // 帳號鎖定時間
    lastLogin: Date,          // 最後登入時間
    isLocked: Virtual         // 虛擬屬性：帳號是否鎖定
}
```

### 4. 工具層 (Utils Layer)
#### `/utils/auth.js` - 認證工具函數
- `hashPassword()` - 密碼加密 (bcrypt, saltRounds: 12)
- `comparePassword()` - 密碼驗證
- `generateRememberToken()` - 生成記住登入 token
- `validatePassword()` - 密碼強度驗證
- `validatePhone()` - 手機號碼格式驗證
- `handleLoginFailure()` - 登入失敗處理 (5次鎖定30分鐘)
- `handleLoginSuccess()` - 登入成功處理

### 5. 視圖層 (View Layer)
#### `/views/auth/` - 認證頁面
- `login.ejs` - 登入頁面 (手機號碼+密碼 / LINE登入)
- `register.ejs` - 註冊頁面 (即時密碼強度檢查)
- `forgot-password.ejs` - 忘記密碼頁面

#### `/views/account_settings.ejs` - 帳號設定頁面 (已擴展)
- 密碼設定/修改功能
- 登入資訊顯示
- 危險操作區塊

### 6. 樣式層 (Style Layer)
#### `/public/css/auth.css` - 認證頁面樣式
- 一致的設計語言 (比照 card.css)
- 響應式設計
- 密碼強度指示器
- 載入動畫效果

## 安全機制

### 密碼安全
- **bcrypt** 加密，saltRounds: 12
- 密碼強度要求：
  - 至少 8 字元
  - 包含大小寫字母
  - 包含數字和特殊字元

### 帳號保護
- 登入失敗 5 次鎖定 30 分鐘
- 記住登入 token 7 天有效期
- 自動清理過期 token

### 數據驗證
- 手機號碼格式：`09xxxxxxxx`
- 即時前端驗證
- 後端二次驗證

## 功能特性

### 雙重認證方式
1. **LINE 登入** - OAuth 2.0 認證
2. **手機號碼 + 密碼** - 傳統登入方式

### 記住登入
- 7 天免登入
- 安全的 HttpOnly Cookie
- 自動 token 續期

### 用戶體驗
- 即時表單驗證
- 密碼強度視覺指示
- 載入狀態反饋
- 錯誤訊息提示

## 使用流程

### 新用戶註冊
1. 訪問 `/auth/register`
2. 填寫姓名、手機號碼、密碼
3. 即時密碼強度檢查
4. 後端驗證和帳號創建
5. 自動登入並跳轉

### 現有用戶登入
1. 訪問 `/auth/login`
2. 選擇登入方式：
   - 手機號碼 + 密碼
   - LINE 快速登入
3. 可選擇「記住我 7 天」
4. 登入成功跳轉到目標頁面

### 密碼管理
1. 已登入用戶訪問 `/account/settings`
2. 設定或修改密碼
3. 移除密碼登入功能
4. 帳號安全資訊查看

## 技術依賴

### NPM 套件
- `bcryptjs` - 密碼加密
- `cookie-parser` - Cookie 解析
- `express-session` - Session 管理
- `connect-mongo` - Session 存儲

### 前端技術
- 原生 JavaScript
- CSS3 動畫
- 響應式設計

## 部署注意事項

### 環境變數
```env
SESSION_SECRET=your_session_secret
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CALLBACK_URL=your_callback_url
```

### Cookie 設定
- Production 環境需要 HTTPS
- 適當的 sameSite 和 secure 設定

### 數據庫索引
- `phone` 字段唯一索引
- `rememberToken` 字段索引
- `lockUntil` 字段 TTL 索引

## 未來擴展

### 計劃功能
- 簡訊驗證碼登入
- 忘記密碼 SMS 重設
- 兩步驟驗證 (2FA)
- 社群平台登入 (Google, Facebook)

### 安全增強
- IP 黑名單
- 裝置指紋辨識
- 異常登入通知

## 測試建議

### 功能測試
- 註冊流程完整性
- 登入方式切換
- 密碼強度驗證
- 記住登入功能

### 安全測試
- 暴力破解保護
- Session 安全性
- Token 有效性
- 輸入過濾

## 維護指南

### 監控指標
- 登入成功率
- 帳號鎖定頻率
- Token 使用率
- 錯誤日誌

### 定期任務
- 清理過期 token
- 用戶行為分析
- 安全日誌檢查 
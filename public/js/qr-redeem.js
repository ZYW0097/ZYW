// QR碼兌換頁面功能
class QRRedeemPage {
    constructor() {
        this.storeSlug = '';
        this.qrCode = '';
        this.qrPoints = 0;
        this.isLoggedIn = false;
        this.hasCard = false;
        
        this.init();
    }
    
    init() {
        // 從URL獲取參數
        this.parseURLParams();
        
        // 檢查登入狀態
        this.checkLoginStatus();
        
        // 綁定事件
        this.bindEvents();
    }
    
    parseURLParams() {
        const pathParts = window.location.pathname.split('/');
        // URL格式: /{storeSlug}/points/qr/{code}
        if (pathParts.length >= 4) {
            this.storeSlug = pathParts[1];
            this.qrCode = pathParts[pathParts.length - 1];
        }
        
        // 從頁面元素獲取點數（如果有的話）
        const pointsElement = document.querySelector('.points-number');
        if (pointsElement) {
            this.qrPoints = parseInt(pointsElement.textContent) || 0;
        }
    }
    
    async checkLoginStatus() {
        try {
            const response = await fetch(`/${this.storeSlug}/api/user/status`, {
                method: 'GET',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success && result.user) {
                this.isLoggedIn = true;
                this.hasCard = result.hasCard || false;
                this.setupRedeemButton();
            } else {
                this.showLoginRequired();
            }
        } catch (error) {
            console.error('檢查登入狀態失敗:', error);
            this.showLoginRequired();
        }
    }
    
    showLoginRequired() {
        const container = document.querySelector('.qr-container');
        const subtitle = container.querySelector('.qr-subtitle');
        const redeemBtn = container.querySelector('#redeemBtn');
        
        subtitle.textContent = '請先登入以兌換點數';
        redeemBtn.textContent = 'LINE 登入';
        redeemBtn.className = 'login-btn';
        redeemBtn.onclick = () => this.redirectToLogin();
    }
    
    redirectToLogin() {
        // 將當前QR碼URL作為重定向參數傳遞給登入頁面
        const returnUrl = encodeURIComponent(window.location.href);
        
        // 跳轉到登入頁面並帶上重定向參數
        window.location.href = `/account/login?redirect=${returnUrl}`;
    }
    
    setupRedeemButton() {
        const redeemBtn = document.getElementById('redeemBtn');
        
        if (!this.hasCard) {
            redeemBtn.textContent = '領取集點卡並兌換';
        }
        
        redeemBtn.onclick = () => this.handleRedeem();
    }
    
    bindEvents() {
        // 不需要特殊處理，頁面載入時會自動檢查登入狀態
    }
    
    async handleRedeem() {
        const btn = document.getElementById('redeemBtn');
        const statusDiv = document.getElementById('statusMessage');
        
        // 禁用按鈕並顯示加載狀態
        btn.disabled = true;
        
        if (!this.hasCard) {
            btn.innerHTML = '<span class="loading-spinner"></span>領取集點卡中...';
            
            // 先領取集點卡
            try {
                const claimResponse = await fetch(`/${this.storeSlug}/api/points/claim`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const claimResult = await claimResponse.json();
                
                if (claimResult.success) {
                    this.hasCard = true;
                    this.showStatus('集點卡領取成功！正在兌換點數...', 'loading');
                    
                    // 短暫延遲後繼續兌換
                    setTimeout(() => this.performRedeem(), 1000);
                } else {
                    throw new Error(claimResult.error || '領取集點卡失敗');
                }
            } catch (error) {
                console.error('領取集點卡失敗:', error);
                this.showStatus('領取集點卡失敗：' + error.message, 'error');
                btn.disabled = false;
                btn.textContent = '重試領取';
                return;
            }
        } else {
            this.performRedeem();
        }
    }
    
    async performRedeem() {
        const btn = document.getElementById('redeemBtn');
        
        btn.innerHTML = '<span class="loading-spinner"></span>兌換中...';
        this.showStatus('正在處理兌換請求...', 'loading');
        
        try {
            const response = await fetch(`/${this.storeSlug}/points/qr/${this.qrCode}/redeem`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 根據是否為首次用戶顯示不同的成功訊息
                if (result.isFirstTime && result.firstReward > 0) {
                    this.showStatus(
                        `🎉 ${result.message}`, 
                        'success'
                    );
                    btn.textContent = '領取成功！';
                } else {
                    this.showStatus(result.message, 'success');
                    btn.textContent = '兌換成功！';
                }
                
                btn.style.background = '#28a745';
                
                // 如果是首次用戶，給更長的時間讓用戶看到完整訊息
                const delayTime = result.isFirstTime ? 4000 : 3000;
                
                // 延遲後跳轉到餐廳頁面
                setTimeout(() => {
                    window.location.href = `/${this.storeSlug}`;
                }, delayTime);
            } else {
                this.showStatus(result.message || '兌換失敗', 'error');
                btn.disabled = false;
                btn.textContent = '重試兌換';
            }
        } catch (error) {
            console.error('兌換錯誤:', error);
            this.showStatus('網路錯誤，請稍後再試', 'error');
            btn.disabled = false;
            btn.textContent = '重試兌換';
        }
    }
    
    showStatus(message, type) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.className = `status-message status-${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    new QRRedeemPage();
}); 
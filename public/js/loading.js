class LoadingManager {
    constructor() {
        this.slugname = null;
        this.init();
    }

    init() {
        // 從URL獲取參數
        const urlParams = new URLSearchParams(window.location.search);
        this.slugname = urlParams.get('slugname');
        
        if (!this.slugname) {
            this.showError('缺少系統識別碼參數');
            return;
        }

        this.startLoading();
    }

    async startLoading() {
        try {
            // 模擬載入過程
            await this.simulateLoading();
            
            // 檢查系統狀態
            await this.checkSystemStatus();
        } catch (error) {
            console.error('載入過程發生錯誤:', error);
            this.showError('系統載入失敗，請稍後再試');
        }
    }

    async simulateLoading() {
        const steps = [
            { id: 'step-1', duration: 1000, progress: 20, message: '建立資料庫記錄' },
            { id: 'step-2', duration: 1500, progress: 40, message: '處理圖片資源' },
            { id: 'step-3', duration: 1200, progress: 60, message: '配置系統功能' },
            { id: 'step-4', duration: 1800, progress: 80, message: '生成管理界面' },
            { id: 'step-5', duration: 1000, progress: 100, message: '系統初始化完成' }
        ];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            // 設置當前步驟為活動狀態
            if (i > 0) {
                const prevStep = document.getElementById(steps[i-1].id);
                if (prevStep) {
                    prevStep.classList.remove('active');
                    prevStep.classList.add('completed');
                    const stepNumber = prevStep.querySelector('.step-number');
                    if (stepNumber) stepNumber.textContent = '';
                }
            }
            
            const currentStep = document.getElementById(step.id);
            if (currentStep) {
                currentStep.classList.add('active');
            }
            
            // 更新進度條
            await this.animateProgress(step.progress, step.duration);
            
            // 等待該步驟完成
            await new Promise(resolve => setTimeout(resolve, step.duration));
        }

        // 最後一步完成
        const lastStep = document.getElementById('step-5');
        if (lastStep) {
            lastStep.classList.remove('active');
            lastStep.classList.add('completed');
            const stepNumber = lastStep.querySelector('.step-number');
            if (stepNumber) stepNumber.textContent = '';
        }
    }

    animateProgress(targetProgress, duration) {
        return new Promise(resolve => {
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            if (!progressFill || !progressText) {
                resolve();
                return;
            }

            const startProgress = parseInt(progressFill.style.width) || 0;
            const increment = (targetProgress - startProgress) / (duration / 50);
            let currentProgress = startProgress;

            const animation = setInterval(() => {
                currentProgress += increment;
                if (currentProgress >= targetProgress) {
                    currentProgress = targetProgress;
                    clearInterval(animation);
                    resolve();
                }
                
                progressFill.style.width = currentProgress + '%';
                progressText.textContent = Math.round(currentProgress) + '% 完成';
            }, 50);
        });
    }

    async checkSystemStatus() {
        try {
            // 向後端API請求系統狀態
            const response = await fetch(`/api/client/${this.slugname}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.client) {
                this.showSuccess(data.client);
            } else {
                this.showError(data.error || '找不到指定的系統');
            }
        } catch (error) {
            console.error('檢查系統狀態失敗:', error);
            this.showError('無法連接到伺服器，請檢查網路連接');
        }
    }

    showSuccess(client) {
        // 隱藏載入內容
        const loadingContent = document.getElementById('loadingContent');
        if (loadingContent) {
            loadingContent.style.display = 'none';
        }
        
        // 填入系統資訊（使用後端提供的安全資料）
        this.updateSystemInfo(client);
        
        // 設置按鈕連結
        this.setupActionButtons(client.slugname);
        
        // 顯示成功頁面
        const successContent = document.getElementById('successContent');
        if (successContent) {
            successContent.classList.add('show');
            
            // 延遲添加粒子效果
            setTimeout(() => this.addParticleEffect(), 300);
        }
    }

    updateSystemInfo(client) {
        // 安全地更新系統資訊，使用後端驗證過的資料
        const infoMap = {
            'clientName': client.clientname || '-',
            'slugName': client.slugname || '-',
            'frontendUrl': `https://zyw.onrender.com/${client.slugname}`,
            'backendUrl': `https://zyw.onrender.com/${client.slugname}/backstage-login`
        };

        Object.entries(infoMap).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    setupActionButtons(slugname) {
        const visitRestaurantBtn = document.getElementById('visitRestaurantBtn');
        const visitBackstageBtn = document.getElementById('visitBackstageBtn');
        
        if (visitRestaurantBtn) {
            visitRestaurantBtn.href = `/${slugname}`;
        }
        
        if (visitBackstageBtn) {
            visitBackstageBtn.href = `/${slugname}/backstage-login`;
        }
    }

    showError(message) {
        // 隱藏載入內容
        const loadingContent = document.getElementById('loadingContent');
        if (loadingContent) {
            loadingContent.style.display = 'none';
        }
        
        // 顯示錯誤詳情
        const errorDetails = document.getElementById('errorDetails');
        if (errorDetails) {
            errorDetails.textContent = message;
        }
        
        // 顯示錯誤頁面
        const errorContent = document.getElementById('errorContent');
        if (errorContent) {
            errorContent.classList.add('show');
        }
    }

    addParticleEffect() {
        const successIcon = document.querySelector('.success-icon');
        if (!successIcon) return;

        // 創建粒子效果
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 6px;
                height: 6px;
                background: #28a745;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                animation: particle-${i} 2s infinite;
                opacity: 0;
                pointer-events: none;
            `;
            
            // 創建粒子動畫
            const keyframes = `
                @keyframes particle-${i} {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(0);
                    }
                    50% {
                        opacity: 1;
                        transform: translate(${(i % 2 === 0 ? 1 : -1) * (30 + i * 10)}px, ${(i % 3 === 0 ? 1 : -1) * (20 + i * 5)}px) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(${(i % 2 === 0 ? 1 : -1) * (50 + i * 15)}px, ${(i % 3 === 0 ? 1 : -1) * (40 + i * 10)}px) scale(0);
                    }
                }
            `;
            
            // 將動畫樣式添加到頁面
            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);
            
            successIcon.appendChild(particle);
        }
    }

    // 清理資源
    cleanup() {
        // 清理動畫和事件監聽器
        const particles = document.querySelectorAll('.success-icon > div');
        particles.forEach(particle => particle.remove());
        
        // 清理動態添加的樣式
        const dynamicStyles = document.querySelectorAll('style[data-particle]');
        dynamicStyles.forEach(style => style.remove());
    }
}

// 全域變數
let loadingManager;

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    loadingManager = new LoadingManager();
});

// 頁面卸載時清理資源
window.addEventListener('beforeunload', () => {
    if (loadingManager) {
        loadingManager.cleanup();
    }
});

// 監聽成功頁面顯示
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target.id === 'successContent' && target.classList.contains('show')) {
                // 成功頁面已顯示，可以執行額外的初始化
                console.log('成功頁面已顯示');
            }
        }
    });
});

// 開始觀察成功內容元素
const successContent = document.getElementById('successContent');
if (successContent) {
    observer.observe(successContent, {
        attributes: true,
        attributeFilter: ['class']
    });
} 
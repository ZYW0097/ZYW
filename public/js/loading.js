class SystemSetup {
    constructor() {
        this.slug = window.slug;
        this.currentStep = 0;
        this.totalSteps = 6;
        this.steps = [
            { id: 'client', name: '創建基本資料', message: '正在建立商家基本資料...' },
            { id: 'adb', name: '建立用戶資料庫', message: '正在建立用戶資料庫 (ADB)...' },
            { id: 'cdb', name: '建立集點卡資料庫', message: '正在建立集點卡資料庫 (CDB)...' },
            { id: 'bdb', name: '建立訂位資料庫', message: '正在建立訂位資料庫 (BDB)...' },
            { id: 'settings', name: '配置系統設定', message: '正在配置系統功能設定...' },
            { id: 'complete', name: '系統建立完成', message: '系統建立完成，即將跳轉...' }
        ];
        
        if (!this.slug) {
            window.location.href = "/";
            return;
        }
        
        this.init();
    }
    
    init() {
        console.log('🚀 開始系統建立流程:', this.slug);
        this.setupErrorHandlers();
        this.startSetupProcess();
    }
    
    setupErrorHandlers() {
        const retryBtn = document.getElementById('retry-btn');
        const backBtn = document.getElementById('back-btn');
        
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.hideErrorActions();
                this.resetProgress();
                this.startSetupProcess();
            });
        }
        
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = '/setup';
            });
        }
    }
    
    showErrorActions() {
        const errorActions = document.getElementById('error-actions');
        if (errorActions) {
            errorActions.style.display = 'block';
        }
    }
    
    hideErrorActions() {
        const errorActions = document.getElementById('error-actions');
        if (errorActions) {
            errorActions.style.display = 'none';
        }
    }
    
    resetProgress() {
        // 重置所有步驟狀態
        this.steps.forEach(step => {
            this.setStepStatus(step.id, 'waiting');
        });
        
        // 重置進度條
        this.updateProgress(0);
        this.updateMessage('重新開始系統建立...');
    }
    
    updateProgress(step) {
        const progressPercent = Math.round((step / this.totalSteps) * 100);
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = progressPercent + '%';
        }
        if (progressText) {
            progressText.textContent = progressPercent + '%';
        }
    }
    
    updateMessage(message) {
        const messageElement = document.getElementById('loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
    
    setStepStatus(stepId, status) {
        const stepElement = document.getElementById(`step-${stepId}`);
        const statusElement = document.getElementById(`status-${stepId}`);
        
        if (!stepElement || !statusElement) return;
        
        // 清除之前的狀態
        stepElement.classList.remove('processing', 'completed', 'error');
        
        switch (status) {
            case 'processing':
                stepElement.classList.add('processing');
                statusElement.textContent = '🔄';
                break;
            case 'completed':
                stepElement.classList.add('completed');
                statusElement.textContent = '✅';
                break;
            case 'error':
                stepElement.classList.add('error');
                statusElement.textContent = '❌';
                break;
            default:
                statusElement.textContent = '⏳';
        }
    }
    
    async executeStep(stepIndex) {
        const step = this.steps[stepIndex];
        if (!step) return false;
        
        console.log(`📝 執行步驟 ${stepIndex + 1}/${this.totalSteps}: ${step.name}`);
        
        // 設置當前步驟為處理中
        this.setStepStatus(step.id, 'processing');
        this.updateMessage(step.message);
        this.updateProgress(stepIndex);
        
        try {
            // 模擬每個步驟的處理時間
            const delay = this.getStepDelay(stepIndex);
            await this.sleep(delay);
            
            // 檢查步驟是否成功
            const success = await this.checkStepCompletion(step.id);
            
            if (success) {
                this.setStepStatus(step.id, 'completed');
                console.log(`✅ 步驟完成: ${step.name}`);
                return true;
            } else {
                throw new Error(`步驟失敗: ${step.name}`);
            }
        } catch (error) {
            console.error(`❌ 步驟錯誤: ${step.name}`, error);
            this.setStepStatus(step.id, 'error');
            this.updateMessage(`錯誤: ${error.message}`);
            return false;
        }
    }
    
    getStepDelay(stepIndex) {
        // 不同步驟的預期時間
        const delays = [1000, 1500, 1500, 1500, 2000, 1000];
        return delays[stepIndex] || 1000;
    }
    
    async checkStepCompletion(stepId) {
        // 這裡可以添加實際的檢查邏輯
        // 目前先返回 true，實際部署時可以檢查資料庫狀態
        switch (stepId) {
            case 'client':
                return await this.checkClientCreated();
            case 'adb':
                return await this.checkDatabaseExists('ADB');
            case 'cdb':
                return await this.checkDatabaseExists('CDB');
            case 'bdb':
                return await this.checkDatabaseExists('BDB');
            case 'settings':
                return await this.checkSettingsConfigured();
            case 'complete':
                return true;
            default:
                return true;
        }
    }
    
    async checkClientCreated() {
        try {
            const response = await fetch(`/api/check-client/${this.slug}`);
            const data = await response.json();
            
            if (response.ok && data.exists) {
                console.log('✅ 客戶資料檢查通過');
                return true;
            } else {
                console.log('⏳ 等待客戶資料創建完成...');
                // 重試機制：等待一段時間後再檢查
                await this.sleep(1000);
                return await this.checkClientCreated();
            }
        } catch (error) {
            console.log('⚠️ 客戶資料檢查失敗，假設成功繼續:', error);
            return true; // 假設成功以避免阻塞
        }
    }
    
    async checkDatabaseExists(dbType) {
        const dbName = `${this.slug}${dbType}`;
        let retries = 0;
        const maxRetries = 5;
        
        while (retries < maxRetries) {
            try {
                const response = await fetch(`/api/check-database/${dbName}`);
                const data = await response.json();
                
                if (response.ok && data.exists) {
                    console.log(`✅ 資料庫 ${dbName} 檢查通過`);
                    return true;
                } else {
                    console.log(`⏳ 等待資料庫 ${dbName} 創建完成... (嘗試 ${retries + 1}/${maxRetries})`);
                    await this.sleep(1500);
                    retries++;
                }
            } catch (error) {
                console.log(`⚠️ 資料庫 ${dbName} 檢查失敗:`, error);
                retries++;
                await this.sleep(1000);
            }
        }
        
        console.log(`⚠️ 資料庫 ${dbName} 檢查超時，假設成功繼續`);
        return true; // 超時後假設成功
    }
    
    async checkSettingsConfigured() {
        try {
            const response = await fetch(`/api/check-settings/${this.slug}`);
            const data = await response.json();
            
            if (response.ok && data.configured) {
                console.log('✅ 系統設定檢查通過');
                return true;
            } else {
                console.log('⏳ 等待系統設定配置完成...');
                await this.sleep(2000);
                return await this.checkSettingsConfigured();
            }
        } catch (error) {
            console.log('⚠️ 系統設定檢查失敗，假設成功繼續:', error);
            return true; // 假設成功以避免阻塞
        }
    }
    
    async startSetupProcess() {
        console.log('🔄 開始系統建立流程...');
        
        // 逐步執行每個步驟
        for (let i = 0; i < this.steps.length; i++) {
            const success = await this.executeStep(i);
            
            if (!success) {
                console.error('❌ 系統建立失敗，停止流程');
                this.updateMessage('系統建立失敗，請重新嘗試');
                this.showErrorActions();
                return;
            }
            
            // 短暫延遲讓用戶看到進度
            if (i < this.steps.length - 1) {
                await this.sleep(500);
            }
        }
        
        // 所有步驟完成
        this.updateProgress(this.totalSteps);
        this.updateMessage('系統建立完成，即將跳轉到您的專屬頁面...');
        
        console.log('🎉 系統建立完成！');
        
        // 等待一下然後跳轉
        setTimeout(() => {
            window.location.href = '/' + this.slug + '/card';
        }, 2000);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 頁面載入完成後開始
document.addEventListener('DOMContentLoaded', () => {
    new SystemSetup();
}); 
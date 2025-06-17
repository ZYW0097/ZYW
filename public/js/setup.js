class SetupManager {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 4;
        this.selectedFeatures = { booking: true, points: false };
        
        this.init();
    }

    init() {
        this.updateStepDisplay();
        this.setupFeatureSelection();
        this.setupPasswordValidation();
        this.updateUrlPreview();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 步驟導航點擊事件
        document.querySelectorAll('.step-item').forEach((item, index) => {
            item.addEventListener('click', () => this.handleStepNavClick(index + 1));
        });

        // 表單提交事件
        const form = document.getElementById('setupForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitForm();
            });
        }
    }

    handleStepNavClick(targetStep) {
        if (targetStep < this.currentStep) {
            // 計算實際步驟對應
            if (targetStep === 1) this.currentStep = 1;
            else if (targetStep === 2) this.currentStep = 2;
            else if (targetStep === 3) {
                if (this.selectedFeatures.booking) this.currentStep = 3;
                else if (this.selectedFeatures.points) this.currentStep = 4;
            }
            else if (targetStep === 4) this.currentStep = 5;
            else if (targetStep === 5) this.currentStep = 6;
            
            this.updateStepDisplay();
        }
    }

    changeStep(direction) {
        if (direction === 1) {
            if (!this.validateCurrentStep()) return;
        }

        // 計算下一步驟
        if (direction === 1) {
            if (this.currentStep === 2) {
                // 從功能選擇進入設定步驟
                if (this.selectedFeatures.booking && !this.selectedFeatures.points) {
                    this.currentStep = 3; // 直接到步驟3 (訂位設定)
                } else if (!this.selectedFeatures.booking && this.selectedFeatures.points) {
                    this.currentStep = 4; // 直接到步驟4 (集點卡設定)
                } else if (this.selectedFeatures.booking && this.selectedFeatures.points) {
                    this.currentStep = 3; // 先到訂位設定
                }
            } else if (this.currentStep === 3 && this.selectedFeatures.booking && this.selectedFeatures.points) {
                this.currentStep = 4; // 從訂位設定到集點卡設定
            } else if (this.currentStep === 3 || this.currentStep === 4) {
                this.currentStep = 5; // 到密碼設定
            } else if (this.currentStep === 5) {
                this.currentStep = 6; // 到完成頁面
            } else {
                this.currentStep++;
            }
        } else {
            // 返回上一步邏輯
            if (this.currentStep === 6) {
                this.currentStep = 5; // 從完成回到密碼設定
            } else if (this.currentStep === 5) {
                if (this.selectedFeatures.booking && this.selectedFeatures.points) {
                    this.currentStep = 4; // 回到集點卡設定
                } else if (this.selectedFeatures.booking) {
                    this.currentStep = 3; // 回到訂位設定
                } else if (this.selectedFeatures.points) {
                    this.currentStep = 4; // 回到集點卡設定
                }
            } else if (this.currentStep === 4 && this.selectedFeatures.booking && this.selectedFeatures.points) {
                this.currentStep = 3; // 從集點卡回到訂位
            } else if (this.currentStep === 3 || this.currentStep === 4) {
                this.currentStep = 2; // 回到功能選擇
            } else {
                this.currentStep--;
            }
        }

        if (this.currentStep < 1) this.currentStep = 1;
        if (this.currentStep > 6) this.currentStep = 6;

        this.updateStepDisplay();
    }

    updateStepDisplay() {
        // 隱藏所有步驟
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });

        // 顯示當前步驟和更新標題
        let stepToShow = '';
        let stepTitle = '';
        
        switch(this.currentStep) {
            case 1:
                stepToShow = 'step-1';
                stepTitle = '基本資料設定';
                break;
            case 2:
                stepToShow = 'step-2';
                stepTitle = '功能選擇';
                break;
            case 3:
                stepToShow = 'step-2a';
                stepTitle = '訂位系統設定';
                break;
            case 4:
                stepToShow = 'step-2b';
                stepTitle = '集點卡系統設定';
                break;
            case 5:
                stepToShow = 'step-3';
                stepTitle = '後台密碼設定';
                break;
            case 6:
                stepToShow = 'step-4';
                stepTitle = '完成設定';
                break;
        }

        if (stepToShow) {
            const stepElement = document.getElementById(stepToShow);
            if (stepElement) stepElement.classList.add('active');
        }

        const titleElement = document.getElementById('step-title');
        if (titleElement) titleElement.textContent = stepTitle;

        // 更新步驟導航
        this.updateStepNavigation();

        // 更新按鈕
        this.updateButtons();
    }

    updateStepNavigation() {
        const stepNavs = document.querySelectorAll('.step-item');
        const stepMapping = {
            1: 0, // 基本資料 -> 導航第1步
            2: 1, // 功能選擇 -> 導航第2步
            3: 2, // 訂位設定 -> 導航第2A步
            4: 2, // 集點卡設定 -> 導航第2A步 (共用)
            5: 3, // 密碼設定 -> 導航第3步
            6: 4  // 完成 -> 導航第4步
        };

        stepNavs.forEach((nav, index) => {
            nav.classList.remove('active', 'completed');
            const currentNavStep = stepMapping[this.currentStep];
            
            if (index < currentNavStep) {
                nav.classList.add('completed');
            } else if (index === currentNavStep) {
                nav.classList.add('active');
            }
        });
    }

    updateButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) {
            prevBtn.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';
        }

        if (nextBtn) {
            if (this.currentStep === 6) {
                nextBtn.textContent = '創建系統';
                nextBtn.onclick = () => this.submitForm();
            } else {
                nextBtn.textContent = '下一步 →';
                nextBtn.onclick = () => this.changeStep(1);
            }
        }
    }

    validateCurrentStep() {
        const activeStep = document.querySelector('.form-step.active');
        if (!activeStep) return false;

        const requiredFields = activeStep.querySelectorAll('input[required], textarea[required]');
        
        for (let field of requiredFields) {
            if (!field.value.trim()) {
                this.showError('請填寫所有必填欄位');
                field.focus();
                return false;
            }
        }

        // 特殊驗證
        if (this.currentStep === 2) {
            if (!this.selectedFeatures.booking && !this.selectedFeatures.points) {
                this.showError('請至少選擇一個功能');
                return false;
            }
        }

        if (this.currentStep === 5) {
            const password = document.getElementById('adminPassword')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;
            
            if (password && !this.validatePassword(password)) {
                this.showError('密碼不符合要求');
                return false;
            }
            
            if (password !== confirmPassword) {
                this.showError('密碼確認不一致');
                return false;
            }
        }

        this.hideError();
        return true;
    }

    setupFeatureSelection() {
        const featureCards = document.querySelectorAll('.feature-card');
        
        featureCards.forEach(card => {
            card.addEventListener('click', () => {
                const feature = card.dataset.feature;
                
                if (feature === 'booking') {
                    this.selectedFeatures.booking = !this.selectedFeatures.booking;
                } else if (feature === 'points') {
                    this.selectedFeatures.points = !this.selectedFeatures.points;
                }

                this.updateFeatureSelection();
            });
        });
    }

    updateFeatureSelection() {
        const bookingCard = document.getElementById('booking-card');
        const pointsCard = document.getElementById('points-card');

        if (bookingCard) {
            bookingCard.classList.toggle('selected', this.selectedFeatures.booking);
        }
        if (pointsCard) {
            pointsCard.classList.toggle('selected', this.selectedFeatures.points);
        }

        const bookingInput = document.getElementById('bookingSystem');
        const pointsInput = document.getElementById('pointsSystem');
        
        if (bookingInput) bookingInput.value = this.selectedFeatures.booking;
        if (pointsInput) pointsInput.value = this.selectedFeatures.points;
    }

    setupPasswordValidation() {
        const passwordField = document.getElementById('adminPassword');
        if (passwordField) {
            passwordField.addEventListener('input', (e) => {
                this.validatePasswordStrength(e.target.value);
            });
        }
    }

    validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*]/.test(password);

        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    }

    validatePasswordStrength(password) {
        // 可以添加實時密碼強度顯示邏輯
        console.log('Password strength check:', password.length);
    }

    updateUrlPreview() {
        const slugField = document.getElementById('slugname');
        const urlSpan = document.getElementById('urlSlugname');
        
        if (slugField && urlSpan) {
            slugField.addEventListener('input', (e) => {
                urlSpan.textContent = e.target.value || '您的系統識別碼';
            });
        }
    }

    // 圖片預覽功能
    previewImage(input, previewId) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById(previewId);
                if (preview) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    previewTutorialImage(input, previewId) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById(previewId);
                const placeholder = document.getElementById(previewId.replace('preview', 'placeholder'));
                
                if (preview && placeholder) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    placeholder.style.display = 'none';
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    // 動態列表管理
    addTimeSlot() {
        const list = document.getElementById('timeSlots-list');
        if (!list) return;

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <input type="text" name="timeSlots[]" placeholder="例如: 12:00" required pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$">
            <button type="button" class="list-btn add-btn" onclick="setupManager.addTimeSlot()">+</button>
            <button type="button" class="list-btn remove-btn" onclick="setupManager.removeItem(this)">-</button>
        `;
        list.appendChild(div);
        this.updateListButtons(list);
    }

    addDiningRule() {
        const list = document.getElementById('diningRules-list');
        if (!list) return;

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <input type="text" name="diningRules[]" placeholder="請輸入訂位規則" required>
            <button type="button" class="list-btn add-btn" onclick="setupManager.addDiningRule()">+</button>
            <button type="button" class="list-btn remove-btn" onclick="setupManager.removeItem(this)">-</button>
        `;
        list.appendChild(div);
        this.updateListButtons(list);
    }

    addReward() {
        const list = document.getElementById('rewards-list');
        if (!list) return;

        const div = document.createElement('div');
        div.className = 'list-item reward-item';
        div.innerHTML = `
            <input type="text" name="rewardNames[]" placeholder="獎勵名稱" required>
            <input type="number" name="rewardPoints[]" placeholder="所需點數" required min="1">
            <input type="file" name="rewardImages[]" accept=".png,.jpg,.jpeg">
            <div class="reward-buttons">
                <button type="button" class="list-btn add-btn" onclick="setupManager.addReward()">+</button>
                <button type="button" class="list-btn remove-btn" onclick="setupManager.removeItem(this)">-</button>
            </div>
        `;
        list.appendChild(div);
        this.updateListButtons(list);
    }

    addPointRule() {
        const list = document.getElementById('pointRules-list');
        if (!list) return;

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <input type="text" name="pointRules[]" placeholder="請輸入集點卡規則" required>
            <button type="button" class="list-btn add-btn" onclick="setupManager.addPointRule()">+</button>
            <button type="button" class="list-btn remove-btn" onclick="setupManager.removeItem(this)">-</button>
        `;
        list.appendChild(div);
        this.updateListButtons(list);
    }

    removeItem(btn) {
        const listItem = btn.closest('.list-item');
        const list = listItem.parentElement;
        listItem.remove();
        this.updateListButtons(list);
    }

    updateListButtons(list) {
        const items = list.querySelectorAll('.list-item');
        items.forEach((item, index) => {
            const addBtn = item.querySelector('.add-btn');
            const removeBtn = item.querySelector('.remove-btn');
            
            if (addBtn) addBtn.style.display = (index === items.length - 1) ? 'block' : 'none';
            if (removeBtn) removeBtn.style.display = items.length > 1 ? 'block' : 'none';
        });
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    hideError() {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    async submitForm() {
        if (!this.validateCurrentStep()) return;

        const formData = new FormData(document.getElementById('setupForm'));
        
        try {
            // 收集時段數據
            const timeSlots = Array.from(document.querySelectorAll('input[name="timeSlots[]"]'))
                .map(input => input.value.trim())
                .filter(value => value);
            formData.append('timeSlots', JSON.stringify(timeSlots));

            // 收集規則數據
            const diningRules = Array.from(document.querySelectorAll('input[name="diningRules[]"]'))
                .map(input => input.value.trim())
                .filter(value => value);
            formData.append('diningRules', JSON.stringify(diningRules));

            // 收集集點卡獎勵數據
            if (this.selectedFeatures.points) {
                const rewardNames = Array.from(document.querySelectorAll('input[name="rewardNames[]"]'))
                    .map(input => input.value.trim())
                    .filter(value => value);
                const rewardPoints = Array.from(document.querySelectorAll('input[name="rewardPoints[]"]'))
                    .map(input => input.value.trim())
                    .filter(value => value);
                const pointRules = Array.from(document.querySelectorAll('input[name="pointRules[]"]'))
                    .map(input => input.value.trim())
                    .filter(value => value);
                
                formData.append('rewardNames', JSON.stringify(rewardNames));
                formData.append('rewardPoints', JSON.stringify(rewardPoints));
                formData.append('pointRules', JSON.stringify(pointRules));
            }

            // 提交到後端處理
            const response = await fetch('/api/setup', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                const slugname = document.getElementById('slugname')?.value;
                if (slugname) {
                    window.location.href = `/loading?slugname=${slugname}`;
                }
            } else {
                this.showError(data.error || '系統建立失敗');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('網路錯誤，請稍後再試');
        }
    }
}

// 全域函數，供HTML使用
let setupManager;

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    setupManager = new SetupManager();
});

// 全域函數供HTML調用
function changeStep(direction) {
    if (setupManager) {
        setupManager.changeStep(direction);
    }
}

function previewImage(input, previewId) {
    if (setupManager) {
        setupManager.previewImage(input, previewId);
    }
}

function previewTutorialImage(input, previewId) {
    if (setupManager) {
        setupManager.previewTutorialImage(input, previewId);
    }
}

function addTimeSlot() {
    if (setupManager) {
        setupManager.addTimeSlot();
    }
}

function addDiningRule() {
    if (setupManager) {
        setupManager.addDiningRule();
    }
}

function addReward() {
    if (setupManager) {
        setupManager.addReward();
    }
}

function addPointRule() {
    if (setupManager) {
        setupManager.addPointRule();
    }
}

function removeItem(btn) {
    if (setupManager) {
        setupManager.removeItem(btn);
    }
} 
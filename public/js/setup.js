class SetupManager {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 4;
        this.selectedFeatures = { booking: true, points: false };
        
        this.init();
    }

    init() {
        
        // 初始化時確保功能選擇狀態正確 - 預設訂位系統開啟
        this.selectedFeatures = { booking: true, points: false };
        
        // 按順序初始化基本功能
        this.setupFeatureSelection();
        this.setupPasswordValidation(); 
        this.updateUrlPreview();
        this.setupEventListeners();
        
        // 初始化UI狀態（僅更新功能選擇的視覺狀態，不調用按鈕更新）
        this.updateFeatureSelectionUI();
        
        // 最後更新整體顯示狀態（包括步驟導航和按鈕）
        this.updateStepDisplay();
        
        // 初始化按鈕狀態
        setTimeout(() => {
            this.updateButtons();
        }, 500);
        
        // 設定拖拽支援
        setTimeout(() => {
            setupDragAndDrop();
        }, 600);
        
        // 初始化訂位設定切換邏輯
        this.setupBookingSettings();
        
        // 初始化集點卡設定切換邏輯
        this.setupPointsSettings();
        
    }

    setupEventListeners() {
        // 步驟導航點擊事件
        document.querySelectorAll('.step-item').forEach((item, index) => {
            item.addEventListener('click', () => this.handleStepNavClick(index + 1));
        });

        // 建立系統按鈕事件
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitForm();
            });
        }

        // 表單提交事件
        const form = document.getElementById('setupForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitForm();
            });
        }

        // 客戶名稱輸入驗證
        const clientnameInput = document.getElementById('clientname');
        if (clientnameInput) {
            let clientnameTimeout;
            clientnameInput.addEventListener('input', (e) => {
                clearTimeout(clientnameTimeout);
                clientnameTimeout = setTimeout(() => {
                    this.checkClientnameAvailability(e.target.value);
                    this.updateButtons(); // 更新按鈕狀態
                }, 500);
            });
        }

        // 動態標識輸入驗證
        const slugnameInput = document.getElementById('slugname');
        if (slugnameInput) {
            let slugnameTimeout;
            slugnameInput.addEventListener('input', (e) => {
                clearTimeout(slugnameTimeout);
                slugnameTimeout = setTimeout(() => {
                    this.checkSlugname(e.target.value);
                    this.updateButtons(); // 更新按鈕狀態
                }, 500);
            });
        }

        // 為所有輸入欄位添加事件監聽器以實時更新按鈕狀態
        this.setupRealTimeValidation();
    }

    setupRealTimeValidation() {
        // 為所有輸入欄位添加實時驗證
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            ['input', 'change', 'blur'].forEach(eventType => {
                input.addEventListener(eventType, () => {
                    // 延遲一點更新按鈕狀態，確保驗證完成
                    setTimeout(() => {
                        this.updateButtons();
                    }, 100);
                });
            });
        });

        // 為檔案輸入添加特殊處理
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.addEventListener('change', () => {
                setTimeout(() => {
                    this.updateButtons();
                }, 100);
            });
        });

        // 為密碼欄位添加特殊處理
        const passwordField = document.getElementById('adminPassword');
        const confirmPasswordField = document.getElementById('confirmPassword');
        if (passwordField) {
            passwordField.addEventListener('input', () => {
                this.validatePasswordStrength(passwordField.value);
                setTimeout(() => {
                    this.updateButtons();
                }, 100);
            });
        }
        if (confirmPasswordField) {
            confirmPasswordField.addEventListener('input', () => {
                setTimeout(() => {
                    this.updateButtons();
                }, 100);
            });
        }
    }

    handleStepNavClick(targetStep) {
        if (targetStep <= this.getCurrentMaxStep()) {
            const steps = this.getVisibleSteps();
            if (targetStep <= steps.length) {
                this.currentStep = steps[targetStep - 1].current;
                this.updateStepDisplay();
            }
        }
    }

    getCurrentMaxStep() {
        // 計算用戶已完成的最大步驟
        let maxStep = 1;
        
        // 如果基本資料已填寫
        const clientname = document.getElementById('clientname')?.value;
        const slugname = document.getElementById('slugname')?.value;
        if (clientname && slugname) {
            maxStep = Math.max(maxStep, 2);
        }
        
        // 如果功能已選擇
        if (this.selectedFeatures.booking || this.selectedFeatures.points) {
            maxStep = Math.max(maxStep, 3);
            if (this.selectedFeatures.booking && this.selectedFeatures.points) {
                maxStep = Math.max(maxStep, 4);
            }
        }
        
        return Math.min(maxStep, this.currentStep);
    }

    changeStep(direction) {
        if (direction === 1) {
            if (!this.validateCurrentStep()) return;
            if (!this.canProceedToNextStep()) return;
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
                } else {
                    // 如果沒有選擇任何功能，直接跳到密碼設定
                    this.currentStep = 5;
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
                } else {
                    // 如果沒有選擇任何功能，直接回到功能選擇
                    this.currentStep = 2;
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
            if (stepElement) {
                stepElement.classList.add('active');
            } else {
                console.error('Step element not found:', stepToShow);
            }
        }

        const titleElement = document.getElementById('step-title');
        if (titleElement) {
            titleElement.textContent = stepTitle;
        }

        // 更新步驟導航
        this.updateStepNavigation();

        // 更新按鈕
        this.updateButtons();
        
        // 滾動到頁面頂部
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    updateStepNavigation() {
        
        const stepNavs = document.querySelectorAll('.step-item');
        const stepLines = document.querySelectorAll('.step-line');
        
        
        // 重置所有步驟
        stepNavs.forEach((nav, index) => {
            nav.classList.remove('active', 'completed', 'hidden');
        });

        // 根據選擇的功能決定顯示哪些步驟
        const steps = this.getVisibleSteps();
        
        // 隱藏多餘的步驟導航元素
        stepNavs.forEach((nav, index) => {
            if (index >= steps.length) {
                nav.classList.add('hidden');
            } else {
                nav.classList.remove('hidden');
            }
        });
        
        // 同時隱藏多餘的分隔線
        stepLines.forEach((line, index) => {
            if (index >= steps.length - 1) {
                line.style.display = 'none';
            } else {
                line.style.display = 'block';
            }
        });
        
        // 更新顯示的步驟
        steps.forEach((step, index) => {
            const nav = stepNavs[index];
            if (nav) {
                const circle = nav.querySelector('.step-circle');
                if (circle) {
                    circle.textContent = step.number;
                }
                
                if (step.current < this.currentStep) {
                    nav.classList.add('completed');
                } else if (step.current === this.currentStep) {
                    nav.classList.add('active');
                }
            }
        });
        
    }

    getVisibleSteps() {


        // 步驟一：未進入步驟二或尚未選擇功能 -> 1 > 2 > 3 > 4
        if (this.currentStep === 1) {
            return [
                { number: '1', current: 1 }, // 基本資料
                { number: '2', current: 2 }, // 功能選擇
                { number: '3', current: 5 }, // 密碼設定
                { number: '4', current: 6 }  // 完成
            ];
        }

        // 步驟二以後：根據功能選擇決定步驟顯示
        const steps = [
            { number: '1', current: 1 }, // 基本資料
            { number: '2', current: 2 }  // 功能選擇
        ];

        // 判斷功能選擇
        const hasBooking = this.selectedFeatures.booking;
        const hasPoints = this.selectedFeatures.points;

        if (hasBooking && hasPoints) {
            // 兩個都選擇：1 > 2 > 2-1 > 2-2 > 3 > 4 (6個步驟)
            steps.push({ number: '2-1', current: 3 }); // 訂位設定
            steps.push({ number: '2-2', current: 4 }); // 集點卡設定
            steps.push({ number: '3', current: 5 }); // 密碼設定
            steps.push({ number: '4', current: 6 }); // 完成
        } else if (hasBooking || hasPoints) {
            // 只選擇一個：1 > 2 > 2-1 > 3 > 4 (5個步驟)
            steps.push({ number: '2-1', current: hasBooking ? 3 : 4 }); // 設定步驟
            steps.push({ number: '3', current: 5 }); // 密碼設定
            steps.push({ number: '4', current: 6 }); // 完成
        } else {
            // 在步驟2但沒選功能時：1 > 2 > 3 > 4 (4個步驟)
            steps.push({ number: '3', current: 5 }); // 密碼設定
            steps.push({ number: '4', current: 6 }); // 完成
        }

        return steps;
    }

    updateButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');
        
        // 計算實際的最後一步 - 步驟6是完成頁面
        const lastStep = 6;



        if (prevBtn) {
            if (this.currentStep > 1) {
                prevBtn.style.setProperty('display', 'inline-flex', 'important');
            } else {
                prevBtn.style.setProperty('display', 'none', 'important');
            }
        }

        if (nextBtn && submitBtn) {
            if (this.currentStep === lastStep) {
                // 在最後一步（完成頁面），隱藏下一步按鈕，顯示建立系統按鈕
                nextBtn.style.setProperty('display', 'none', 'important');
                submitBtn.style.setProperty('display', 'inline-flex', 'important');
                
                // 檢查是否可以提交
                const canSubmit = this.canProceedToNextStep();
                this.setButtonState(submitBtn, canSubmit);
            } else {
                // 在其他步驟，顯示下一步按鈕，隱藏建立系統按鈕
                nextBtn.style.setProperty('display', 'inline-flex', 'important');
                nextBtn.textContent = '下一步 →';
                submitBtn.style.setProperty('display', 'none', 'important');
                
                // 檢查是否可以進入下一步
                const canProceed = this.canProceedToNextStep();
                this.setButtonState(nextBtn, canProceed);
            }
        }

        // 強制刷新，確保狀態正確
        setTimeout(() => {

        }, 100);
    }

    setButtonState(button, enabled) {
        if (button) {
            button.disabled = !enabled;
            button.style.cursor = enabled ? 'pointer' : 'not-allowed';
            
            if (enabled) {
                button.classList.remove('btn-disabled');
            } else {
                button.classList.add('btn-disabled');
            }
        }
    }

    canProceedToNextStep() {
        // 檢查當前步驟是否可以進入下一步
        switch(this.currentStep) {
            case 1:
                return this.validateStep1();
            case 2:
                return this.validateStep2();
            case 3:
                return this.validateStep3();
            case 4:
                return this.validateStep4();
            case 5:
                return this.validateStep5();
            case 6:
                return true; // 完成頁面總是可以提交
            default:
                return false;
        }
    }

    validateStep1() {
        // 檢查步驟1：基本資料
        const clientnameInput = document.getElementById('clientname');
        const slugnameInput = document.getElementById('slugname');
        const clientnameValidation = document.getElementById('clientname-validation');
        const slugnameValidation = document.getElementById('slugname-validation');

        // 檢查必填欄位
        if (!clientnameInput?.value?.trim() || !slugnameInput?.value?.trim()) {
            return false;
        }

        // 檢查字數限制
        if (clientnameInput.value.trim().length > 30 || slugnameInput.value.trim().length > 30) {
            return false;
        }

        // 檢查最小長度
        if (clientnameInput.value.trim().length < 2 || slugnameInput.value.trim().length < 3) {
            return false;
        }

        // 檢查客戶名稱驗證狀態
        if (clientnameValidation?.classList.contains('error')) {
            return false;
        }

        // 確保客戶名稱已經檢查過且可用
        if (clientnameInput.value && (!clientnameValidation || !clientnameValidation.classList.contains('success'))) {
            return false;
        }

        // 檢查動態標識驗證狀態
        if (slugnameValidation?.classList.contains('error')) {
            return false;
        }

        // 確保動態標識已經檢查過且可用
        if (slugnameInput.value && (!slugnameValidation || !slugnameValidation.classList.contains('success'))) {
            return false;
        }

        return true;
    }

    validateStep2() {
        // 檢查步驟2：功能選擇
        return this.selectedFeatures.booking || this.selectedFeatures.points;
    }

    validateStep3() {
        // 檢查步驟3：訂位系統設定（僅在啟用訂位系統時）
        if (!this.selectedFeatures.booking) {
            return true; // 如果沒有啟用訂位系統，跳過驗證
        }

        const restaurantImage = document.getElementById('restaurantImage');
        const restaurantAddress = document.getElementById('restaurantAddress');
        const timeSlots = document.querySelectorAll('input[name="timeSlots[]"]');
        const diningRules = document.querySelectorAll('input[name="diningRules[]"]');

        // 檢查必填欄位
        if (!restaurantImage?.files?.length) {
            return false;
        }

        if (!restaurantAddress?.value?.trim()) {
            return false;
        }

        // 檢查至少有一個時段
        let hasValidTimeSlot = false;
        timeSlots.forEach(slot => {
            if (slot.value.trim()) {
                hasValidTimeSlot = true;
            }
        });
        if (!hasValidTimeSlot) {
            return false;
        }

        // 檢查至少有一個規則
        let hasValidRule = false;
        diningRules.forEach(rule => {
            if (rule.value.trim()) {
                hasValidRule = true;
            }
        });
        if (!hasValidRule) {
            return false;
        }

        return true;
    }

    validateStep4() {
        // 檢查步驟4：集點卡系統設定（僅在啟用集點卡系統時）
        if (!this.selectedFeatures.points) {
            return true; // 如果沒有啟用集點卡系統，跳過驗證
        }

        const cardBackgroundImage = document.getElementById('cardBackgroundImage');
        const rewardNames = document.querySelectorAll('input[name="rewardNames[]"]');
        const rewardPoints = document.querySelectorAll('input[name="rewardPoints[]"]');
        const pointRules = document.querySelectorAll('input[name="pointRules[]"]');

        // 檢查必填欄位
        if (!cardBackgroundImage?.files?.length) {
            return false;
        }

        // 檢查至少有一個獎勵
        let hasValidReward = false;
        for (let i = 0; i < rewardNames.length; i++) {
            if (rewardNames[i]?.value?.trim() && rewardPoints[i]?.value?.trim()) {
                hasValidReward = true;
                break;
            }
        }
        if (!hasValidReward) {
            return false;
        }

        // 檢查至少有一個規則
        let hasValidPointRule = false;
        pointRules.forEach(rule => {
            if (rule.value.trim()) {
                hasValidPointRule = true;
            }
        });
        if (!hasValidPointRule) {
            return false;
        }

        return true;
    }

    validateStep5() {
        // 檢查步驟5：後台密碼設定
        const adminPassword = document.getElementById('adminPassword');
        const confirmPassword = document.getElementById('confirmPassword');

        // 檢查必填欄位
        if (!adminPassword?.value?.trim() || !confirmPassword?.value?.trim()) {
            return false;
        }

        // 檢查密碼格式
        if (!this.validatePassword(adminPassword.value)) {
            return false;
        }

        // 檢查密碼確認
        if (adminPassword.value !== confirmPassword.value) {
            return false;
        }

        return true;
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
        if (this.currentStep === 1) {
            // 檢查客戶名稱和動態標識的驗證狀態
            const clientnameValidation = document.getElementById('clientname-validation');
            const slugnameValidation = document.getElementById('slugname-validation');
            
            if (clientnameValidation && clientnameValidation.classList.contains('error')) {
                this.showError('請修正客戶名稱的問題');
                return false;
            }
            
            // 確保客戶名稱已經檢查過且可用
            const clientnameInput = document.getElementById('clientname');
            if (clientnameInput && clientnameInput.value && 
                (!clientnameValidation || !clientnameValidation.classList.contains('success'))) {
                this.showError('請等待客戶名稱檢查完成');
                return false;
            }
            
            if (slugnameValidation && slugnameValidation.classList.contains('error')) {
                this.showError('請修正動態標識的問題');
                return false;
            }
            
            // 確保動態標識已經檢查過且可用
            const slugnameInput = document.getElementById('slugname');
            if (slugnameInput && slugnameInput.value && 
                (!slugnameValidation || !slugnameValidation.classList.contains('success'))) {
                this.showError('請等待動態標識檢查完成');
                return false;
            }
        }

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
                    // 訂位系統永遠保持可選狀態，不會變成灰色
                    this.selectedFeatures.booking = !this.selectedFeatures.booking;
                } else if (feature === 'points') {
                    this.selectedFeatures.points = !this.selectedFeatures.points;
                }

                this.updateFeatureSelection();
                // 功能選擇變更後，確保按鈕狀態正確
                this.updateButtons();
            });
        });
    }

    updateFeatureSelection() {
        
        this.updateFeatureSelectionUI();
        
        // 立即更新步驟導航
        this.updateStepNavigation();
    }

    updateFeatureSelectionUI() {
        
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
        const requirements = document.querySelectorAll('.password-requirements li');
        if (requirements.length === 0) return;

        const checks = [
            password.length >= 8,
            /[A-Z]/.test(password),
            /[a-z]/.test(password),
            /\d/.test(password),
            /[!@#$%^&*]/.test(password)
        ];

        requirements.forEach((req, index) => {
            if (checks[index]) {
                req.classList.add('valid');
            } else {
                req.classList.remove('valid');
            }
        });
    }

    updateUrlPreview() {
        const slugField = document.getElementById('slugname');
        const urlSpan = document.getElementById('backendUrlPreview');
        const restaurantUrlPreview = document.getElementById('restaurant-url-preview');
        
        if (slugField) {
            const updateUrls = (e) => {
                const slugValue = e.target.value || 'slug';
                
                // 更新後台管理網址
                if (urlSpan) {
                    urlSpan.textContent = `https://zyw.onrender.com/${slugValue}/backstage-login`;
                }
                
                // 更新餐廳前台網址
                if (restaurantUrlPreview) {
                    restaurantUrlPreview.textContent = `https://zyw.onrender.com/${slugValue}`;
                }
            };
            
            slugField.addEventListener('input', updateUrls);
            
            // 初始化顯示
            updateUrls({ target: { value: slugField.value || '' } });
        }
    }

    setupBookingSettings() {
        // 人數限制方式切換
        const limitTypeRadios = document.querySelectorAll('input[name="limitType"]');
        const separateSettings = document.getElementById('separateSettings');
        const totalSettings = document.getElementById('totalSettings');
        
        limitTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'separate') {
                    if (separateSettings) separateSettings.style.display = 'block';
                    if (totalSettings) totalSettings.style.display = 'none';
                } else {
                    if (separateSettings) separateSettings.style.display = 'none';
                    if (totalSettings) totalSettings.style.display = 'block';
                }
            });
        });
        
        // 特殊需求選項切換
        const enableSpecialRequestsCheckbox = document.querySelector('input[name="enableSpecialRequests"]');
        const specialRequestsOptions = document.getElementById('specialRequestsOptions');
        
        if (enableSpecialRequestsCheckbox && specialRequestsOptions) {
            enableSpecialRequestsCheckbox.addEventListener('change', () => {
                if (enableSpecialRequestsCheckbox.checked) {
                    specialRequestsOptions.style.display = 'block';
                } else {
                    specialRequestsOptions.style.display = 'none';
                }
            });
        }
    }

    setupPointsSettings() {
        // 集點卡設定相關的JavaScript邏輯可以在這裡添加
        // 目前集點卡設定比較簡單，主要是表單驗證
    }

    async checkClientnameAvailability(clientname) {
        const validationDiv = document.getElementById('clientname-validation');
        
        if (!clientname || clientname.trim().length === 0) {
            validationDiv.textContent = '';
            validationDiv.className = 'validation-message';
            return;
        }

        try {
            // 檢查字數限制
            if (clientname.trim().length > 30) {
                validationDiv.textContent = '客戶名稱不能超過30個字元';
                validationDiv.className = 'validation-message error';
                return;
            }

            // 檢查最小長度
            if (clientname.trim().length < 2) {
                validationDiv.textContent = '客戶名稱至少需要2個字元';
                validationDiv.className = 'validation-message error';
                return;
            }

            // 顯示檢查中狀態
            validationDiv.textContent = '檢查中...';
            validationDiv.className = 'validation-message checking';

            // 檢查客戶名稱是否重複
            const response = await fetch(`/api/check-clientname/${encodeURIComponent(clientname.trim())}`);
            const data = await response.json();
            
            if (data.exists) {
                validationDiv.textContent = '❌ 此客戶名稱已被使用，請選擇其他名稱';
                validationDiv.className = 'validation-message error';
            } else {
                validationDiv.textContent = '✓ 客戶名稱可用';
                validationDiv.className = 'validation-message success';
            }
        } catch (error) {
            console.error('檢查客戶名稱時發生錯誤:', error);
            validationDiv.textContent = '檢查客戶名稱時發生錯誤';
            validationDiv.className = 'validation-message error';
        }
        
        // 更新按鈕狀態
        setTimeout(() => {
            this.updateButtons();
        }, 100);
    }

    async checkSlugname(slugname) {
        const validationDiv = document.getElementById('slugname-validation');
        
        if (!slugname || slugname.trim().length === 0) {
            validationDiv.textContent = '';
            validationDiv.className = 'validation-message';
            return;
        }

        // 檢查字數限制
        if (slugname.trim().length > 30) {
            validationDiv.textContent = '動態標識不能超過30個字元';
            validationDiv.className = 'validation-message error';
            return;
        }

        // 檢查格式
        const slugnameRegex = /^[a-zA-Z0-9]+$/;
        if (!slugnameRegex.test(slugname)) {
            validationDiv.textContent = '動態標識只能包含英文字母和數字';
            validationDiv.className = 'validation-message error';
            return;
        }

        if (slugname.length < 3) {
            validationDiv.textContent = '動態標識至少需要3個字元';
            validationDiv.className = 'validation-message error';
            return;
        }

        try {
            validationDiv.textContent = '檢查中...';
            validationDiv.className = 'validation-message checking';

            const response = await fetch(`/api/check-client/${slugname}`);
            const data = await response.json();
            
            if (data.exists) {
                validationDiv.textContent = '❌ 此動態標識已被使用，請選擇其他名稱';
                validationDiv.className = 'validation-message error';
            } else {
                validationDiv.textContent = '✓ 動態標識可用';
                validationDiv.className = 'validation-message success';
            }
        } catch (error) {
            console.error('檢查動態標識時發生錯誤:', error);
            validationDiv.textContent = '檢查動態標識時發生錯誤';
            validationDiv.className = 'validation-message error';
        }
        
        // 更新按鈕狀態
        setTimeout(() => {
            this.updateButtons();
        }, 100);
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

        const rewardIndex = list.children.length;
        const div = document.createElement('div');
        div.className = 'list-item reward-item';
        div.innerHTML = `
            <div class="reward-item-header">
                <span>🎁 獎勵項目</span>
            </div>
            
            <input type="text" name="rewardNames[]" class="reward-name-input" placeholder="輸入獎勵名稱" required>
            <input type="number" name="rewardPoints[]" class="reward-points-input" placeholder="點數" required min="1">
            
            <div class="reward-image-upload">
                <input type="file" name="rewardImages[]" accept=".png,.jpg,.jpeg" id="rewardImage-${rewardIndex}" onchange="handleFileUpload(this)" style="display: none;">
                <div class="file-upload-area" onclick="document.getElementById('rewardImage-${rewardIndex}').click()">
                    <div class="file-upload-icon">📁</div>
                    <div class="file-upload-text">
                        <div class="file-upload-text-main">選擇獎勵圖片</div>
                        <div class="file-upload-text-sub">支援 PNG、JPG、JPEG 格式</div>
                    </div>
                </div>
                <div class="file-name-display" id="fileName-${rewardIndex}"></div>
            </div>
            
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

    addSpecialRequest() {
        const list = document.getElementById('customSpecialRequests-list');
        if (!list) return;

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <input type="text" name="customSpecialRequests[]" placeholder="請輸入特殊需求選項">
            <button type="button" class="list-btn add-btn" onclick="setupManager.addSpecialRequest()">+</button>
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

        // 禁用提交按鈕防止重複點擊
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '建立中...';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.style.opacity = '0.6';
        }

        const formData = new FormData();
        
        // 手動收集所有必要的數據，避免重複
        const form = document.getElementById('setupForm');
        
        // 收集基本欄位
        const basicFields = ['clientname', 'slugname', 'restaurantAddress', 'adminPassword', 'bookingSystem', 'pointsSystem'];
        basicFields.forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field && field.value) {
                formData.append(fieldName, field.value);
            }
        });

        // 收集訂位設定欄位
        const bookingFields = ['limitType', 'maxAdults', 'maxChildren', 'maxTotalPeople', 'specialRequestsType'];
        bookingFields.forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field && field.value) {
                formData.append(fieldName, field.value);
            }
        });

        // 收集checkbox欄位
        const checkboxFields = ['enableVegetarian', 'enableSpecialRequests'];
        checkboxFields.forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field && field.checked) {
                formData.append(fieldName, 'true');
            }
        });

        // 收集集點卡設定欄位
        if (this.selectedFeatures.points) {
            const pointsFields = ['welcomePoints', 'maxPointsPerDay', 'pointsExpireDays'];
            pointsFields.forEach(fieldName => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (field && field.value) {
                    formData.append(fieldName, field.value);
                }
            });
        }

        // 收集自訂特殊需求
        const customSpecialRequests = Array.from(document.querySelectorAll('input[name="customSpecialRequests[]"]'))
            .map(input => input.value.trim())
            .filter(value => value);
        if (customSpecialRequests.length > 0) {
            formData.append('customSpecialRequests', JSON.stringify(customSpecialRequests));
        }

        // 收集檔案
        const fileFields = ['restaurantImage', 'cardBackgroundImage'];
        fileFields.forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field && field.files && field.files.length > 0) {
                formData.append(fieldName, field.files[0]);
            }
        });

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
                // 只收集可見的集點卡設定區域內的輸入框
                const pointsStep = document.getElementById('step-2b');
                if (pointsStep) {
                    const rewardNames = Array.from(pointsStep.querySelectorAll('input[name="rewardNames[]"]'))
                        .map(input => input.value.trim())
                        .filter(value => value.length > 0);
                    const rewardPoints = Array.from(pointsStep.querySelectorAll('input[name="rewardPoints[]"]'))
                        .map(input => input.value.trim())
                        .filter(value => value.length > 0 && !isNaN(value) && parseInt(value) > 0);
                    const pointRules = Array.from(pointsStep.querySelectorAll('input[name="pointRules[]"]'))
                        .map(input => input.value.trim())
                        .filter(value => value.length > 0);
                    
                    formData.append('rewardNames', JSON.stringify(rewardNames));
                    formData.append('rewardPoints', JSON.stringify(rewardPoints));
                    formData.append('pointRules', JSON.stringify(pointRules));

                    // 收集獎勵圖片
                    const rewardImageInputs = pointsStep.querySelectorAll('input[name="rewardImages[]"]');
                    rewardImageInputs.forEach((input, index) => {
                        if (input.files && input.files.length > 0) {
                            formData.append('rewardImages[]', input.files[0]);
                        }
                    });
                }
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
        } finally {
            // 恢復提交按鈕狀態（如果發生錯誤）
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn && submitBtn.disabled) {
                submitBtn.disabled = false;
                submitBtn.textContent = '建立系統';
                submitBtn.style.cursor = 'pointer';
                submitBtn.style.opacity = '1';
            }
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

function addSpecialRequest() {
    if (setupManager) {
        setupManager.addSpecialRequest();
    }
}

function removeItem(btn) {
    if (setupManager) {
        setupManager.removeItem(btn);
    }
}

// 為EJS模板中的按鈕提供函數
function nextStep() {
    if (setupManager) {
        setupManager.changeStep(1);
    }
}

function previousStep() {
    if (setupManager) {
        setupManager.changeStep(-1);
    }
}

// 文件上傳處理函數
function handleFileUpload(input) {
    const file = input.files[0];
    const uploadArea = input.parentNode.querySelector('.file-upload-area');
    const fileNameDisplay = input.parentNode.querySelector('.file-name-display');
    
    if (file) {
        // 更新上傳區域外觀
        uploadArea.classList.add('has-file');
        uploadArea.querySelector('.file-upload-icon').textContent = '✅';
        uploadArea.querySelector('.file-upload-text-main').textContent = '文件已選擇';
        uploadArea.querySelector('.file-upload-text-sub').textContent = `點擊更換文件`;
        
        // 顯示文件名
        if (fileNameDisplay) {
            fileNameDisplay.textContent = file.name;
            fileNameDisplay.classList.add('show');
        }
    } else {
        // 重置上傳區域外觀
        uploadArea.classList.remove('has-file');
        
        // 根據不同的上傳類型設定不同的圖標和文字
        if (input.id === 'cardBackgroundImage') {
            uploadArea.querySelector('.file-upload-icon').textContent = '🎨';
            uploadArea.querySelector('.file-upload-text-main').textContent = '選擇集點卡背景圖片';
            uploadArea.querySelector('.file-upload-text-sub').textContent = '建議尺寸：650x400px，支援 PNG、JPG、JPEG、SVG 格式';
        } else if (input.id === 'restaurantImage') {
            uploadArea.querySelector('.file-upload-icon').textContent = '🏪';
            uploadArea.querySelector('.file-upload-text-main').textContent = '選擇餐廳圖片';
            uploadArea.querySelector('.file-upload-text-sub').textContent = '建議尺寸：800x600px，支援 PNG、JPG、JPEG、SVG 格式';
        } else {
            uploadArea.querySelector('.file-upload-icon').textContent = '📁';
            uploadArea.querySelector('.file-upload-text-main').textContent = '選擇獎勵圖片';
            uploadArea.querySelector('.file-upload-text-sub').textContent = '支援 PNG、JPG、JPEG 格式';
        }
        
        // 隱藏文件名顯示
        if (fileNameDisplay) {
            fileNameDisplay.classList.remove('show');
        }
    }
    
    // 觸發驗證檢查
    if (setupManager) {
        setupManager.updateButtonState();
    }
}

// 添加拖拽支援
function setupDragAndDrop() {
    const uploadAreas = document.querySelectorAll('.file-upload-area');
    
    uploadAreas.forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });
        
        area.addEventListener('dragleave', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                // 找到對應的隱藏輸入框
                const fileInput = area.parentNode.querySelector('input[type="file"]');
                if (fileInput) {
                    fileInput.files = files;
                    handleFileUpload(fileInput);
                }
            }
        });
    });
}

// 全域調試函數
window.debugSetup = function() {
    if (!window.setupManager) {
        return;
    }
    
    const manager = window.setupManager;
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

        
    // 手動觸發更新
    manager.updateButtons();
}; 
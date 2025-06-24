// 商家後台 SPA JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeSPA();
    initializeForms();
    initializeImagePreview();
    initializeDynamicLists();
    setupMobileMenu();
    
    // 從URL hash設置初始頁面
    const hash = window.location.hash.substring(1);
    if (hash && ['dashboard', 'basic', 'booking', 'points', 'qrcode'].includes(hash)) {
        navigateToPage(hash);
    }
});

// SPA 導航系統
function initializeSPA() {
    // 監聽 hash 變化
    window.addEventListener('hashchange', function() {
        const page = window.location.hash.substring(1) || 'dashboard';
        navigateToPage(page);
    });
    
    // 初始化導航連結點擊事件
    document.querySelectorAll('.backstage-nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            navigateToPage(page);
            window.location.hash = page;
        });
    });
}

// 頁面導航函數
function navigateToPage(pageName) {
    // 隱藏所有頁面
    document.querySelectorAll('.backstage-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 移除所有導航連結的活動狀態
    document.querySelectorAll('.backstage-nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // 顯示目標頁面
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // 設置對應導航連結為活動狀態
    const targetNavLink = document.querySelector(`[data-page="${pageName}"]`);
    if (targetNavLink) {
        targetNavLink.classList.add('active');
    }
    
    // 更新 URL hash
    if (window.location.hash.substring(1) !== pageName) {
        window.location.hash = pageName;
    }
    
    // 如果導航到QR碼頁面，更新狀態
    if (pageName === 'qrcode') {
        setTimeout(updateQRCodeStatus, 300);
    }
}

// 初始化表單
function initializeForms() {
    // 基本設定表單
    const basicForm = document.getElementById('basicInfoForm');
    if (basicForm) {
        basicForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitBasicSettings();
        });
    }
    
    // 餐廳圖片表單
    const imageForm = document.getElementById('restaurantImageForm');
    if (imageForm) {
        imageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitRestaurantImage();
        });
    }
    
    // 時段設定表單
    const timeSlotsForm = document.getElementById('timeSlotsForm');
    if (timeSlotsForm) {
        timeSlotsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitTimeSlots();
        });
    }
    
    // 用餐規則表單
    const diningRulesForm = document.getElementById('diningRulesForm');
    if (diningRulesForm) {
        diningRulesForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitDiningRules();
        });
    }
    
    // 集點卡圖片表單
    const cardImageForm = document.getElementById('cardImageForm');
    if (cardImageForm) {
        cardImageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitCardImage();
        });
    }

    // 集點規則表單
    const pointsRulesForm = document.getElementById('pointsRulesForm');
    if (pointsRulesForm) {
        pointsRulesForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitPointsRules();
        });
    }

    // 獎勵設定表單
    const rewardsForm = document.getElementById('rewardsForm');
    if (rewardsForm) {
        rewardsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitRewards();
        });
    }

    // QR碼生成表單
    const qrcodeForm = document.getElementById('qrcodeGenerateForm');
    if (qrcodeForm) {
        qrcodeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            generateQRCode();
        });
    }
}

// 圖片預覽功能
function initializeImagePreview() {
    // 餐廳圖片預覽
    const restaurantImageInput = document.getElementById('restaurantImageInput');
    if (restaurantImageInput) {
        restaurantImageInput.addEventListener('change', function() {
            previewImage(this, 'restaurantImagePreview');
        });
    }
    
    // 集點卡圖片預覽
    const cardImageInput = document.getElementById('cardImageInput');
    if (cardImageInput) {
        cardImageInput.addEventListener('change', function() {
            previewImage(this, 'cardImagePreview');
        });
    }
}

// 預覽圖片函數
function previewImage(input, previewId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
}

// 動態列表管理
function initializeDynamicLists() {
    // 已經在 HTML 中直接綁定了 onclick 事件
}

// 添加時段
function addTimeSlot() {
    const container = document.getElementById('timeSlots-list');
    const items = container.querySelectorAll('.backstage-list-item');
    const lastItem = items[items.length - 1];
    
    // 移除最後一個項目的添加按鈕
    const addBtn = lastItem.querySelector('.backstage-btn-add');
    if (addBtn) {
        addBtn.remove();
    }
    
    // 如果只有一個項目，添加刪除按鈕
    if (items.length === 1) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'backstage-btn-icon backstage-btn-remove';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = function() { removeTimeSlot(this); };
        lastItem.appendChild(removeBtn);
    }
    
    // 創建新項目
    const newItem = document.createElement('div');
    newItem.className = 'backstage-list-item';
    newItem.innerHTML = `
        <input type="text" name="timeSlots[]" placeholder="例如: 12:00" required>
        <button type="button" class="backstage-btn-icon backstage-btn-add" onclick="addTimeSlot()">+</button>
        <button type="button" class="backstage-btn-icon backstage-btn-remove" onclick="removeTimeSlot(this)">×</button>
    `;
    
    container.appendChild(newItem);
}

// 移除時段
function removeTimeSlot(button) {
    const container = document.getElementById('timeSlots-list');
    const items = container.querySelectorAll('.backstage-list-item');
    
    if (items.length > 1) {
        button.parentElement.remove();
        
        const remainingItems = container.querySelectorAll('.backstage-list-item');
        
        // 確保最後一個項目有添加按鈕
        const lastItem = remainingItems[remainingItems.length - 1];
        if (!lastItem.querySelector('.backstage-btn-add')) {
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'backstage-btn-icon backstage-btn-add';
            addBtn.innerHTML = '+';
            addBtn.onclick = addTimeSlot;
            lastItem.appendChild(addBtn);
        }
        
        // 如果只剩一個項目，移除刪除按鈕
        if (remainingItems.length === 1) {
            const removeBtn = remainingItems[0].querySelector('.backstage-btn-remove');
            if (removeBtn) {
                removeBtn.remove();
            }
        }
    }
}

// 添加用餐規則
function addDiningRule() {
    const container = document.getElementById('diningRules-list');
    const items = container.querySelectorAll('.backstage-list-item');
    const lastItem = items[items.length - 1];
    
    // 移除最後一個項目的添加按鈕
    const addBtn = lastItem.querySelector('.backstage-btn-add');
    if (addBtn) {
        addBtn.remove();
    }
    
    // 如果只有一個項目，添加刪除按鈕
    if (items.length === 1) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'backstage-btn-icon backstage-btn-remove';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = function() { removeDiningRule(this); };
        lastItem.appendChild(removeBtn);
    }
    
    // 創建新項目
    const newItem = document.createElement('div');
    newItem.className = 'backstage-list-item';
    newItem.innerHTML = `
        <input type="text" name="diningRules[]" placeholder="請輸入用餐規則" required>
        <button type="button" class="backstage-btn-icon backstage-btn-add" onclick="addDiningRule()">+</button>
        <button type="button" class="backstage-btn-icon backstage-btn-remove" onclick="removeDiningRule(this)">×</button>
    `;
    
    container.appendChild(newItem);
}

// 移除用餐規則
function removeDiningRule(button) {
    const container = document.getElementById('diningRules-list');
    const items = container.querySelectorAll('.backstage-list-item');
    
    if (items.length > 1) {
        button.parentElement.remove();
        
        const remainingItems = container.querySelectorAll('.backstage-list-item');
        
        // 確保最後一個項目有添加按鈕
        const lastItem = remainingItems[remainingItems.length - 1];
        if (!lastItem.querySelector('.backstage-btn-add')) {
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'backstage-btn-icon backstage-btn-add';
            addBtn.innerHTML = '+';
            addBtn.onclick = addDiningRule;
            lastItem.appendChild(addBtn);
        }
        
        // 如果只剩一個項目，移除刪除按鈕
        if (remainingItems.length === 1) {
            const removeBtn = remainingItems[0].querySelector('.backstage-btn-remove');
            if (removeBtn) {
                removeBtn.remove();
            }
        }
    }
}

// 表單提交函數
async function submitBasicSettings() {
    const form = document.getElementById('basicInfoForm');
    const formData = new FormData(form);
    
    // 只有當密碼字段有值時才包含它
    const password = formData.get('adminPassword');
    if (!password || password.trim() === '') {
        formData.delete('adminPassword');
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/${storeSlug}/api/setup`, {
            method: 'PUT',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('基本設定已更新', 'success');
            
            // 更新頁面上的餐廳名稱顯示
            const storeName = formData.get('clientname');
            if (storeName) {
                const storeNameElement = document.querySelector('.store-name');
                if (storeNameElement) {
                    storeNameElement.textContent = storeName;
                }
            }
        } else {
            showNotification(result.message || '更新失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        hideLoading();
    }
}

async function submitRestaurantImage() {
    const form = document.getElementById('restaurantImageForm');
    const formData = new FormData(form);
    
    if (!formData.get('restaurantImage').name) {
        showNotification('請選擇圖片文件', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/${storeSlug}/api/setup`, {
            method: 'PUT',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('餐廳圖片已更新', 'success');
        } else {
            showNotification(result.message || '圖片更新失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        hideLoading();
    }
}

async function submitTimeSlots() {
    const form = document.getElementById('timeSlotsForm');
    const formData = new FormData(form);
    
    const timeSlots = formData.getAll('timeSlots[]').map(time => ({ time: time.trim() }));
    
    if (timeSlots.length === 0 || timeSlots.some(slot => !slot.time)) {
        showNotification('請輸入有效的時段', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/${storeSlug}/api/setup`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ timeSlots })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('訂位時段已更新', 'success');
        } else {
            showNotification(result.message || '時段更新失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        hideLoading();
    }
}

async function submitDiningRules() {
    const form = document.getElementById('diningRulesForm');
    const formData = new FormData(form);
    
    const diningRules = formData.getAll('diningRules[]').map(text => ({ text: text.trim() }));
    
    if (diningRules.length === 0 || diningRules.some(rule => !rule.text)) {
        showNotification('請輸入有效的用餐規則', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/${storeSlug}/api/setup`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ diningRules })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('用餐規則已更新', 'success');
        } else {
            showNotification(result.message || '規則更新失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        hideLoading();
    }
}

async function submitCardImage() {
    const form = document.getElementById('cardImageForm');
    const formData = new FormData(form);
    
    if (!formData.get('cardBackgroundImage').name) {
        showNotification('請選擇圖片文件', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/${storeSlug}/api/setup`, {
            method: 'PUT',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('集點卡背景已更新', 'success');
        } else {
            showNotification(result.message || '圖片更新失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        hideLoading();
    }
}

// 刪除餐廳確認
function confirmDeleteStore() {
    const confirmed = confirm('⚠️ 警告：此操作將永久刪除所有餐廳數據，包括客戶資料、訂位記錄等，且無法復原。\n\n確定要刪除嗎？');
    
    if (confirmed) {
        const doubleConfirmed = confirm('🚨 最後確認：您真的要刪除這間餐廳的所有數據嗎？此操作無法撤銷！');
        
        if (doubleConfirmed) {
            deleteStore();
        }
    }
}

async function deleteStore() {
    showLoading();
    
    try {
        const response = await fetch(`/${storeSlug}/api/setup`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('餐廳已刪除', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            showNotification(result.message || '刪除失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        hideLoading();
    }
}

// 通知系統
function showNotification(message, type = 'success') {
    // 移除現有通知
    const existingNotification = document.querySelector('.backstage-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 創建新通知
    const notification = document.createElement('div');
    notification.className = `backstage-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 顯示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 3秒後隱藏通知
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// 載入狀態
function showLoading() {
    // 禁用所有表單按鈕
    document.querySelectorAll('.backstage-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
    });
}

function hideLoading() {
    // 啟用所有表單按鈕
    document.querySelectorAll('.backstage-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
    });
}

// 響應式側邊欄 (移動設備)
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.backstage-sidebar');
    sidebar.classList.toggle('mobile-open');
}

// 監聽視窗大小變化
window.addEventListener('resize', function() {
    const sidebar = document.querySelector('.backstage-sidebar');
    if (window.innerWidth > 1024) {
        sidebar.classList.remove('mobile-open');
    }
});

// 全域函數，供 HTML 中的 onclick 使用
window.navigateToPage = navigateToPage;
window.addTimeSlot = addTimeSlot;
window.removeTimeSlot = removeTimeSlot;
window.addDiningRule = addDiningRule;
window.removeDiningRule = removeDiningRule;
window.confirmDeleteStore = confirmDeleteStore;
window.updateFeatureSettings = updateFeatureSettings;

// 更新功能設定
async function updateFeatureSettings() {
    const pointsSystem = document.getElementById('pointsSystemToggle').checked;
    const bookingSystem = document.getElementById('bookingSystemToggle').checked;
    
    showLoading();
    
    try {
        const response = await fetch(`/${storeSlug}/api/settings/features`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                pointsSystem,
                bookingSystem
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('功能設定已更新', 'success');
            // 重新載入頁面以更新UI
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showNotification(result.message || '功能設定更新失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        hideLoading();
    }
}

// 行動版選單控制
function setupMobileMenu() {
    const mobileToggle = document.getElementById('backstage-mobile-toggle');
    const sidebar = document.querySelector('.backstage-sidebar');
    const overlay = document.getElementById('backstage-mobile-overlay');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
        });
    }

    // 點擊導航連結時關閉行動版選單
    const navLinks = document.querySelectorAll('.backstage-nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
            }
        });
    });
}

// 新增獎勵項目
function addReward() {
    const rewardsList = document.getElementById('rewards-list');
    const currentRewards = rewardsList.querySelectorAll('.backstage-reward-item');
    const newIndex = currentRewards.length + 1;
    
    const newRewardHTML = `
        <div class="backstage-reward-item">
            <div class="reward-item-header">
                <h4>獎勵項目 ${newIndex}</h4>
                <button type="button" class="backstage-btn-icon backstage-btn-remove" onclick="removeReward(this)">×</button>
            </div>
            <div class="backstage-form-row">
                <div class="backstage-form-group">
                    <label>獎勵名稱</label>
                    <input type="text" name="rewardName[]" required placeholder="例如：免費飲料">
                </div>
                <div class="backstage-form-group">
                    <label>所需點數</label>
                    <input type="number" name="rewardPoints[]" min="1" max="100" required placeholder="例如：10">
                </div>
            </div>
            <div class="backstage-form-row">
                <div class="backstage-form-group">
                    <label>獎勵描述</label>
                    <textarea name="rewardDescription[]" rows="2" placeholder="詳細描述這個獎勵..."></textarea>
                </div>
                <div class="backstage-form-group">
                    <label class="backstage-toggle-label">
                        <input type="checkbox" name="rewardActive[]" checked>
                        <span class="backstage-toggle-slider"></span>
                        <span class="backstage-toggle-text">啟用此獎勵</span>
                    </label>
                </div>
            </div>
        </div>
    `;
    
    rewardsList.insertAdjacentHTML('beforeend', newRewardHTML);
    updateRewardHeaders();
}

// 移除獎勵項目
function removeReward(button) {
    const rewardItem = button.closest('.backstage-reward-item');
    const rewardsList = document.getElementById('rewards-list');
    const remainingRewards = rewardsList.querySelectorAll('.backstage-reward-item');
    
    // 確保至少保留一個獎勵項目
    if (remainingRewards.length > 1) {
        rewardItem.remove();
        updateRewardHeaders();
    } else {
        showNotification('至少需要保留一個獎勵項目', 'warning');
    }
}

// 更新獎勵項目標題
function updateRewardHeaders() {
    const rewardItems = document.querySelectorAll('.backstage-reward-item');
    rewardItems.forEach((item, index) => {
        const header = item.querySelector('.reward-item-header h4');
        header.textContent = `獎勵項目 ${index + 1}`;
        
        // 更新移除按鈕的顯示
        const removeBtn = item.querySelector('.backstage-btn-remove');
        if (rewardItems.length <= 1) {
            if (removeBtn) removeBtn.style.display = 'none';
        } else {
            if (removeBtn) removeBtn.style.display = 'block';
        }
    });
}

// 提交集點規則設定
async function submitPointsRules() {
    const form = document.getElementById('pointsRulesForm');
    const formData = new FormData(form);
    
    const pointsRules = {
        welcomePoints: parseInt(formData.get('welcomePoints')),
        maxPointsPerDay: parseInt(formData.get('maxPointsPerDay')),
        pointsExpireDays: parseInt(formData.get('pointsExpireDays'))
    };
    
    try {
        showLoading();
        
        const response = await fetch(`/${storeSlug}/backstage/points-rules`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pointsRules)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('集點規則設定已更新');
        } else {
            showNotification(result.message || '更新失敗', 'error');
        }
    } catch (error) {
        console.error('提交集點規則失敗:', error);
        showNotification('提交失敗，請稍後再試', 'error');
    } finally {
        hideLoading();
    }
}

// 提交獎勵設定
async function submitRewards() {
    const form = document.getElementById('rewardsForm');
    const formData = new FormData(form);
    
    const rewardNames = formData.getAll('rewardName[]');
    const rewardPoints = formData.getAll('rewardPoints[]');
    const rewardDescriptions = formData.getAll('rewardDescription[]');
    const rewardActives = formData.getAll('rewardActive[]');
    
    const rewards = [];
    for (let i = 0; i < rewardNames.length; i++) {
        if (rewardNames[i].trim()) {
            rewards.push({
                name: rewardNames[i].trim(),
                points: parseInt(rewardPoints[i]),
                description: rewardDescriptions[i] ? rewardDescriptions[i].trim() : '',
                active: rewardActives.includes('on') && rewardActives.indexOf('on') === i
            });
        }
    }
    
    // 檢查checkbox狀態
    const checkboxes = form.querySelectorAll('input[name="rewardActive[]"]');
    checkboxes.forEach((checkbox, index) => {
        if (rewards[index]) {
            rewards[index].active = checkbox.checked;
        }
    });
    
    try {
        showLoading();
        
        const response = await fetch(`/${storeSlug}/backstage/rewards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rewards })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('獎勵設定已更新');
        } else {
            showNotification(result.message || '更新失敗', 'error');
        }
    } catch (error) {
        console.error('提交獎勵設定失敗:', error);
        showNotification('提交失敗，請稍後再試', 'error');
    } finally {
        hideLoading();
    }
}

// QR碼相關功能
async function generateQRCode() {
    const pointsInput = document.getElementById('qrPoints');
    const generateBtn = document.getElementById('generateQRBtn');
    const qrDisplay = document.getElementById('qrCodeDisplay');
    
    const points = parseInt(pointsInput.value);
    
    if (!points || points < 1 || points > 100) {
        showNotification('請輸入 1-100 之間的點數', 'error');
        return;
    }
    
    generateBtn.disabled = true;
    generateBtn.textContent = '生成中...';
    
    try {
        const response = await fetch(`/${storeSlug}/backstage/qrcode/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ points })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentQR = result;
            displayQRCode(result);
            startCountdown(new Date(result.expiresAt));
            showNotification(`成功生成 ${points} 點數的QR碼`, 'success');
        } else {
            showNotification(result.message || 'QR碼生成失敗', 'error');
        }
    } catch (error) {
        console.error('QR碼生成錯誤:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '生成QR碼';
    }
}

function displayQRCode(qrData) {
    const qrDisplay = document.getElementById('qrCodeDisplay');
    
    let qrImageHtml = '';
    if (qrData.qrImage) {
        qrImageHtml = `
            <div class="qr-image-container">
                <img src="${qrData.qrImage}" alt="QR碼" class="qr-image" />
                <p class="qr-image-caption">掃描此QR碼兌換 ${qrData.points} 點</p>
            </div>
        `;
    } else if (qrData.warning) {
        qrImageHtml = `
            <div class="qr-warning">
                <p>⚠️ ${qrData.warning}</p>
            </div>
        `;
    }
    
    qrDisplay.innerHTML = `
        <div class="qr-info">
            <div class="qr-header">
                <h4>🎯 ${qrData.points} 點數 QR碼</h4>
                <span class="qr-status active">有效</span>
            </div>
            
            ${qrImageHtml}
            
            <div class="qr-details">
                <div class="qr-url">
                    <label>兌換網址：</label>
                    <div class="url-container">
                        <input type="text" value="${qrData.url}" readonly />
                        <button onclick="backstageManager.copyToClipboard('${qrData.url}')" class="copy-btn">
                            📋 複製
                        </button>
                    </div>
                </div>
                
                <div class="qr-countdown">
                    <label>剩餘時間：</label>
                    <span id="countdown" class="countdown">計算中...</span>
                </div>
            </div>
            
            <div class="qr-actions">
                <button onclick="backstageManager.downloadQRCode()" class="download-btn">
                    💾 下載QR碼
                </button>
                <button onclick="backstageManager.deleteQRCode()" class="delete-btn">
                    🗑️ 刪除QR碼
                </button>
            </div>
        </div>
    `;
    
    qrDisplay.style.display = 'block';
}

function downloadQRCode() {
    if (!currentQR || !currentQR.qrImage) {
        showNotification('沒有可下載的QR碼圖片', 'error');
        return;
    }
    
    try {
        // 創建下載連結
        const link = document.createElement('a');
        link.download = `QR碼_${currentQR.points}點_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = currentQR.qrImage;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('QR碼圖片已下載', 'success');
    } catch (error) {
        console.error('下載QR碼失敗:', error);
        showNotification('下載失敗，請稍後再試', 'error');
    }
}

async function deleteCurrentQRCode() {
    if (!confirm('確定要刪除當前的QR碼嗎？')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/${storeSlug}/backstage/qrcode/current`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            updateQRCodeStatus();
        } else {
            showNotification(result.message || '刪除失敗', 'error');
        }
    } catch (error) {
        console.error('刪除QR碼失敗:', error);
        showNotification('刪除失敗，請稍後再試', 'error');
    } finally {
        hideLoading();
    }
}

// 頁面載入時初始化QR碼狀態
document.addEventListener('DOMContentLoaded', function() {
    // 如果當前在QR碼頁面，載入狀態
    if (document.getElementById('qrcode-page')) {
        setTimeout(updateQRCodeStatus, 500);
    }
}); 
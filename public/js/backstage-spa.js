// 商家後台 SPA JavaScript

// 全局變數
let storeSlug = '';
let currentQR = null;

document.addEventListener('DOMContentLoaded', function() {
    // 從頁面獲取 storeSlug
    const metaSlug = document.querySelector('meta[name="store-slug"]');
    if (metaSlug) {
        storeSlug = metaSlug.getAttribute('content');
        console.log('✅ 從 meta 標籤獲取 storeSlug:', storeSlug);
    } else {
        // 如果沒有meta標籤，從URL路徑獲取
        const pathParts = window.location.pathname.split('/');
        storeSlug = pathParts[1] || '';
        console.log('⚠️ 從 URL 路徑獲取 storeSlug:', storeSlug, '完整路徑:', window.location.pathname);
    }
    
    // 驗證 storeSlug
    if (!storeSlug || storeSlug === '' || storeSlug === 'undefined') {
        console.error('❌ 無法獲取有效的 storeSlug!');
        console.error('❌ meta 標籤內容:', metaSlug ? metaSlug.getAttribute('content') : 'null');
        console.error('❌ URL 路徑:', window.location.pathname);
        console.error('❌ URL 完整:', window.location.href);
    } else {
        console.log('✅ storeSlug 獲取成功:', storeSlug);
    }
    
    initializeSPA();
    initializeForms();
    initializeImagePreview();
    initializeDynamicLists();
    setupMobileMenu();
    
    // 從URL hash設置初始頁面（延遲執行以確保 DOM 完全載入）
    setTimeout(() => {
        const hash = window.location.hash.substring(1);
        if (hash && ['dashboard', 'basic', 'booking', 'points', 'qrcode'].includes(hash)) {
            navigateToPage(hash);
        } else {
            navigateToPage('dashboard'); // 預設顯示首頁
        }
    }, 100);
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
            // navigateToPage 內部會處理 hash 更新，避免重複設置
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
    } else {
        // 如果頁面不存在，回到首頁
        const dashboardPage = document.getElementById('dashboard-page');
        if (dashboardPage) {
            dashboardPage.classList.add('active');
            pageName = 'dashboard';
        }
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
    
    // 如果導航到集點卡設定頁面，載入規則和初始化toggle
    if (pageName === 'points') {
        setTimeout(() => {
            loadRules();
            initializeRewardToggles();
            loadPointsStats();
        }, 300);
    }
    
    // 如果是訂位頁面，初始化時段管理和基本設定
    if (pageName === 'booking') {
        setTimeout(() => {
            console.log('🎯 初始化訂位設定頁面，storeSlug:', storeSlug);
            initializeTimeSlotManagement();
            initializeBookingBasicSettings();
        }, 500);
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

    // 使用規則表單
    const rulesForm = document.getElementById('rulesForm');
    if (rulesForm) {
        rulesForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitRules();
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

// 提交訂位基本設定
async function submitBookingBasicSettings() {
    console.log('🔄 開始提交訂位基本設定...');
    
    const form = document.getElementById('bookingBasicSettingsForm');
    if (!form) {
        console.error('❌ 找不到表單元素');
        showNotification('找不到表單元素', 'error');
        return;
    }
    
    const formData = new FormData(form);
    
    const bookingSettings = {
        maxAdults: parseInt(formData.get('maxAdults')),
        maxChildren: parseInt(formData.get('maxChildren')),
        maxTotalPeople: parseInt(formData.get('maxTotalPeople')),
        enableVegetarian: formData.get('enableVegetarian') === 'on',
        enableSpecialRequests: formData.get('enableSpecialRequests') === 'on',
        specialRequestsType: formData.get('specialRequestsType') || 'default',
        customSpecialRequests: formData.getAll('customSpecialRequests[]').filter(req => req.trim() !== '')
    };
    
    // 驗證數據
    if (bookingSettings.maxAdults < 1 || bookingSettings.maxAdults > 20) {
        showNotification('大人最多人數必須在1-20之間', 'error');
        return;
    }
    
    if (bookingSettings.maxChildren < 0 || bookingSettings.maxChildren > 20) {
        showNotification('小孩最多人數必須在0-20之間', 'error');
        return;
    }
    
    if (bookingSettings.maxTotalPeople < 1 || bookingSettings.maxTotalPeople > 30) {
        showNotification('總人數上限必須在1-30之間', 'error');
        return;
    }
    
    // 檢查總人數邏輯
    if (bookingSettings.maxTotalPeople < bookingSettings.maxAdults) {
        showNotification('總人數上限不能小於大人最多人數', 'error');
        return;
    }
    
    console.log('📝 提交訂位基本設定:', bookingSettings);
    
    try {
        showLoading();
        
        const response = await fetch(`/${storeSlug}/api/booking-settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bookingSettings })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('訂位基本設定已更新！');
        } else {
            throw new Error(result.message || '更新失敗');
        }
    } catch (error) {
        console.error('提交訂位基本設定失敗:', error);
        showNotification(error.message || '更新訂位基本設定失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 新增特殊需求選項
function addSpecialRequest() {
    const container = document.getElementById('specialRequests-list');
    const lastItem = container.querySelector('.backstage-list-item:last-child');
    
    // 移除最後一項的新增按鈕
    const lastAddBtn = lastItem.querySelector('.backstage-btn-add');
    if (lastAddBtn) {
        lastAddBtn.remove();
    }
    
    // 為最後一項新增移除按鈕（如果還沒有的話）
    if (!lastItem.querySelector('.backstage-btn-remove')) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'backstage-btn-icon backstage-btn-remove';
        removeBtn.onclick = function() { removeSpecialRequest(this); };
        removeBtn.textContent = '×';
        lastItem.appendChild(removeBtn);
    }
    
    // 創建新項目
    const newItem = document.createElement('div');
    newItem.className = 'backstage-list-item';
    newItem.innerHTML = `
        <input type="text" name="customSpecialRequests[]" placeholder="請輸入特殊需求選項" required>
        <button type="button" class="backstage-btn-icon backstage-btn-add" onclick="addSpecialRequest()">+</button>
    `;
    
    container.appendChild(newItem);
    
    // 焦點到新輸入框
    newItem.querySelector('input').focus();
}

// 移除特殊需求選項
function removeSpecialRequest(button) {
    const container = document.getElementById('specialRequests-list');
    const items = container.querySelectorAll('.backstage-list-item');
    
    if (items.length <= 1) {
        alert('至少需要保留一個特殊需求選項');
        return;
    }
    
    const item = button.parentElement;
    const isLast = !item.nextElementSibling;
    
    // 如果刪除的是最後一項，將新增按鈕移到新的最後一項
    if (isLast && items.length > 1) {
        const newLastItem = item.previousElementSibling;
        if (newLastItem && !newLastItem.querySelector('.backstage-btn-add')) {
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'backstage-btn-icon backstage-btn-add';
            addBtn.onclick = addSpecialRequest;
            addBtn.textContent = '+';
            newLastItem.appendChild(addBtn);
        }
    }
    
    item.remove();
}

// 初始化特殊需求選項的顯示控制
function initializeSpecialRequestsToggle() {
    const enableSpecialRequests = document.getElementById('enableSpecialRequests');
    const specialRequestsOptions = document.getElementById('specialRequestsOptions');
    const specialRequestsTypeRadios = document.querySelectorAll('input[name="specialRequestsType"]');
    const customSpecialRequestsList = document.getElementById('customSpecialRequestsList');
    
    // 控制特殊需求選項區塊的顯示/隱藏
    function toggleSpecialRequestsOptions() {
        if (enableSpecialRequests && enableSpecialRequests.checked) {
            specialRequestsOptions.style.display = 'block';
            toggleCustomSpecialRequestsList();
        } else {
            specialRequestsOptions.style.display = 'none';
        }
    }
    
    // 控制自訂特殊需求列表的顯示/隱藏
    function toggleCustomSpecialRequestsList() {
        const customRadio = document.querySelector('input[name="specialRequestsType"][value="custom"]');
        if (customRadio && customRadio.checked) {
            customSpecialRequestsList.style.display = 'block';
        } else {
            customSpecialRequestsList.style.display = 'none';
        }
    }
    
    // 綁定事件監聽器
    if (enableSpecialRequests) {
        enableSpecialRequests.addEventListener('change', toggleSpecialRequestsOptions);
        // 初始化顯示狀態
        toggleSpecialRequestsOptions();
    }
    
    specialRequestsTypeRadios.forEach(radio => {
        radio.addEventListener('change', toggleCustomSpecialRequestsList);
    });
    
    // 初始化自訂列表顯示狀態
    toggleCustomSpecialRequestsList();
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
window.addSpecialRequest = addSpecialRequest;
window.removeSpecialRequest = removeSpecialRequest;

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
            showNotification(result.error || result.message || '功能設定更新失敗', 'error');
            
            // 如果是集點卡設定不完整，提示用戶去相應頁面設定
            if (result.missingSettings) {
                setTimeout(() => {
                    if (result.missingSettings.includes('集點規則設定')) {
                        showNotification('請先完成集點規則設定', 'warning');
                    }
                    if (result.missingSettings.includes('獎勵項目設定')) {
                        showNotification('請先完成獎勵項目設定', 'warning');
                    }
                }, 3000);
            }
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
    const newIndex = currentRewards.length;
    
    const newRewardHTML = `
        <div class="backstage-reward-item">
            <div class="reward-item-header">
                <h4>獎勵項目 ${newIndex + 1}</h4>
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
                <div class="backstage-form-group backstage-toggle-group">
                    <label class="backstage-toggle-label">
                        <input type="checkbox" name="rewardActive[]" value="${newIndex}" checked>
                        <span class="backstage-toggle-slider"></span>
                        <span class="backstage-toggle-text">啟用此獎勵</span>
                    </label>
                </div>
            </div>
            <div class="backstage-form-row">
                <div class="backstage-form-group backstage-image-group">
                    <label>獎勵圖片</label>
                    <div class="backstage-file-upload-area" onclick="triggerFileUpload('${newIndex}')">
                        <input type="file" name="rewardImage[]" id="rewardImage-${newIndex}" accept=".png,.jpg,.jpeg" style="display: none;" onchange="handleRewardImageUpload(this, '${newIndex}')">
                        <div class="backstage-file-placeholder" id="placeholder-${newIndex}">
                            <span class="backstage-file-icon">📷</span>
                            <span class="backstage-file-text">點擊上傳獎勵圖片</span>
                            <small>支援 PNG、JPG、JPEG 格式</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    rewardsList.insertAdjacentHTML('beforeend', newRewardHTML);
    updateRewardHeaders();
    
    // 為新添加的toggle添加事件監聽
    const newRewardItem = rewardsList.lastElementChild;
    const newCheckbox = newRewardItem.querySelector('input[name="rewardActive[]"]');
    if (newCheckbox) {
        newCheckbox.addEventListener('change', updateRewardItemStatus);
        // 初始狀態設定
        updateRewardItemStatus.call(newCheckbox);
    }
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

// 更新獎勵項目狀態顯示
function updateRewardItemStatus() {
    const checkbox = this;
    const rewardItem = checkbox.closest('.backstage-reward-item');
    
    if (checkbox.checked) {
        rewardItem.classList.remove('inactive');
        rewardItem.classList.add('active');
    } else {
        rewardItem.classList.remove('active');
        rewardItem.classList.add('inactive');
    }
}

// 初始化所有獎勵項目的toggle事件
function initializeRewardToggles() {
    const checkboxes = document.querySelectorAll('input[name="rewardActive[]"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateRewardItemStatus);
        // 設定初始狀態
        updateRewardItemStatus.call(checkbox);
    });
}

// 更新獎勵項目標題
function updateRewardHeaders() {
    const rewardItems = document.querySelectorAll('.backstage-reward-item');
    rewardItems.forEach((item, index) => {
        const header = item.querySelector('.reward-item-header h4');
        header.textContent = `獎勵項目 ${index + 1}`;
        
        // 更新checkbox的value值
        const checkbox = item.querySelector('input[name="rewardActive[]"]');
        if (checkbox) {
            checkbox.value = index;
        }
        
        // 更新文件上傳相關的ID
        const fileInput = item.querySelector('input[type="file"]');
        const uploadArea = item.querySelector('.backstage-file-upload-area');
        const placeholder = item.querySelector('.backstage-file-placeholder');
        const preview = item.querySelector('.backstage-reward-preview');
        
        if (fileInput) {
            fileInput.id = `rewardImage-${index}`;
        }
        if (uploadArea) {
            uploadArea.setAttribute('onclick', `triggerFileUpload('${index}')`);
        }
        if (placeholder) {
            placeholder.id = `placeholder-${index}`;
        }
        if (preview) {
            preview.id = `preview-${index}`;
        }
        
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
    
    // 檢查表單中的所有獎勵項目
    const rewardItems = form.querySelectorAll('.backstage-reward-item');
    rewardItems.forEach((item, index) => {
        const nameInput = item.querySelector('input[name="rewardName[]"]');
        const pointsInput = item.querySelector('input[name="rewardPoints[]"]');
        const activeInput = item.querySelector('input[name="rewardActive[]"]');
    });
    
    try {
        showLoading();
        
        const response = await fetch(`/${storeSlug}/backstage/rewards`, {
            method: 'POST',
            body: formData // 直接發送FormData以支援圖片上傳
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('獎勵設定已更新');
            // 重新載入頁面以顯示新的圖片
            setTimeout(() => {
                window.location.reload();
            }, 1500);
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

// 觸發文件上傳
function triggerFileUpload(index) {
    document.getElementById(`rewardImage-${index}`).click();
}

// 處理獎勵圖片上傳
function handleRewardImageUpload(input, index) {
    const file = input.files[0];
    if (!file) return;

    // 檢查文件類型
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('請選擇 PNG、JPG 或 JPEG 格式的圖片', 'error');
        input.value = '';
        return;
    }

    // 檢查文件大小（限制為 5MB）
    if (file.size > 5 * 1024 * 1024) {
        showNotification('圖片大小不能超過 5MB', 'error');
        input.value = '';
        return;
    }

    // 顯示預覽
    const reader = new FileReader();
    reader.onload = function(e) {
        const placeholder = document.getElementById(`placeholder-${index}`);
        const existingPreview = document.getElementById(`preview-${index}`);
        
        if (existingPreview) {
            existingPreview.src = e.target.result;
        } else {
            placeholder.innerHTML = `
                <img src="${e.target.result}" alt="獎勵圖片" class="backstage-reward-preview" id="preview-${index}">
                <div class="backstage-file-overlay">
                    <span>📷 更換圖片</span>
                </div>
            `;
        }
    };
    reader.readAsDataURL(file);
}

// 規則管理功能
// 載入集點卡統計數據
async function loadPointsStats() {
    try {
        const storeSlug = window.location.pathname.split('/')[1];
        const response = await fetch(`/${storeSlug}/backstage/points-stats`);
        const result = await response.json();
        
        if (result.success) {
            displayPointsStats(result.stats);
        } else {
            console.error('載入統計數據失敗:', result.error);
        }
    } catch (error) {
        console.error('載入統計數據錯誤:', error);
    }
}

// 顯示統計數據
function displayPointsStats(stats) {
    const statItems = document.querySelectorAll('.backstage-stats-grid .backstage-stat-item');
    
    const statsData = [
        stats.totalMembers,
        stats.activeMembers,
        stats.totalRedeemed,
        stats.totalPoints
    ];
    
    statItems.forEach((item, index) => {
        const loadingSpan = item.querySelector('.loading-stats');
        const numberSpan = item.querySelector('.stat-number');
        
        if (loadingSpan && numberSpan) {
            // 隱藏載入動畫
            loadingSpan.style.display = 'none';
            
            // 顯示實際數據
            numberSpan.textContent = statsData[index].toLocaleString();
            numberSpan.style.display = 'block';
            
            // 添加數字變化動畫
            numberSpan.style.opacity = '0';
            setTimeout(() => {
                numberSpan.style.transition = 'opacity 0.5s ease';
                numberSpan.style.opacity = '1';
            }, 100);
        }
    });
    
}

async function loadRules() {
    try {
        const response = await fetch(`/${storeSlug}/backstage/rules`);
        const result = await response.json();
        
        const rulesList = document.getElementById('rules-list');
        const loadingElement = rulesList.querySelector('.loading-rules');
        
        if (loadingElement) {
            loadingElement.remove();
        }
        
        if (result.success && result.rules && result.rules.length > 0) {
            displayRules(result.rules);
        } else {
            // 如果沒有規則，顯示空狀態並添加第一個規則
            rulesList.innerHTML = '';
            addRule();
        }
    } catch (error) {
        console.error('載入規則失敗:', error);
        const rulesList = document.getElementById('rules-list');
        rulesList.innerHTML = '<div class="backstage-error">載入規則失敗，請重新整理頁面</div>';
    }
}

function displayRules(rules) {
    const rulesList = document.getElementById('rules-list');
    rulesList.innerHTML = '';
    
    rules.forEach((rule, index) => {
        addRuleItem(rule.text, index + 1);
    });
    
    // 如果沒有規則，至少添加一個空規則
    if (rules.length === 0) {
        addRule();
    }
}

function addRule() {
    const rulesList = document.getElementById('rules-list');
    const ruleCount = rulesList.querySelectorAll('.rule-item').length;
    addRuleItem('', ruleCount + 1);
}

function addRuleItem(text = '', article = 1) {
    const rulesList = document.getElementById('rules-list');
    const ruleCount = rulesList.querySelectorAll('.rule-item').length;
    
    const ruleItem = document.createElement('div');
    ruleItem.className = 'rule-item';
    ruleItem.innerHTML = `
        <div class="rule-item-header">
            <h4>規則 ${article}</h4>
            ${ruleCount > 0 ? '<button type="button" class="backstage-btn-icon backstage-btn-remove" onclick="removeRule(this)">×</button>' : ''}
        </div>
        <div class="backstage-form-group">
            <label>規則內容</label>
            <input type="text" name="ruleText[]" value="${text}" maxlength="100" 
                   placeholder="例如：每次消費滿100元可獲得1點" required>
            <small>最多100個字元</small>
        </div>
    `;
    
    rulesList.appendChild(ruleItem);
    updateRuleHeaders();
}

function removeRule(button) {
    const ruleItem = button.closest('.rule-item');
    const rulesList = document.getElementById('rules-list');
    
    // 確保至少保留一個規則
    if (rulesList.querySelectorAll('.rule-item').length > 1) {
        ruleItem.remove();
        updateRuleHeaders();
    } else {
        showNotification('至少需要保留一個規則', 'error');
    }
}

function updateRuleHeaders() {
    const ruleItems = document.querySelectorAll('.rule-item');
    ruleItems.forEach((item, index) => {
        const header = item.querySelector('h4');
        header.textContent = `規則 ${index + 1}`;
        
        // 更新刪除按鈕的顯示
        const removeBtn = item.querySelector('.backstage-btn-remove');
        if (removeBtn) {
            removeBtn.style.display = ruleItems.length > 1 ? 'block' : 'none';
        }
    });
}

async function submitRules() {
    const form = document.getElementById('rulesForm');
    const formData = new FormData(form);
    const ruleTexts = formData.getAll('ruleText[]');
    
    // 過濾空規則
    const rules = ruleTexts
        .filter(text => text.trim())
        .map((text, index) => ({
            article: index + 1,
            text: text.trim()
        }));
    
    if (rules.length === 0) {
        showNotification('請至少添加一個規則', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/${storeSlug}/backstage/rules`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rules })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('使用規則已更新');
            // 重新載入規則以確保順序正確
            await loadRules();
        } else {
            showNotification(result.message || '更新失敗', 'error');
        }
    } catch (error) {
        console.error('提交規則失敗:', error);
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
                        <button onclick="copyToClipboard('${qrData.url}')" class="copy-btn">
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
                <button onclick="downloadQRCode()" class="download-btn">
                    💾 下載QR碼
                </button>
                <button onclick="deleteCurrentQRCode()" class="delete-btn">
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

// 更新QR碼狀態
async function updateQRCodeStatus() {
    try {
        const response = await fetch(`/${storeSlug}/backstage/qrcode/status`);
        const result = await response.json();
        
        const qrDisplay = document.getElementById('qrCodeDisplay');
        if (!qrDisplay) return;
        
        if (result.success && result.hasActiveQR) {
            currentQR = result.qrcode;
            displayQRCode(result.qrcode);
            startCountdown(new Date(result.qrcode.expiresAt));
        } else {
            qrDisplay.innerHTML = `
                <div class="backstage-info-box">
                    <p>📱 目前沒有活躍的QR碼</p>
                    <p>請使用上方表單生成新的QR碼</p>
                </div>
            `;
            qrDisplay.style.display = 'block';
            currentQR = null;
        }
    } catch (error) {
        console.error('獲取QR碼狀態失敗:', error);
        const qrDisplay = document.getElementById('qrCodeDisplay');
        if (qrDisplay) {
            qrDisplay.innerHTML = `
                <div class="backstage-info-box">
                    <p>❌ 無法獲取QR碼狀態</p>
                </div>
            `;
            qrDisplay.style.display = 'block';
        }
    }
}

// 倒數計時函數
function startCountdown(expiresAt) {
    const countdownElement = document.getElementById('countdown');
    if (!countdownElement) return;
    
    const updateCountdown = () => {
        const now = new Date();
        const timeLeft = expiresAt - now;
        
        if (timeLeft <= 0) {
            countdownElement.textContent = '已過期';
            countdownElement.className = 'countdown danger';
            updateQRCodeStatus(); // 重新檢查狀態
            return;
        }
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        
        countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft < 60000) { // 小於1分鐘
            countdownElement.className = 'countdown danger';
        } else if (timeLeft < 120000) { // 小於2分鐘
            countdownElement.className = 'countdown warning';
        } else {
            countdownElement.className = 'countdown';
        }
        
        setTimeout(updateCountdown, 1000);
    };
    
    updateCountdown();
}

// 複製到剪貼簿
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('網址已複製到剪貼簿', 'success');
        }).catch(err => {
            console.error('複製失敗:', err);
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

// 備用複製方法
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // 避免在頁面中顯示
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        const msg = successful ? '成功' : '失敗';
        showNotification(`複製到剪貼簿${msg}`, successful ? 'success' : 'error');
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        showNotification('複製失敗', 'error');
    }
    
    document.body.removeChild(textArea);
}

// ===== 時段管理功能 =====

// 初始化訂位基本設定表單
function initializeBookingBasicSettings() {
    console.log('⚙️ 初始化訂位基本設定表單...');
    
    const bookingBasicSettingsForm = document.getElementById('bookingBasicSettingsForm');
    console.log('📋 訂位基本設定表單:', bookingBasicSettingsForm ? '✅ 找到' : '❌ 未找到');
    
    if (bookingBasicSettingsForm) {
        // 移除已有的事件監聽器（避免重複綁定）
        const newForm = bookingBasicSettingsForm.cloneNode(true);
        bookingBasicSettingsForm.parentNode.replaceChild(newForm, bookingBasicSettingsForm);
        
        // 重新綁定事件
        newForm.addEventListener('submit', function(e) {
            console.log('📝 基本設定表單提交事件觸發');
            e.preventDefault();
            submitBookingBasicSettings();
        });
        
        console.log('✅ 訂位基本設定表單事件已重新綁定');
        
        // 初始化特殊需求選項控制
        initializeSpecialRequestsToggle();
    } else {
        console.error('❌ 無法找到 bookingBasicSettingsForm 表單');
    }
}

// 載入訂位設定數據
async function loadBookingSettings() {
    console.log('🔄 載入訂位設定數據...');
    
    if (!storeSlug || storeSlug === 'undefined') {
        console.error('❌ storeSlug 無效:', storeSlug);
        return;
    }
    
    try {
        const response = await fetch(`/${storeSlug}/api/booking-settings`);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ 訂位設定載入成功:', data);
            // 這裡可以預填表單數據
        } else {
            console.log('⚠️ 訂位設定載入失敗，使用預設值');
        }
    } catch (error) {
        console.error('❌ 載入訂位設定時發生錯誤:', error);
    }
}

// 初始化時段管理表單
function initializeTimeSlotManagement() {
    console.log('🔄 初始化時段管理功能...');
    
    // 檢查必要元素是否存在
    const gridContainer = document.getElementById('timeSlots-grid');
    console.log('📦 時段網格容器:', gridContainer ? '✅ 找到' : '❌ 未找到');
    
    // 新增時段表單
    const addTimeSlotForm = document.getElementById('addTimeSlotForm');
    console.log('📝 新增時段表單:', addTimeSlotForm ? '✅ 找到' : '❌ 未找到');
    if (addTimeSlotForm) {
        addTimeSlotForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addNewTimeSlot();
        });
    }
    
    // 時段編輯彈窗表單
    const timeslotModalForm = document.getElementById('timeslotModalForm');
    console.log('🖼️ 編輯彈窗表單:', timeslotModalForm ? '✅ 找到' : '❌ 未找到');
    if (timeslotModalForm) {
        timeslotModalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateTimeSlot();
        });
    }
    
    // 載入設定數據
    loadBookingSettings();
    
    // 載入現有時段
    if (gridContainer) {
        loadTimeSlots();
    } else {
        console.error('❌ 無法載入時段，因為找不到容器元素');
    }
}

// 載入時段列表
async function loadTimeSlots() {
    const gridContainer = document.getElementById('timeSlots-grid');
    if (!gridContainer) {
        console.error('❌ 找不到 timeSlots-grid 容器');
        return;
    }
    
    // 防止重複調用
    if (gridContainer.dataset.loading === 'true') {
        console.log('⚠️ 正在載入中，跳過重複請求');
        return;
    }
    
    console.log('🔄 開始載入時段列表，storeSlug:', storeSlug);
    
    // 檢查 storeSlug 是否有效
    if (!storeSlug || storeSlug === 'undefined' || storeSlug === '') {
        console.error('❌ storeSlug 無效:', storeSlug);
        gridContainer.innerHTML = '<div class="backstage-error"><p>店家代碼無效，請重新載入頁面</p><button onclick="window.location.reload()" class="backstage-btn backstage-btn-outline">重新載入</button></div>';
        return;
    }
    
    gridContainer.dataset.loading = 'true';
    
    try {
        gridContainer.innerHTML = '<div class="loading-timeslots"><p>🔄 正在載入時段設定...</p></div>';
        
        const url = `/${storeSlug}/api/timeSlots?management=true`;
        console.log('📡 請求 URL:', url);
        
        const response = await fetch(url, {
            headers: {
                'X-Management': 'true'
            }
        });
        console.log('📊 響應狀態:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API 錯誤響應:', errorText);
            
            // 嘗試解析錯誤信息
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(`API 錯誤: ${errorData.message || errorText}`);
            } catch (parseError) {
                throw new Error(`載入失敗 (${response.status}): ${response.statusText} - ${errorText}`);
            }
        }
        
        const rawResponse = await response.text();
        console.log('📄 原始響應:', rawResponse);
        
        let data;
        try {
            data = JSON.parse(rawResponse);
        } catch (parseError) {
            console.error('❌ JSON 解析錯誤:', parseError);
            console.error('❌ 原始響應內容:', rawResponse);
            throw new Error(`回應格式錯誤，無法解析 JSON: ${parseError.message}`);
        }
        
        console.log('✅ 解析後的數據:', data);
        
        if (data.success && data.timeSlots) {
            displayTimeSlots(data.timeSlots);
        } else if (data.success === false) {
            console.error('❌ API 回應錯誤:', data.message);
            gridContainer.innerHTML = `<div class="backstage-error"><p>API 錯誤: ${data.message}</p><button onclick="loadTimeSlots()" class="backstage-btn backstage-btn-outline">重試</button></div>`;
        } else {
            console.error('❌ API 回應格式錯誤:', data);
            console.error('❌ 預期格式: {success: true, timeSlots: [...]}');
            gridContainer.innerHTML = `<div class="backstage-error"><p>API 回應格式錯誤<br/>預期: success 和 timeSlots 欄位<br/>實際: ${JSON.stringify(data).substring(0, 200)}...</p><button onclick="loadTimeSlots()" class="backstage-btn backstage-btn-outline">重試</button></div>`;
        }
    } catch (error) {
        console.error('❌ 載入時段失敗:', error);
        gridContainer.innerHTML = `<div class="backstage-error"><p>載入時段設定失敗: ${error.message}</p><button onclick="loadTimeSlots()" class="backstage-btn backstage-btn-outline">重試</button></div>`;
    } finally {
        // 移除載入標記
        gridContainer.dataset.loading = 'false';
    }
}

// 顯示時段列表
function displayTimeSlots(timeSlots) {
    const gridContainer = document.getElementById('timeSlots-grid');
    if (!gridContainer) return;
    
    if (timeSlots.length === 0) {
        gridContainer.innerHTML = `
            <div class="backstage-info-box">
                <p>目前沒有設定任何時段</p>
                <p>請使用上方表單新增第一個訂位時段</p>
            </div>
        `;
        return;
    }
    
    console.log('📊 收到的時段數據:', timeSlots);
    console.log('🔧 開始分組顯示，使用新版本按日期分組布局');
    
    let timeSlotsHTML = '';
    let currentDateLabel = '';
    let hasOpenSection = false;
    
    // 直接按後端提供的順序處理時段，不重新分組
    timeSlots.forEach((slot, index) => {
        const dateLabel = slot.dateLabel || 'undefined';
        
        // 如果遇到新的日期，關閉上一個區段並開始新區段
        if (dateLabel !== currentDateLabel) {
            // 關閉前一個日期區段
            if (hasOpenSection) {
                timeSlotsHTML += `
                    </div>
                </div>
                `;
            }
            
            // 開始新的日期區段
            timeSlotsHTML += `
                <div class="timeslot-date-section">
                    <h4 class="timeslot-date-header">-- ${dateLabel} --</h4>
                    <div class="timeslot-cards-row">
            `;
            
            currentDateLabel = dateLabel;
            hasOpenSection = true;
        }
        
        // 統一狀態處理：使用後端提供的狀態資訊
        const status = slot.status || 'available';
        const statusText = slot.statusText || '開放中';
        
        // 統一樣式和圖示
        let statusIcon, cardClass, statusClass;
        
        if (status === 'closed') {
            statusIcon = '🚫';
            statusClass = 'closed';
            cardClass = 'disabled';
        } else if (status === 'full') {
            statusIcon = '🈵';
            statusClass = 'full';
            cardClass = 'fully-booked';
        } else {
            statusIcon = '✅';
            statusClass = 'available';
            cardClass = '';
        }
        
        timeSlotsHTML += `
            <div class="backstage-timeslot-card ${cardClass}" data-slot-id="${slot._id}" data-date="${slot.date}">
                <div class="timeslot-header">
                    <div class="timeslot-time">${slot.time}</div>
                    <div class="timeslot-status ${statusClass}">
                        ${statusIcon} ${statusText}
                    </div>
                </div>
                <div class="timeslot-info">
                    <p><strong>最多訂位:</strong> ${slot.maxBookings} 組</p>
                    <p><strong>已訂組數:</strong> ${slot.currentBookings} 組</p>
                </div>
                <div class="timeslot-actions">
                    <button class="timeslot-btn timeslot-btn-edit" onclick="editTimeSlot('${slot._id}', '${slot.time}', ${slot.maxBookings}, ${slot.available})">
                        編輯
                    </button>
                    ${slot.dayType === 'today' ? `
                        <button class="timeslot-btn timeslot-btn-toggle ${slot.available ? 'close' : ''}" 
                                onclick="toggleTimeSlot('${slot._id}', ${!slot.available})"
                                ${status === 'full' && slot.available ? 'title="時段已滿，但仍可關閉"' : ''}>
                            ${slot.available ? '關閉' : '開啟'}
                        </button>
                    ` : ''}
                    <button class="timeslot-btn timeslot-btn-view" onclick="viewTimeSlotBookings('${slot.date}', '${slot.time}')">
                        查看訂位${slot.currentBookings > 0 ? ` (${slot.currentBookings})` : ''}
                    </button>
                </div>
            </div>
        `;
    });
    
    // 關閉最後一個日期區段
    if (hasOpenSection) {
        timeSlotsHTML += `
                </div>
            </div>
        `;
    }
    
    gridContainer.innerHTML = timeSlotsHTML;
}

// 新增時段
async function addNewTimeSlot() {
    const form = document.getElementById('addTimeSlotForm');
    const formData = new FormData(form);
    
    const timeSlotData = {
        time: formData.get('newTimeSlot'),
        maxBookings: parseInt(formData.get('newMaxBookings')),
        available: true
    };
    
    try {
        showLoading();
        
        const response = await fetch(`/${storeSlug}/api/timeslots/management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(timeSlotData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('時段新增成功！');
            form.reset();
            loadTimeSlots(); // 重新載入時段列表
        } else {
            throw new Error(result.message || '新增失敗');
        }
    } catch (error) {
        console.error('新增時段失敗:', error);
        showNotification(error.message || '新增時段失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 編輯時段（開啟彈窗）
function editTimeSlot(slotId, time, maxBookings, available) {
    const modal = document.getElementById('timeslotModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalSlotId = document.getElementById('modalSlotId');
    const modalTime = document.getElementById('modalTime');
    const modalMaxBookings = document.getElementById('modalMaxBookings');
    const modalAvailable = document.getElementById('modalAvailable');
    
    if (!modal) return;
    
    modalTitle.textContent = `編輯時段 - ${time}`;
    modalSlotId.value = slotId;
    modalTime.value = time;
    modalMaxBookings.value = maxBookings;
    modalAvailable.checked = available;
    
    modal.classList.add('show');
}

// 關閉編輯彈窗
function closeTimeslotModal() {
    const modal = document.getElementById('timeslotModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 更新時段
async function updateTimeSlot() {
    const form = document.getElementById('timeslotModalForm');
    const formData = new FormData(form);
    
    const slotId = formData.get('slotId');
    const updateData = {
        time: formData.get('time'),
        maxBookings: parseInt(formData.get('maxBookings')),
        available: formData.get('available') === 'on'
    };
    
    try {
        showLoading();
        
        const response = await fetch(`/${storeSlug}/api/timeslots/management/${slotId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('時段更新成功！');
            closeTimeslotModal();
            loadTimeSlots(); // 重新載入時段列表
        } else {
            throw new Error(result.message || '更新失敗');
        }
    } catch (error) {
        console.error('更新時段失敗:', error);
        showNotification(error.message || '更新時段失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 切換時段開關狀態
async function toggleTimeSlot(slotId, newAvailableStatus) {
    console.log(`準備切換時段 - ID: ${slotId}, 新狀態: ${newAvailableStatus}`);
    
    if (!slotId) {
        showNotification('時段ID無效', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const url = `/${storeSlug}/api/timeslots/management/${slotId}/toggle`;
        console.log(`請求URL: ${url}`);
        
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ available: newAvailableStatus })
        });
        
        console.log(`響應狀態: ${response.status}`);
        
        if (!response.ok) {
            // 嘗試解析錯誤響應
            const errorText = await response.text();
            console.error('API錯誤響應:', errorText);
            
            let errorMessage = '操作失敗';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (e) {
                console.error('無法解析錯誤響應為JSON:', e);
            }
            
            throw new Error(`${response.status}: ${errorMessage}`);
        }
        
        const result = await response.json();
        console.log('API響應結果:', result);
        
        if (result.success) {
            const action = newAvailableStatus ? '開啟' : '關閉';
            showNotification(`時段${action}成功！`);
            loadTimeSlots(); // 重新載入時段列表
        } else {
            throw new Error(result.message || '操作失敗');
        }
    } catch (error) {
        console.error('切換時段狀態失敗:', error);
        showNotification(error.message || '操作失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 刪除時段
async function deleteTimeSlot(slotId, time) {
    if (!confirm(`確定要刪除時段「${time}」嗎？\n刪除後將無法復原。`)) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/${storeSlug}/api/timeslots/management/${slotId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('時段刪除成功！');
            loadTimeSlots(); // 重新載入時段列表
        } else {
            throw new Error(result.message || '刪除失敗');
        }
    } catch (error) {
        console.error('刪除時段失敗:', error);
        showNotification(error.message || '刪除時段失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 全部開啟/關閉時段
async function toggleAllTimeSlots(available) {
    const action = available ? '開啟' : '關閉';
    if (!confirm(`確定要${action}所有時段嗎？`)) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/${storeSlug}/api/timeslots/management/toggle-all`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ available })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification(`所有時段${action}成功！`);
            loadTimeSlots(); // 重新載入時段列表
        } else {
            throw new Error(result.message || '操作失敗');
        }
    } catch (error) {
        console.error('批量操作失敗:', error);
        showNotification(error.message || '操作失敗', 'error');
    } finally {
        hideLoading();
    }
}

// 點擊彈窗背景關閉彈窗
document.addEventListener('click', function(e) {
    const modal = document.getElementById('timeslotModal');
    if (modal && e.target === modal) {
        closeTimeslotModal();
    }
});

// 查看特定日期時段的訂位資訊
async function viewTimeSlotBookings(date, time) {
    try {
        const slug = getCurrentSlug();
        const response = await fetch(`/${slug}/api/bookings/${date}/${time}`);
        const data = await response.json();
        
        if (data.success) {
            showBookingsModal(date, time, data.bookings);
        } else {
            alert('獲取訂位資訊失敗: ' + (data.message || '未知錯誤'));
        }
    } catch (error) {
        console.error('查看訂位失敗:', error);
        alert('查看訂位失敗，請稍後再試');
    }
}

// 顯示訂位詳情彈窗
function showBookingsModal(date, time, bookings) {
    // 移除舊的彈窗
    const existingModal = document.getElementById('bookings-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const totalGuests = bookings.reduce((sum, booking) => {
        return sum + (booking.adults || 0) + (booking.children || 0);
    }, 0);
    
    const bookingsHTML = bookings.length > 0 ? 
        bookings.map(booking => `
            <div class="booking-item">
                <div class="booking-header">
                    <strong>${booking.name} (${booking.gender})</strong>
                    <span class="booking-status status-${booking.status}">${booking.status === 'confirmed' ? '已確認' : '待確認'}</span>
                </div>
                <div class="booking-details">
                    <p><strong>聯絡方式:</strong> ${booking.phone} / ${booking.email}</p>
                    <p><strong>人數:</strong> 大人 ${booking.adults || 0} 位，小孩 ${booking.children || 0} 位</p>
                    ${booking.vegetarian && booking.vegetarian !== 'no' ? `<p><strong>素食:</strong> ${booking.vegetarian}</p>` : ''}
                    ${booking.special ? `<p><strong>特殊需求:</strong> ${booking.special}</p>` : ''}
                    ${booking.note ? `<p><strong>備註:</strong> ${booking.note}</p>` : ''}
                    <p><strong>訂位時間:</strong> ${new Date(booking.createdAt).toLocaleString('zh-TW')}</p>
                </div>
            </div>
        `).join('') : '<p class="no-bookings">此時段目前沒有訂位</p>';
    
    const modalHTML = `
        <div id="bookings-modal" class="modal-overlay">
            <div class="modal-content bookings-modal-content">
                <div class="modal-header">
                    <h3>${date} ${time} 的訂位清單</h3>
                    <button type="button" class="modal-close" onclick="closeBookingsModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="bookings-summary">
                        <p><strong>總共:</strong> ${bookings.length} 組訂位，${totalGuests} 位客人</p>
                    </div>
                    <div class="bookings-list">
                        ${bookingsHTML}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeBookingsModal()">關閉</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 關閉訂位詳情彈窗
function closeBookingsModal() {
    const modal = document.getElementById('bookings-modal');
    if (modal) {
        modal.remove();
    }
}

// 獲取當前商店 slug
function getCurrentSlug() {
    const path = window.location.pathname;
    const slugMatch = path.match(/^\/([^\/]+)/);
    return slugMatch ? slugMatch[1] : '';
} 
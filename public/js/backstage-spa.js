// 商家後台 SPA JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeSPA();
    initializeForms();
    initializeImagePreview();
    initializeDynamicLists();
    
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
}

// 初始化表單
function initializeForms() {
    // 基本設定表單
    const basicInfoForm = document.getElementById('basicInfoForm');
    if (basicInfoForm) {
        basicInfoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitBasicSettings();
        });
    }
    
    // 餐廳圖片表單
    const restaurantImageForm = document.getElementById('restaurantImageForm');
    if (restaurantImageForm) {
        restaurantImageForm.addEventListener('submit', function(e) {
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
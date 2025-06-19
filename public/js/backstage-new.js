// 新後台管理頁面JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeForms();
    initializeImagePreviews();
});

// 初始化選項卡
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.backstage-tab-btn');
    const tabContents = document.querySelectorAll('.backstage-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // 移除所有活動狀態
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 添加活動狀態
            button.classList.add('active');
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// 初始化表單
function initializeForms() {
    // 基本資訊表單
    const basicInfoForm = document.getElementById('basicInfoForm');
    if (basicInfoForm) {
        basicInfoForm.addEventListener('submit', handleBasicInfoSubmit);
    }

    // 餐廳圖片表單
    const restaurantImageForm = document.getElementById('restaurantImageForm');
    if (restaurantImageForm) {
        restaurantImageForm.addEventListener('submit', handleImageSubmit);
    }

    // 集點卡圖片表單
    const cardImageForm = document.getElementById('cardImageForm');
    if (cardImageForm) {
        cardImageForm.addEventListener('submit', handleImageSubmit);
    }

    // 時段設定表單
    const timeSlotsForm = document.getElementById('timeSlotsForm');
    if (timeSlotsForm) {
        timeSlotsForm.addEventListener('submit', handleTimeSlotsSubmit);
    }

    // 用餐規則表單
    const diningRulesForm = document.getElementById('diningRulesForm');
    if (diningRulesForm) {
        diningRulesForm.addEventListener('submit', handleDiningRulesSubmit);
    }
}

// 初始化圖片預覽
function initializeImagePreviews() {
    const restaurantImageInput = document.getElementById('restaurantImageInput');
    if (restaurantImageInput) {
        restaurantImageInput.addEventListener('change', function() {
            previewImage(this, 'restaurantImagePreview');
        });
    }

    const cardImageInput = document.getElementById('cardImageInput');
    if (cardImageInput) {
        cardImageInput.addEventListener('change', function() {
            previewImage(this, 'cardImagePreview');
        });
    }
}

// 圖片預覽功能
function previewImage(input, previewId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    
    if (file && preview) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// 處理基本資訊表單提交
async function handleBasicInfoSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        setButtonLoading(submitBtn, true);
        
        const formData = new FormData(form);
        const response = await fetch(`/${storeSlug}/backstage/update-basic`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('基本資訊更新成功', 'success');
        } else {
            showNotification(result.message || '更新失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// 處理圖片表單提交
async function handleImageSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        setButtonLoading(submitBtn, true);
        
        const formData = new FormData(form);
        const response = await fetch(`/${storeSlug}/backstage/update-image`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('圖片更新成功', 'success');
        } else {
            showNotification(result.message || '更新失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// 處理時段設定表單提交
async function handleTimeSlotsSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        setButtonLoading(submitBtn, true);
        
        const formData = new FormData(form);
        const response = await fetch(`/${storeSlug}/backstage/update-timeslots`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('時段設定更新成功', 'success');
        } else {
            showNotification(result.message || '更新失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// 處理用餐規則表單提交
async function handleDiningRulesSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        setButtonLoading(submitBtn, true);
        
        const formData = new FormData(form);
        const response = await fetch(`/${storeSlug}/backstage/update-rules`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('用餐規則更新成功', 'success');
        } else {
            showNotification(result.message || '更新失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// 添加時段
function addTimeSlot() {
    const list = document.getElementById('timeSlots-list');
    const items = list.querySelectorAll('.backstage-list-item');
    const lastItem = items[items.length - 1];
    
    // 移除最後一個項目的添加按鈕
    const lastAddBtn = lastItem.querySelector('.backstage-btn-add');
    if (lastAddBtn) {
        lastAddBtn.remove();
    }
    
    // 如果只有一個項目，添加刪除按鈕
    if (items.length === 1) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'backstage-btn-icon backstage-btn-remove';
        removeBtn.textContent = '×';
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
    
    list.appendChild(newItem);
}

// 移除時段
function removeTimeSlot(button) {
    const list = document.getElementById('timeSlots-list');
    const items = list.querySelectorAll('.backstage-list-item');
    
    if (items.length <= 1) return;
    
    const item = button.closest('.backstage-list-item');
    item.remove();
    
    // 檢查是否需要重新添加添加按鈕
    const remainingItems = list.querySelectorAll('.backstage-list-item');
    const lastItem = remainingItems[remainingItems.length - 1];
    
    if (!lastItem.querySelector('.backstage-btn-add')) {
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'backstage-btn-icon backstage-btn-add';
        addBtn.textContent = '+';
        addBtn.onclick = addTimeSlot;
        lastItem.appendChild(addBtn);
    }
    
    // 如果只剩一個項目，移除刪除按鈕
    if (remainingItems.length === 1) {
        const removeBtn = lastItem.querySelector('.backstage-btn-remove');
        if (removeBtn) {
            removeBtn.remove();
        }
    }
}

// 添加用餐規則
function addDiningRule() {
    const list = document.getElementById('diningRules-list');
    const items = list.querySelectorAll('.backstage-list-item');
    const lastItem = items[items.length - 1];
    
    // 移除最後一個項目的添加按鈕
    const lastAddBtn = lastItem.querySelector('.backstage-btn-add');
    if (lastAddBtn) {
        lastAddBtn.remove();
    }
    
    // 如果只有一個項目，添加刪除按鈕
    if (items.length === 1) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'backstage-btn-icon backstage-btn-remove';
        removeBtn.textContent = '×';
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
    
    list.appendChild(newItem);
}

// 移除用餐規則
function removeDiningRule(button) {
    const list = document.getElementById('diningRules-list');
    const items = list.querySelectorAll('.backstage-list-item');
    
    if (items.length <= 1) return;
    
    const item = button.closest('.backstage-list-item');
    item.remove();
    
    // 檢查是否需要重新添加添加按鈕
    const remainingItems = list.querySelectorAll('.backstage-list-item');
    const lastItem = remainingItems[remainingItems.length - 1];
    
    if (!lastItem.querySelector('.backstage-btn-add')) {
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'backstage-btn-icon backstage-btn-add';
        addBtn.textContent = '+';
        addBtn.onclick = addDiningRule;
        lastItem.appendChild(addBtn);
    }
    
    // 如果只剩一個項目，移除刪除按鈕
    if (remainingItems.length === 1) {
        const removeBtn = lastItem.querySelector('.backstage-btn-remove');
        if (removeBtn) {
            removeBtn.remove();
        }
    }
}

// 確認刪除餐廳
function confirmDeleteStore() {
    const confirmed = confirm('⚠️ 警告：此操作將永久刪除整個餐廳系統和所有相關數據！此操作無法復原！您確定要繼續嗎？');
    
    if (confirmed) {
        const doubleConfirmed = confirm('再次確認：您真的要刪除整個餐廳系統嗎？這個動作無法復原！');
        
        if (doubleConfirmed) {
            deleteStore();
        }
    }
}

// 刪除餐廳
async function deleteStore() {
    try {
        const response = await fetch(`/${storeSlug}/backstage/delete-store`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('餐廳已成功刪除');
            window.location.href = '/';
        } else {
            showNotification(result.message || '刪除失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('網路錯誤，請稍後再試', 'error');
    }
}

// 設置按鈕載入狀態
function setButtonLoading(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// 顯示通知
function showNotification(message, type = 'info') {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.className = `backstage-notification backstage-notification-${type}`;
    notification.textContent = message;
    
    // 添加樣式
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        transform: translateX(100%);
    `;
    
    // 根據類型設置顏色
    switch (type) {
        case 'success':
            notification.style.background = '#d4edda';
            notification.style.color = '#155724';
            notification.style.border = '1px solid #c3e6cb';
            break;
        case 'error':
            notification.style.background = '#f8d7da';
            notification.style.color = '#721c24';
            notification.style.border = '1px solid #f5c6cb';
            break;
        default:
            notification.style.background = '#d1ecf1';
            notification.style.color = '#0c5460';
            notification.style.border = '1px solid #bee5eb';
    }
    
    document.body.appendChild(notification);
    
    // 顯示動畫
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 自動移除
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
} 
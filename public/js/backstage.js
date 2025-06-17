// 動態增減規則
function addRule() {
    const rulesList = document.getElementById('rules-list');
    const idx = rulesList.children.length;
    const div = document.createElement('div');
    div.className = 'rule-item';
    div.innerHTML = `
        <input type="text" name="rules[]" placeholder="請輸入規則" required>
        <span class="add-btn" onclick="addRule()">➕</span>
        <span class="remove-btn" onclick="removeRule(this)">🗑️</span>
    `;
    rulesList.appendChild(div);
    updateRuleButtons();
}
function removeRule(btn) {
    btn.parentElement.remove();
    updateRuleButtons();
}
function updateRuleButtons() {
    const items = document.querySelectorAll('#rules-list .rule-item');
    items.forEach((item, idx) => {
        const addBtn = item.querySelector('.add-btn');
        if (addBtn) {
            addBtn.style.display = (idx === items.length - 1) ? '' : 'none';
        }
        
        const removeBtn = item.querySelector('.remove-btn');
        if (removeBtn) {
            if (items.length === 1) {
                removeBtn.style.display = 'none';
            } else {
                removeBtn.style.display = '';
            }
        }
    });
}

// 動態增減獎勵
let rewardIdx = 1;
function addReward() {
    const rewardsList = document.getElementById('rewards-list');
    const idx = rewardIdx++;
    const div = document.createElement('div');
    div.className = 'reward-item';
    div.innerHTML = `
        <input type="text" name="rewards[${idx}][name]" placeholder="獎勵名稱" required>
        <input type="number" name="rewards[${idx}][points]" placeholder="所需點數" min="1" required>
        <input type="file" name="rewards[${idx}][img]" accept=".png,.jpg,.jpeg,.svg" onchange="previewImg(this, ${idx})" required>
        <img id="img-preview-${idx}" class="reward-img-preview" style="display:none;">
        <span class="add-btn" onclick="addReward()">➕</span>
        <span class="remove-btn" onclick="removeReward(this)">🗑️</span>
    `;
    rewardsList.appendChild(div);
    updateRewardButtons();
}
function removeReward(btn) {
    btn.parentElement.remove();
    updateRewardButtons();
}
function updateRewardButtons() {
    const items = document.querySelectorAll('#rewards-list .reward-item');
    items.forEach((item, idx) => {
        const addBtn = item.querySelector('.add-btn');
        if (addBtn) {
            addBtn.style.display = (idx === items.length - 1) ? '' : 'none';
        }
        
        const removeBtn = item.querySelector('.remove-btn');
        if (removeBtn) {
            if (items.length === 1) {
                removeBtn.style.display = 'none';
            } else {
                removeBtn.style.display = '';
            }
        }
    });
}

// 圖片預覽
function previewImg(input, idx) {
    const file = input.files[0];
    const preview = document.getElementById('img-preview-' + idx);
    if (file && /\.(png|jpe?g|svg)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = '';
        };
        reader.readAsDataURL(file);
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }
}

// 動態增減時段
function addTimeSlot() {
    const timeSlotsList = document.getElementById('timeSlots-list');
    const div = document.createElement('div');
    div.className = 'timeSlot-item';
    div.innerHTML = `
        <input type="text" name="timeSlots[]" placeholder="例如: 12:00-13:00" required>
        <span class="add-btn" onclick="addTimeSlot()">➕</span>
        <span class="remove-btn" onclick="removeTimeSlot(this)">🗑️</span>
    `;
    timeSlotsList.appendChild(div);
    updateTimeSlotButtons();
}

function removeTimeSlot(btn) {
    btn.parentElement.remove();
    updateTimeSlotButtons();
}

function updateTimeSlotButtons() {
    const items = document.querySelectorAll('#timeSlots-list .timeSlot-item');
    items.forEach((item, idx) => {
        const addBtn = item.querySelector('.add-btn');
        if (addBtn) {
            addBtn.style.display = (idx === items.length - 1) ? '' : 'none';
        }
        
        const removeBtn = item.querySelector('.remove-btn');
        if (removeBtn) {
            if (items.length === 1) {
                removeBtn.style.display = 'none';
            } else {
                removeBtn.style.display = '';
            }
        }
    });
}

// 動態增減用餐規則
function addDiningRule() {
    const diningRulesList = document.getElementById('diningRules-list');
    const div = document.createElement('div');
    div.className = 'rule-item';
    div.innerHTML = `
        <input type="text" name="diningRules[]" placeholder="請輸入用餐規則" required>
        <span class="add-btn" onclick="addDiningRule()">➕</span>
        <span class="remove-btn" onclick="removeDiningRule(this)">🗑️</span>
    `;
    diningRulesList.appendChild(div);
    updateDiningRuleButtons();
}

function removeDiningRule(btn) {
    btn.parentElement.remove();
    updateDiningRuleButtons();
}

function updateDiningRuleButtons() {
    const items = document.querySelectorAll('#diningRules-list .rule-item');
    items.forEach((item, idx) => {
        const addBtn = item.querySelector('.add-btn');
        if (addBtn) {
            addBtn.style.display = (idx === items.length - 1) ? '' : 'none';
        }
        
        const removeBtn = item.querySelector('.remove-btn');
        if (removeBtn) {
            if (items.length === 1) {
                removeBtn.style.display = 'none';
            } else {
                removeBtn.style.display = '';
            }
        }
    });
}

// 一般圖片預覽
function previewImage(input, previewId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    if (file && /\.(png|jpe?g|svg)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = '';
        };
        reader.readAsDataURL(file);
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('rules-list')) {
        updateRuleButtons();
    }
    if (document.getElementById('rewards-list')) {
        updateRewardButtons();
    }
    if (document.getElementById('timeSlots-list')) {
        updateTimeSlotButtons();
    }
    if (document.getElementById('diningRules-list')) {
        updateDiningRuleButtons();
    }

    // 功能啟用表單處理
    const featuresForm = document.getElementById('featuresForm');
    if (featuresForm) {
        featuresForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const pointsCheckbox = document.querySelector('input[name="pointsSystem"]');
            const bookingCheckbox = document.querySelector('input[name="bookingSystem"]');
            
            const formData = {
                pointsSystem: pointsCheckbox ? pointsCheckbox.checked : false,
                bookingSystem: bookingCheckbox ? bookingCheckbox.checked : true
            };

            try {
                const response = await fetch(`/${storeSlug}/api/settings/features`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(result.message || '功能設定已更新');
                    // 使用 replace 避免 URL 變長
                    window.location.replace(window.location.pathname);
                } else {
                    console.error('❌ 更新失敗:', result);
                    alert(result.error || '更新失敗，請重試');
                }
            } catch (error) {
                console.error('❌ 網路錯誤:', error);
                alert('發生網路錯誤，請檢查連線後重試');
            }
        });
    }

    // 圖片更新表單處理
    const imagesForm = document.getElementById('imagesForm');
    if (imagesForm) {
        imagesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            const restaurantImage = document.querySelector('input[name="restaurantImage"]').files[0];
            const cardBackgroundImage = document.querySelector('input[name="cardBackgroundImage"]').files[0];
            
            if (restaurantImage) formData.append('restaurantImage', restaurantImage);
            if (cardBackgroundImage) formData.append('cardBackgroundImage', cardBackgroundImage);

            try {
                const response = await fetch(`/${storeSlug}/api/settings/images`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert('圖片已更新');
                    // 使用 replace 避免 URL 變長
                    window.location.replace(window.location.pathname);
                } else {
                    alert(result.error || '更新失敗，請重試');
                }
            } catch (error) {
                console.error('❌ 圖片上傳錯誤:', error);
                alert('發生網路錯誤，請重試');
            }
        });
    }

    // 時段設定表單處理
    const timeSlotsForm = document.getElementById('timeSlotsForm');
    if (timeSlotsForm) {
        timeSlotsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const timeSlots = [];
            document.querySelectorAll('input[name="timeSlots[]"]').forEach(input => {
                if (input.value.trim()) timeSlots.push(input.value.trim());
            });

            try {
                const response = await fetch(`/${storeSlug}/api/settings/timeSlots`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ timeSlots })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(result.message || '時段設定已更新');
                } else {
                    alert(result.error || '更新失敗，請重試');
                }
            } catch (error) {
                console.error('❌ 時段設定錯誤:', error);
                alert('發生網路錯誤，請重試');
            }
        });
    }

    // 用餐規則表單處理
    const diningRulesForm = document.getElementById('diningRulesForm');
    if (diningRulesForm) {
        diningRulesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const diningRules = [];
            document.querySelectorAll('input[name="diningRules[]"]').forEach(input => {
                if (input.value.trim()) diningRules.push(input.value.trim());
            });

            try {
                const response = await fetch(`/${storeSlug}/api/settings/diningRules`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ diningRules })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(result.message || '用餐規則已更新');
                } else {
                    alert(result.error || '更新失敗，請重試');
                }
            } catch (error) {
                console.error('❌ 用餐規則錯誤:', error);
                alert('發生網路錯誤，請重試');
            }
        });
    }
});

// 臨時函數：修復時段數據
window.fixTimeSlots = async function() {
    if (!confirm('確定要修復時段數據嗎？這將清理格式錯誤的時段。')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/fix-timeslots/${storeSlug}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(result.message);
            // 重新載入頁面以顯示修復後的數據
            window.location.reload();
        } else {
            alert(result.error || '修復失敗，請重試');
        }
    } catch (error) {
        console.error('❌ 修復錯誤:', error);
        alert('發生網路錯誤，請重試');
    }
};
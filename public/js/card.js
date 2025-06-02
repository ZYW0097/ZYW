document.addEventListener('DOMContentLoaded', function() {
    // 元素選擇
    const claimCardBtn = document.getElementById('claimCardBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const claimSuccessMessage = document.getElementById('claimSuccessMessage');
    const redeemSuccessMessage = document.getElementById('redeemSuccessMessage');
    const pointsValue = document.querySelector('.points-value');
    const couponsValue = document.querySelector('.coupons-value');
    
    // 新增的頁籤元素
    const pointsTab = document.getElementById('pointsTab');
    const couponsTab = document.getElementById('couponsTab');
    const pointsContent = document.getElementById('pointsContent');
    const couponsContent = document.getElementById('couponsContent');
    const couponsContainer = document.getElementById('couponsContainer');
    const emptyMessage = document.querySelector('.empty-coupons-message');
    
    // 確認對話框相關元素
    const confirmDialog = document.getElementById('confirmDialog');
    const confirmDialogOverlay = document.getElementById('confirmDialogOverlay');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmUseBtn = document.getElementById('confirmUseBtn');
    
    // 當前要使用的優惠券 ID
    let currentCouponId = null;
    
    // 獲取商店識別碼的通用函數
    function getStoreSlug() {
        const pathParts = window.location.pathname.split('/');
        return pathParts[1]; // 假設 URL 格式為 /storeSlug/card
    }
    
    // 頁籤切換功能
    if (pointsTab && couponsTab) {
        pointsTab.addEventListener('click', function() {
            pointsTab.classList.add('active');
            couponsTab.classList.remove('active');
            pointsContent.style.display = 'block';
            couponsContent.style.display = 'none';
        });
        
        couponsTab.addEventListener('click', function() {
            couponsTab.classList.add('active');
            pointsTab.classList.remove('active');
            couponsContent.style.display = 'block';
            pointsContent.style.display = 'none';
            
            // 如果還沒載入過優惠券，就載入
            if (!couponsTab.dataset.loaded) {
                loadCoupons();
            }
        });
    }
    
    // 載入優惠券功能
    async function loadCoupons() {
        try {
            const storeSlug = getStoreSlug();
            if (!storeSlug) throw new Error('無法獲取商店資訊');
            const response = await fetch(`/${storeSlug}/api/points/coupons`);
            const data = await response.json();
            if (response.ok && data.success) {
                couponsTab.dataset.loaded = 'true';
                couponsContainer.innerHTML = '';
                let totalCount = 0;
                if (data.coupons && data.coupons.length > 0) {
                    data.coupons.forEach(coupon => {
                        totalCount += coupon.count || 0;
                        const couponElement = document.createElement('div');
                        couponElement.className = 'coupon-row';
                        couponElement.innerHTML = `
                            <img class="coupon-img" src="${coupon.img || '/images/coupon-default.svg'}" alt="${coupon.name}">
                            <div class="coupon-info">
                                <div class="coupon-name">${coupon.name}</div>
                                <div class="coupon-count">數量: ${coupon.count}</div>
                            </div>
                            <button class="coupon-use" data-coupon-id="${coupon.id}">使用</button>
                        `;
                        couponsContainer.appendChild(couponElement);
                    });
                    // 綁定使用優惠券按鈕事件
                    document.querySelectorAll('.coupon-use').forEach(button => {
                        button.addEventListener('click', function() {
                            const couponId = this.dataset.couponId;
                            if (couponId) {
                                showConfirmDialog(couponId);
                            }
                        });
                    });
                    if (emptyMessage) emptyMessage.style.display = 'none';
                } else {
                    if (emptyMessage) emptyMessage.style.display = 'block';
                }
                // 同步更新上方優惠券數量
                if (couponsValue) {
                    couponsValue.textContent = totalCount;
                }
            } else {
                throw new Error(data.error || '載入優惠券失敗');
            }
        } catch (error) {
            console.error('Error loading coupons:', error);
            couponsContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: #d32f2f;">載入失敗，請重試</div>`;
        }
    }

    // 領取集點卡功能
    if (claimCardBtn) {
        claimCardBtn.addEventListener('click', async function() {
            try {
                // 顯示 loading
                loadingOverlay.style.display = 'flex';
                
                // 從 URL 獲取 storeSlug
                const storeSlug = getStoreSlug();
                
                if (!storeSlug) {
                    throw new Error('無法獲取商店資訊');
                }

                // 發送請求創建集點卡
                const response = await fetch(`/${storeSlug}/api/points/claim`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'same-origin'
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || '領取集點卡失敗');
                }

                // 等待 2-3 秒
                await new Promise(resolve => setTimeout(resolve, 2500));

                // 隱藏 loading，顯示成功訊息
                loadingOverlay.style.display = 'none';
                claimSuccessMessage.style.display = 'block';

                // 等待 1.5 秒後淡出成功訊息
                await new Promise(resolve => setTimeout(resolve, 1500));
                claimSuccessMessage.style.animation = 'fadeOut 0.5s ease forwards';

                // 等待動畫完成後重新載入頁面
                setTimeout(() => {
                    window.location.reload();
                }, 500);

            } catch (error) {
                console.error('Error:', error);
                loadingOverlay.style.display = 'none';
                
                // 顯示錯誤訊息
                const errorMessage = error.message || '領取集點卡失敗，請稍後再試';
                alert(errorMessage);
                
                // 如果是網路錯誤，提示用戶檢查網路連接
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    console.error('Network error:', error);
                }
            }
        });
    }

    // 兌換獎勵功能
    document.querySelectorAll('.redeem-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const rewardId = this.dataset.rewardId;
            const storeSlug = getStoreSlug();
            
            try {
                loadingOverlay.style.display = 'flex';
                
                const response = await fetch(`/${storeSlug}/api/points/redeem`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ rewardId })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // 更新點數顯示
                    if (pointsValue) {
                        pointsValue.textContent = formatPoints(Number(data.remainingPoints));
                    }

                    // 更新優惠券數量
                    if (couponsValue) {
                        couponsValue.textContent = data.couponCount;
                    }

                    // 顯示成功訊息
                    loadingOverlay.style.display = 'none';
                    redeemSuccessMessage.style.display = 'block';
                    
                    // 2秒後隱藏成功訊息
                    setTimeout(() => {
                        redeemSuccessMessage.style.display = 'none';
                    }, 2000);

                    // 強制重設 dataset.loaded 並立即載入最新優惠券數量與列表
                    if (couponsTab) {
                        couponsTab.dataset.loaded = '';
                    }
                    await loadCoupons();
                } else {
                    throw new Error(data.error || '兌換失敗');
                }
            } catch (error) {
                loadingOverlay.style.display = 'none';
                alert(error.message);
            }
        });
    });

    // 頁面載入時格式化點數顯示
    if (pointsValue) {
        const raw = pointsValue.textContent;
        pointsValue.textContent = formatPoints(Number(raw));
    }

    // 顯示確認對話框
    function showConfirmDialog(couponId) {
        currentCouponId = couponId;
        confirmDialog.classList.add('show');
        confirmDialogOverlay.classList.add('show');
    }

    // 隱藏確認對話框
    function hideConfirmDialog() {
        confirmDialog.classList.remove('show');
        confirmDialogOverlay.classList.remove('show');
        currentCouponId = null;
    }

    // 確認對話框事件監聽
    confirmCancelBtn.addEventListener('click', hideConfirmDialog);
    confirmDialogOverlay.addEventListener('click', hideConfirmDialog);

    // 確認使用優惠券
    confirmUseBtn.addEventListener('click', async () => {
        if (!currentCouponId) return;
        try {
            loadingOverlay.style.display = 'flex';
            const storeSlug = getStoreSlug();
            const response = await fetch(`/${storeSlug}/api/coupons/use`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ couponId: currentCouponId })
            });
            const data = await response.json();
            if (data.success) {
                // 更新優惠券數量顯示
                if (couponsValue) {
                    couponsValue.textContent = data.remainingCoupons;
                }
                // 重新載入優惠券列表並同步更新數量
                await loadCoupons();
                // 顯示成功訊息
                const redeemSuccessMessage = document.getElementById('redeemSuccessMessage');
                if (redeemSuccessMessage) {
                    redeemSuccessMessage.style.display = 'block';
                    setTimeout(() => {
                        redeemSuccessMessage.style.display = 'none';
                    }, 2000);
                }
            } else {
                throw new Error(data.message || '使用優惠券失敗');
            }
        } catch (error) {
            console.error('使用優惠券時發生錯誤:', error);
            alert(error.message || '使用優惠券時發生錯誤，請稍後再試');
        } finally {
            loadingOverlay.style.display = 'none';
            hideConfirmDialog();
        }
    });
});

function formatPoints(num) {
    if (num < 1000) {
        return num.toString();
    }

    const units = [
        { value: 1_000_000_000_000, symbol: 'T' },
        { value: 1_000_000_000, symbol: 'B' },
        { value: 1_000_000, symbol: 'M' },  
        { value: 1_000, symbol: 'K' }  
    ];

    for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        if (num >= unit.value) {
            const dividedNum = num / unit.value;

            if (dividedNum < 10) {
                const floorVal = Math.floor(dividedNum * 10) / 10;
                if (floorVal % 1 === 0) {
                    return floorVal.toString() + unit.symbol;
                } else {
                    return floorVal.toFixed(1) + unit.symbol; 
                }
            } else {
                return Math.floor(dividedNum).toString() + unit.symbol;
            }
        }
    }
    return num.toString(); 
}

// 使用優惠券
async function useCoupon(couponId) {
    try {
        // 從 URL 中獲取 storeSlug
        const storeSlug = window.location.pathname.split('/')[1];
        
        const response = await fetch(`/${storeSlug}/api/coupons/use`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ couponId })
        });

        const data = await response.json();
        
        if (data.success) {
            // 更新優惠券數量
            const couponsValue = document.querySelector('.coupons-value');
            if (couponsValue) {
                couponsValue.textContent = data.remainingCoupons;
            }
            
            // 重新載入優惠券列表
            await loadCoupons();
            
            // 顯示成功訊息
            showSuccessMessage('使用優惠券成功');
        } else {
            showError(data.message || '使用優惠券失敗');
        }
    } catch (error) {
        console.error('Error using coupon:', error);
        showError('使用優惠券失敗，請稍後再試');
    }
}
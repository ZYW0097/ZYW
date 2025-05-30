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
            
            if (!storeSlug) {
                throw new Error('無法獲取商店資訊');
            }
            
            const response = await fetch(`/${storeSlug}/api/points/coupons`);
            const data = await response.json();
            
            if (response.ok && data.success) {
                couponsTab.dataset.loaded = 'true';
                
                // 移除載入中提示
                couponsContainer.innerHTML = '';
                
                if (data.coupons && data.coupons.length > 0) {
                    // 顯示優惠券列表
                    data.coupons.forEach(coupon => {
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
                            alert('優惠券使用功能即將推出！');
                        });
                    });
                } else {
                    // 顯示無優惠券訊息
                    emptyMessage.style.display = 'block';
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

                    if (couponsValue) {
                        couponsValue.textContent = data.couponCount;
                    }

                    // 重置優惠券已載入的狀態，以便下次進入重新載入
                    if (couponsTab) {
                        couponsTab.dataset.loaded = '';
                    }

                    // 顯示成功訊息
                    loadingOverlay.style.display = 'none';
                    redeemSuccessMessage.style.display = 'block';
                    
                    // 2秒後隱藏成功訊息並重新載入頁面以顯示新獲得的優惠券
                    setTimeout(() => {
                        redeemSuccessMessage.style.display = 'none';
                        window.location.reload();
                    }, 2000);
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
});

function formatPoints(num) {
    if (num >= 1_000_000_000_000) return (num / 1_000_000_000_000).toFixed(1) + 'T'; 
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'; 
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'; 
    return num.toString();
}
document.addEventListener('DOMContentLoaded', function() {
    const claimCardBtn = document.getElementById('claimCardBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const claimSuccessMessage = document.getElementById('claimSuccessMessage');
    const redeemSuccessMessage = document.getElementById('redeemSuccessMessage');
    const pointsValue = document.querySelector('.points-value');
    const couponsValue = document.querySelector('.coupons-value');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 從 URL 獲取 storeSlug
    const pathParts = window.location.pathname.split('/');
    const storeSlug = pathParts[1]; // 假設 URL 格式為 /storeSlug/card

    // 標籤切換功能
    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 移除所有標籤的活動狀態
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // 添加當前標籤的活動狀態
                this.classList.add('active');
                const tabId = this.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }
    
    // 載入優惠券名稱
    function loadCouponNames() {
        const couponCards = document.querySelectorAll('.coupon-card');
        if (couponCards.length > 0) {
            couponCards.forEach(couponCard => {
                const couponId = couponCard.getAttribute('data-coupon-id');
                const couponNameElement = document.getElementById(`coupon-name-${couponId}`);
                
                if (couponNameElement && couponNameElement.textContent === '載入中...') {
                    // 發送請求獲取優惠券詳情
                    fetch(`/${storeSlug}/api/points/reward/${couponId}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.reward) {
                            couponNameElement.textContent = data.reward.name;
                        } else {
                            couponNameElement.textContent = '未知優惠券';
                        }
                    })
                    .catch(error => {
                        console.error('Error loading coupon name:', error);
                        couponNameElement.textContent = '未知優惠券';
                    });
                }
            });
        }
    }
    
    // 如果存在優惠券，則載入優惠券名稱
    if (document.querySelector('.coupon-card')) {
        loadCouponNames();
    }
    
    // 使用優惠券
    const useCouponButtons = document.querySelectorAll('.use-coupon-btn');
    if (useCouponButtons.length > 0) {
        useCouponButtons.forEach(button => {
            button.addEventListener('click', function() {
                const couponId = this.getAttribute('data-coupon-id');
                alert(`此功能尚未實現。優惠券ID: ${couponId}`);
                // 這裡可以添加使用優惠券的邏輯
            });
        });
    }

    // 領取集點卡功能
    if (claimCardBtn) {
        claimCardBtn.addEventListener('click', async function() {
            try {
                // 顯示 loading
                loadingOverlay.style.display = 'flex';
                
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
                        pointsValue.textContent = data.remainingPoints;
                    }

                    if (couponsValue) {
                        couponsValue.textContent = data.couponCount;
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
}); 
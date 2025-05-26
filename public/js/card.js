document.addEventListener('DOMContentLoaded', function() {
    const claimCardBtn = document.getElementById('claimCardBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const claimSuccessMessage = document.getElementById('claimSuccessMessage');
    const redeemSuccessMessage = document.getElementById('redeemSuccessMessage');

    if (claimCardBtn) {
        claimCardBtn.addEventListener('click', async function() {
            try {
                // 顯示 loading
                loadingOverlay.style.display = 'flex';
                
                // 從 URL 獲取 storeSlug
                const pathParts = window.location.pathname.split('/');
                const storeSlug = pathParts[1]; // 假設 URL 格式為 /storeSlug/card
                
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
            const pathParts = window.location.pathname.split('/');
            const storeSlug = pathParts[1];
            
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
                    // 顯示兌換成功訊息
                    loadingOverlay.style.display = 'none';
                    redeemSuccessMessage.style.display = 'block';
                    
                    // 等待 2 秒後重新載入頁面
                    setTimeout(() => {
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
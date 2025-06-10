document.addEventListener('DOMContentLoaded', function() {
    let countdownTime = 60; // 60 秒倒數
    let isActionTaken = false; // 防止重複操作
    
    const countdownElement = document.getElementById('countdown');
    const actionButtons = document.getElementById('actionButtons');
    const resultMessage = document.getElementById('resultMessage');
    const resultIcon = document.getElementById('resultIcon');
    const resultText = document.getElementById('resultText');
    const cancelBtn = document.getElementById('cancelBtn');
    const keepBtn = document.getElementById('keepBtn');
    const homeBtn = document.getElementById('homeBtn');
    
    // 倒數計時器
    const countdownTimer = setInterval(() => {
        countdownTime--;
        countdownElement.textContent = countdownTime;
        
        if (countdownTime <= 0) {
            clearInterval(countdownTimer);
            if (!isActionTaken) {
                // 時間到，自動保留
                handleKeepBooking(true); // true 表示自動保留
            }
        }
    }, 1000);
    
    // 取消訂位按鈕
    cancelBtn.addEventListener('click', async () => {
        if (isActionTaken) return;
        
        if (!confirm('確定要取消此訂位嗎？此操作無法恢復。')) {
            return;
        }
        
        isActionTaken = true;
        clearInterval(countdownTimer);
        
        cancelBtn.disabled = true;
        cancelBtn.textContent = '處理中...';
        
        try {
            const response = await fetch(`/${storeSlug}/api/booking/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bookingId })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showResult('✗', '已幫您取消訂位', '#dc3545');
            } else {
                throw new Error(result.error || '取消失敗');
            }
        } catch (error) {
            console.error('取消訂位失敗:', error);
            alert('取消訂位失敗，請稍後再試');
            isActionTaken = false;
            cancelBtn.disabled = false;
            cancelBtn.textContent = '取消訂位';
        }
    });
    
    // 保留訂位按鈕
    keepBtn.addEventListener('click', () => {
        if (isActionTaken) return;
        handleKeepBooking(false); // false 表示手動保留
    });
    
    // 處理保留訂位
    function handleKeepBooking(isAuto = false) {
        isActionTaken = true;
        clearInterval(countdownTimer);
        
        const message = isAuto ? '時間已到，已為您保留訂位' : '已為您保留訂位';
        showResult('✓', message, '#28a745');
    }
    
    // 顯示結果
    function showResult(icon, text, color) {
        actionButtons.style.display = 'none';
        resultMessage.style.display = 'block';
        resultIcon.textContent = icon;
        resultIcon.style.color = color;
        resultText.textContent = text;
        
        // 隱藏倒數時間
        document.querySelector('.countdown-container').style.display = 'none';
    }
    
    // 返回首頁按鈕
    homeBtn.addEventListener('click', () => {
        window.location.href = `/${storeSlug}`;
    });
}); 
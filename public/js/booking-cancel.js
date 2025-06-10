document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const bookingIdForm = document.getElementById('bookingIdForm');
    const customerInfoForm = document.getElementById('customerInfoForm');
    const allCurrentBookings = document.getElementById('allCurrentBookings');
    const generalResults = document.getElementById('generalBookingResults');
    const cancelModal = document.getElementById('cancelModal');
    const modalBookingDetails = document.getElementById('modalBookingDetails');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    let currentBookingToCancel = null;

    // 頁面載入時自動獲取所有當前訂位
    loadAllCurrentBookings();

    // 標籤切換功能
    const tabBtns = document.querySelectorAll('.tab-btn');
    const searchForms = document.querySelectorAll('.search-form');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            
            // 更新標籤狀態
            tabBtns.forEach(tab => tab.classList.remove('active'));
            btn.classList.add('active');
            
            // 更新表單顯示
            searchForms.forEach(form => form.classList.remove('active'));
            document.getElementById(type === 'bookingId' ? 'bookingIdForm' : 'customerInfoForm').classList.add('active');
        });
    });

    // 載入所有當前餐廳訂位
    async function loadAllCurrentBookings() {
        // 顯示載入狀態
        allCurrentBookings.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <span>載入中...</span>
            </div>
        `;

        try {
            const response = await fetch(`/${storeSlug}/api/booking/all-current`);
            const result = await response.json();

            if (result.success) {
                setTimeout(() => {
                    displayBookings(result.results, allCurrentBookings, false);
                }, 300); // 短暫延遲讓用戶看到載入狀態
            } else {
                throw new Error(result.error || '載入失敗');
            }
        } catch (error) {
            console.error('載入失敗:', error);
            showNoResults(allCurrentBookings, '載入訂位資訊失敗，請重新整理頁面');
        }
    }

    // 訂位編號搜尋
    bookingIdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(bookingIdForm);
        const bookingId = formData.get('bookingId');

        if (!bookingId) {
            alert('請輸入訂位編號');
            return;
        }

        await searchByBookingId(bookingId);
    });

    // 訂位資訊搜尋
    customerInfoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(customerInfoForm);
        const name = formData.get('name');
        const phone = formData.get('phone');

        if (!name || !phone) {
            alert('請輸入姓名和電話');
            return;
        }

        await searchByCustomerInfo(name, phone);
    });



    // 依訂位編號搜尋
    async function searchByBookingId(bookingId) {
        const submitBtn = bookingIdForm.querySelector('.search-btn');
        setButtonLoading(submitBtn, true);
        
        // 顯示載入狀態
        generalResults.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <span>搜尋中...</span>
            </div>
        `;

        try {
            const response = await fetch(`/${storeSlug}/api/booking/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchType: 'bookingId',
                    searchValue: bookingId.trim().toUpperCase()
                })
            });
            const result = await response.json();

            if (result.success) {
                displayBookings(result.results, generalResults, true);
            } else {
                throw new Error(result.error || '搜尋失敗');
            }
        } catch (error) {
            console.error('搜尋失敗:', error);
            showNoResults(generalResults, '搜尋失敗，請稍後再試');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    }

    // 依訂位資訊搜尋
    async function searchByCustomerInfo(name, phone) {
        const submitBtn = customerInfoForm.querySelector('.search-btn');
        setButtonLoading(submitBtn, true);
        
        // 顯示載入狀態
        generalResults.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <span>搜尋中...</span>
            </div>
        `;

        try {
            const response = await fetch(`/${storeSlug}/api/booking/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchType: 'customerInfo',
                    searchValue: `${name.trim()}, ${phone.trim()}`
                })
            });
            const result = await response.json();

            if (result.success) {
                displayBookings(result.results, generalResults, true);
            } else {
                throw new Error(result.error || '搜尋失敗');
            }
        } catch (error) {
            console.error('搜尋失敗:', error);
            showNoResults(generalResults, '搜尋失敗，請稍後再試');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    }

    // 顯示訂位結果
    function displayBookings(bookings, container, showRestaurant = false) {
        if (!bookings || bookings.length === 0) {
            showNoResults(container, '沒有找到符合條件的訂位');
            return;
        }

        const hasMultiple = bookings.length > 3;
        const isMobile = window.innerWidth <= 768;
        let html = '';

        if (hasMultiple) {
            const defaultCollapsed = isMobile; // 行動版預設收合，桌面版預設展開
            html += `
                <div class="results-header">
                    <span class="results-count">找到 ${bookings.length} 筆訂位</span>
                    <button class="toggle-btn" onclick="toggleResults(this)">${defaultCollapsed ? '展開' : '收合'}</button>
                </div>
            `;
            html += `<div class="results-list ${defaultCollapsed ? 'collapsed' : ''}">`;
        } else {
            html += `<div class="results-list">`;
        }

        bookings.forEach(booking => {
            html += createBookingCard(booking, showRestaurant);
        });

        html += '</div>';
        container.innerHTML = html;

        // 綁定點擊事件
        container.querySelectorAll('.booking-card').forEach(card => {
            card.addEventListener('click', () => {
                const bookingId = card.dataset.bookingId;
                const targetStoreSlug = card.dataset.storeSlug;
                const booking = bookings.find(b => 
                    (b.customBookingId === bookingId) || 
                    (b.bookingId === bookingId) ||
                    (b._id && b._id.toString() === bookingId)
                );
                if (booking) {
                    showCancelModal(booking, targetStoreSlug);
                }
            });
        });
    }

    // 格式化日期
    function formatDate(dateString) {
        if (!dateString) return '未知日期';
        
        // 處理ISO日期格式 (2025-06-18T00:00:00.000Z)
        if (dateString.includes('T')) {
            dateString = dateString.split('T')[0];
        }
        
        // 如果已經是 YYYY-MM-DD 格式，轉換為更友好的格式
        const date = new Date(dateString + 'T00:00:00');
        if (isNaN(date.getTime())) return dateString; // 如果無法解析，返回原始字符串
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}/${month}/${day}`;
    }

    // 創建訂位卡片
    function createBookingCard(booking, showRestaurant) {
        const bookingId = booking.customBookingId || booking.bookingId || 'N/A';
        const formattedDate = formatDate(booking.date);
        
        return `
            <div class="booking-card" data-booking-id="${bookingId}" data-store-slug="${booking.storeSlug || storeSlug}">
                <div class="booking-header">
                    <span class="booking-id">${bookingId}</span>
                    ${showRestaurant ? `<span class="restaurant-name">${booking.clientname || '未知餐廳'}</span>` : ''}
                </div>
                <div class="booking-info">
                    <div class="info-item">
                        <div class="info-label">日期</div>
                        <div class="info-value">${formattedDate}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">時段</div>
                        <div class="info-value">${booking.time || '未知時間'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">人數</div>
                        <div class="info-value">${booking.adults || 0}大${booking.children || 0}小</div>
                    </div>
                </div>
            </div>
        `;
    }

    // 顯示無結果
    function showNoResults(container, message) {
        container.innerHTML = `<div class="no-results">${message}</div>`;
    }

    // 設定按鈕載入狀態
    function setButtonLoading(btn, loading) {
        if (loading) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading-spinner"></span>搜尋中...';
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.originalText || '搜尋';
        }
    }

    // 展開/收合結果
    window.toggleResults = function(btn) {
        const resultsList = btn.closest('.booking-results').querySelector('.results-list');
        const isCollapsed = resultsList.classList.contains('collapsed');
        
        if (isCollapsed) {
            resultsList.classList.remove('collapsed');
            btn.textContent = '收合';
        } else {
            resultsList.classList.add('collapsed');
            btn.textContent = '展開';
        }
    };

    // 顯示取消確認彈窗
    function showCancelModal(booking, targetStoreSlug) {
        currentBookingToCancel = { ...booking, targetStoreSlug };
        const bookingId = booking.customBookingId || booking.bookingId || 'N/A';
        const formattedDate = formatDate(booking.date);
        
        modalBookingDetails.innerHTML = `
            <div class="info-item">
                <strong>訂位編號：</strong>${bookingId}
            </div>
            ${booking.clientname ? `<div class="info-item"><strong>餐廳：</strong>${booking.clientname}</div>` : ''}
            <div class="info-item">
                <strong>日期時間：</strong>${formattedDate} ${booking.time || '未知時間'}
            </div>
            <div class="info-item">
                <strong>人數：</strong>${booking.adults || 0}大${booking.children || 0}小
            </div>
            <div class="info-item">
                <strong>聯絡人：</strong>${booking.name || '未提供'} ${booking.gender || ''}
            </div>
        `;
        
        cancelModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    // 隱藏取消確認彈窗
    function hideCancelModal() {
        cancelModal.classList.remove('show');
        document.body.style.overflow = '';
        currentBookingToCancel = null;
    }

    // 確認取消訂位
    confirmCancelBtn.addEventListener('click', async () => {
        if (!currentBookingToCancel) return;

        const originalText = confirmCancelBtn.textContent;
        confirmCancelBtn.disabled = true;
        confirmCancelBtn.innerHTML = '<span class="loading-spinner"></span>取消中...';

        try {
            const bookingId = currentBookingToCancel.customBookingId || currentBookingToCancel.bookingId;
            const response = await fetch(`/${storeSlug}/api/booking/cancel-by-id`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: bookingId,
                    targetStoreSlug: currentBookingToCancel.targetStoreSlug
                })
            });

            const result = await response.json();

            if (result.success) {
                alert('訂位已成功取消！');
                hideCancelModal();
                
                // 移除已取消的訂位卡片
                const cardToRemove = document.querySelector(`[data-booking-id="${currentBookingToCancel.customBookingId}"]`);
                if (cardToRemove) {
                    cardToRemove.remove();
                }
            } else {
                throw new Error(result.error || '取消失敗');
            }
        } catch (error) {
            console.error('取消失敗:', error);
            alert('取消失敗：' + error.message);
        } finally {
            confirmCancelBtn.disabled = false;
            confirmCancelBtn.textContent = originalText;
        }
    });

    // 關閉彈窗
    modalCloseBtn.addEventListener('click', hideCancelModal);
    cancelModal.querySelector('.modal-overlay').addEventListener('click', hideCancelModal);

    // 儲存按鈕原始文字
    document.querySelectorAll('.search-btn').forEach(btn => {
        btn.dataset.originalText = btn.textContent;
    });
}); 
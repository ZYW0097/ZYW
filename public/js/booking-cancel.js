document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const currentBookingForm = document.getElementById('currentBookingForm');
    const bookingIdForm = document.getElementById('bookingIdForm');
    const customerInfoForm = document.getElementById('customerInfoForm');
    const currentResults = document.getElementById('currentBookingResults');
    const generalResults = document.getElementById('generalBookingResults');
    const cancelModal = document.getElementById('cancelModal');
    const modalBookingDetails = document.getElementById('modalBookingDetails');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    let currentBookingToCancel = null;

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

    // 當前餐廳訂位搜尋
    currentBookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(currentBookingForm);
        const name = formData.get('name');
        const phone = formData.get('phone');

        if (!name || !phone) {
            alert('請輸入姓名和電話');
            return;
        }

        await searchCurrentBookings(name, phone);
    });

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

    // 搜尋當前餐廳的訂位
    async function searchCurrentBookings(name, phone) {
        const submitBtn = currentBookingForm.querySelector('.search-btn');
        setButtonLoading(submitBtn, true);

        try {
            const response = await fetch(`/${storeSlug}/api/booking/current?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`);
            const result = await response.json();

            if (result.success) {
                displayBookings(result.results, currentResults, false);
            } else {
                throw new Error(result.error || '搜尋失敗');
            }
        } catch (error) {
            console.error('搜尋失敗:', error);
            showNoResults(currentResults, '搜尋失敗，請稍後再試');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    }

    // 依訂位編號搜尋
    async function searchByBookingId(bookingId) {
        const submitBtn = bookingIdForm.querySelector('.search-btn');
        setButtonLoading(submitBtn, true);

        try {
            const response = await fetch(`/${storeSlug}/api/booking/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchType: 'bookingId',
                    searchValue: bookingId
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

        try {
            const response = await fetch(`/${storeSlug}/api/booking/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchType: 'customerInfo',
                    searchValue: `${name}, ${phone}`
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
        let html = '';

        if (hasMultiple) {
            html += `
                <div class="results-header">
                    <span class="results-count">找到 ${bookings.length} 筆訂位</span>
                    <button class="toggle-btn" onclick="toggleResults(this)">收合</button>
                </div>
            `;
        }

        html += `<div class="results-list ${hasMultiple ? 'collapsed' : ''}">`;

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
                const booking = bookings.find(b => b.customBookingId === bookingId);
                if (booking) {
                    showCancelModal(booking, targetStoreSlug);
                }
            });
        });
    }

    // 創建訂位卡片
    function createBookingCard(booking, showRestaurant) {
        return `
            <div class="booking-card" data-booking-id="${booking.customBookingId}" data-store-slug="${booking.storeSlug || storeSlug}">
                <div class="booking-header">
                    <span class="booking-id">${booking.customBookingId}</span>
                    ${showRestaurant ? `<span class="restaurant-name">${booking.clientname}</span>` : ''}
                </div>
                <div class="booking-info">
                    <div class="info-item">
                        <div class="info-label">日期</div>
                        <div class="info-value">${booking.date}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">時段</div>
                        <div class="info-value">${booking.time}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">人數</div>
                        <div class="info-value">${booking.adults}大${booking.children}小</div>
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
        
        modalBookingDetails.innerHTML = `
            <div class="info-item">
                <strong>訂位編號：</strong>${booking.customBookingId}
            </div>
            ${booking.clientname ? `<div class="info-item"><strong>餐廳：</strong>${booking.clientname}</div>` : ''}
            <div class="info-item">
                <strong>日期時間：</strong>${booking.date} ${booking.time}
            </div>
            <div class="info-item">
                <strong>人數：</strong>${booking.adults}大${booking.children}小
            </div>
            <div class="info-item">
                <strong>聯絡人：</strong>${booking.name} ${booking.gender}
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
            const response = await fetch(`/${storeSlug}/api/booking/cancel-by-id`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: currentBookingToCancel.customBookingId,
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
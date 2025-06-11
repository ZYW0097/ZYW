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
        console.log('開始載入餐廳訂位:', storeSlug);
        
        // 顯示載入狀態
        allCurrentBookings.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <span>載入中...</span>
            </div>
        `;

        try {
            const response = await fetch(`/${storeSlug}/api/booking/all-current`);
            console.log('API回應狀態:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('API回應內容:', result);

            if (result.success) {
                console.log('找到訂位記錄:', result.results?.length || 0, '筆');
                setTimeout(() => {
                    displayBookings(result.results, allCurrentBookings, false);
                    // 如果有結果，為左側容器添加has-results class
                    if (result.results && result.results.length > 0) {
                        allCurrentBookings.closest('.booking-form-container').classList.add('has-results');
                    }
                }, 300); // 短暫延遲讓用戶看到載入狀態
            } else {
                throw new Error(result.error || '載入失敗');
            }
        } catch (error) {
            console.error('載入失敗:', error);
            showNoResults(allCurrentBookings, `載入訂位資訊失敗：${error.message}<br><button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">重新載入</button>`);
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
        
        // 只清空結果區域，不顯示載入動畫
        generalResults.innerHTML = '';

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
                // 如果有結果，為右側容器添加has-results class
                if (result.results && result.results.length > 0) {
                    generalResults.closest('.booking-form-container').classList.add('has-results');
                } else {
                    generalResults.closest('.booking-form-container').classList.remove('has-results');
                }
            } else {
                throw new Error(result.error || '搜尋失敗');
            }
        } catch (error) {
            console.error('搜尋失敗:', error);
            showNoResults(generalResults, '搜尋失敗，請稍後再試');
            generalResults.closest('.booking-form-container').classList.remove('has-results');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    }

    // 依訂位資訊搜尋
    async function searchByCustomerInfo(name, phone) {
        const submitBtn = customerInfoForm.querySelector('.search-btn');
        setButtonLoading(submitBtn, true);
        
        // 只清空結果區域，不顯示載入動畫
        generalResults.innerHTML = '';

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
                // 過濾掉已經在左邊顯示的同餐廳訂位
                const currentStoreResults = result.results.filter(booking => 
                    booking.storeSlug === storeSlug
                );
                
                const otherStoreResults = result.results.filter(booking => 
                    booking.storeSlug !== storeSlug
                );
                
                // 檢查左邊是否有訂位顯示
                const leftSideHasBookings = allCurrentBookings.querySelector('.booking-card') !== null;
                
                let filteredResults = result.results;
                let filterMessage = '';
                
                if (leftSideHasBookings && currentStoreResults.length > 0) {
                    // 如果左邊有顯示且搜尋到同餐廳的訂位，只顯示其他餐廳的訂位
                    filteredResults = otherStoreResults;
                    filterMessage = `已過濾 ${currentStoreResults.length} 筆本餐廳的訂位（左側已顯示）`;
                }
                
                if (filteredResults.length === 0 && filterMessage) {
                    showNoResults(generalResults, filterMessage + '<br>沒有其他餐廳的訂位');
                    generalResults.closest('.booking-form-container').classList.remove('has-results');
                } else {
                    displayBookings(filteredResults, generalResults, true);
                    // 如果有結果，為右側容器添加has-results class
                    if (filteredResults.length > 0) {
                        generalResults.closest('.booking-form-container').classList.add('has-results');
                    } else {
                        generalResults.closest('.booking-form-container').classList.remove('has-results');
                    }
                    if (filterMessage) {
                        // 在結果上方顯示過濾信息
                        const filterInfo = document.createElement('div');
                        filterInfo.className = 'filter-info';
                        filterInfo.innerHTML = `<small style="color: #666; margin-bottom: 1rem; display: block;">${filterMessage}</small>`;
                        generalResults.insertBefore(filterInfo, generalResults.firstChild);
                    }
                }
            } else {
                throw new Error(result.error || '搜尋失敗');
            }
        } catch (error) {
            console.error('搜尋失敗:', error);
            showNoResults(generalResults, '搜尋失敗，請稍後再試');
            generalResults.closest('.booking-form-container').classList.remove('has-results');
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

        // 綁定點擊事件給卡片，但排除取消按鈕
        container.querySelectorAll('.booking-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // 如果點擊的是取消按鈕，不觸發卡片點擊事件
                if (e.target.classList.contains('cancel-btn') || e.target.closest('.cancel-btn')) {
                    return;
                }
                
                const bookingId = card.dataset.bookingId;
                const targetStoreSlug = card.dataset.storeSlug;
                const booking = bookings.find(b => b.customBookingId === bookingId);
                if (booking) {
                    showCancelModal(booking, targetStoreSlug);
                }
            });
        });
        
        // 綁定取消按鈕的點擊事件
        container.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止冒泡
                const card = btn.closest('.booking-card');
                const bookingId = card.dataset.bookingId;
                const targetStoreSlug = card.dataset.storeSlug;
                const booking = bookings.find(b => b.customBookingId === bookingId);
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

    // 創建訂位卡片 - 修改取消按鈕
    function createBookingCard(booking, showRestaurant) {
        const bookingId = booking.customBookingId;
        const formattedDate = formatDate(booking.date);
        
        return `
            <div class="booking-card" data-booking-id="${bookingId}" data-store-slug="${booking.storeSlug || storeSlug}">
                <div class="booking-header">
                    <span class="booking-id">${bookingId}</span>
                    ${showRestaurant ? `<span class="restaurant-name">${booking.clientname || '未知餐廳'}</span>` : ''}
                </div>
                <div class="booking-info">
                    <div class="info-item">
                        <div class="info-label">姓名</div>
                        <div class="info-value">${booking.name}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">電話</div>
                        <div class="info-value">${booking.phone}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">日期</div>
                        <div class="info-value">${formattedDate}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">時段</div>
                        <div class="info-value">${booking.time}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">人數</div>
                        <div class="info-value">${booking.guests || (booking.adults || 0) + (booking.children || 0)}人</div>
                    </div>
                </div>
                <button class="cancel-btn" type="button">
                    取消訂位
                </button>
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
            const originalText = btn.textContent;
            btn.dataset.originalText = originalText;
            btn.innerHTML = '<span class="loading-spinner"></span>搜尋中...';
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.originalText || '搜尋訂位';
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

    // 確認取消訂位 - 修改為後端處理
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
                    targetStoreSlug: currentBookingToCancel.targetStoreSlug || storeSlug
                })
            });

            const result = await response.json();

            if (result.success) {
                alert('訂位已成功取消！');
                hideCancelModal();
                
                // 重新載入訂位列表
                loadAllCurrentBookings();
                
                // 清空搜尋結果
                generalResults.innerHTML = `<div class="no-results">請選擇搜尋方式並輸入相關資訊</div>`;
                generalResults.closest('.booking-form-container').classList.remove('has-results');
                
                // 重置表單
                bookingIdForm.reset();
                customerInfoForm.reset();
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
    
    // 確保漢堡選單正常工作 - 移除重複初始化，讓navbar-mobile.js處理
    // navbar-mobile.js會自動處理漢堡選單，這裡不需要重複綁定
}); 
document.addEventListener('DOMContentLoaded', function() {
    // 從 sessionStorage 獲取所有選擇的資訊
    const bookingData = JSON.parse(sessionStorage.getItem('bookingData') || '{}');
    const bookingSettings = JSON.parse(sessionStorage.getItem('bookingSettings') || '{}');
    const storeSlug = window.storeSlug || (window.location.pathname.split('/')[1]);

    if (!bookingData.date || !bookingData.time) {
        window.location.href = `/${storeSlug}/booking/step1`;
        return;
    }

    // 根據商家設定處理特殊選項
    handleSpecialOptions(bookingSettings);

    // 顯示選擇的日期和時間 (合併顯示)
    const dateTimeText = `${bookingData.date} ${bookingData.time}`;
    document.getElementById('displayDate').textContent = dateTimeText;

    // 顯示選擇的人數 (簡潔格式 XY小)
    const adults = bookingData.adults || 0;
    const children = bookingData.children || 0;
    const peopleText = `${adults}大${children}小`;
    document.getElementById('displayPeople').textContent = peopleText;

    // 同意條款與提交按鈕連動
    const agreeCheckbox = document.getElementById('agreeTerms');
    const submitButton = document.getElementById('submitBtn');
    agreeCheckbox.addEventListener('change', function() {
        submitButton.disabled = !this.checked;
    });

    // 表單提交處理
    const form = document.getElementById('bookingForm');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        submitButton.textContent = '正在提交訂位';
        submitButton.disabled = true;

        const formData = new FormData(form);
        const formEntries = Object.fromEntries(formData.entries());
        
        // 修正欄位名稱映射
        const data = {
            ...bookingData,
            name: formEntries.name,
            gender: formEntries.gender,
            phone: formEntries.phone,
            email: formEntries.email,
            vegetarian: formEntries.vegetarian,
            vegetarianOption: formEntries.vegetarianOption || '否', // 新增素食選項
            special: formEntries.specialNeeds || '', // 映射 specialNeeds 到 special
            note: formEntries.notes || '', // 映射 notes 到 note
            guests: (bookingData.adults || 0) + (bookingData.children || 0), // 計算總人數
            storeSlug
        };

        try {
            const response = await fetch(`/${storeSlug}/api/booking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                sessionStorage.removeItem('bookingData');
                window.location.href = `/${storeSlug}/booking/success?bookingId=${result.bookingId}`;
            } else {
                const result = await response.json();
                throw new Error(result.error || '預訂失敗');
            }
        } catch (error) {
            alert(error.message || '預訂失敗，請稍後再試');
            submitButton.textContent = '確認訂位';
            submitButton.disabled = false;
        }
    });
});

// 根據商家設定處理特殊選項
function handleSpecialOptions(bookingSettings) {
    const vegetarianGroup = document.getElementById('vegetarianGroup');
    const specialNeedsRow = document.getElementById('specialNeedsRow');
    
    // 處理素食選項
    if (!bookingSettings.enableVegetarian) {
        // 如果商家未開啟素食選項，隱藏選項並顯示未開放提示
        vegetarianGroup.innerHTML = `
            <label for="vegetarianOption">素食選項</label>
            <div class="disabled-option">
                <span class="unavailable-text">商家未開放素食選項</span>
                <input type="hidden" name="vegetarianOption" value="否">
            </div>
        `;
        vegetarianGroup.classList.add('disabled-group');
    }
    
    // 處理特殊需求選項
    if (!bookingSettings.enableSpecialRequests) {
        // 如果商家未開啟特殊需求，隱藏選項並顯示未開放提示
        specialNeedsRow.innerHTML = `
            <div class="form-group full-width">
                <label for="specialNeeds">特殊需求</label>
                <div class="disabled-option">
                    <span class="unavailable-text">商家未開放特殊需求填寫</span>
                    <input type="hidden" name="specialNeeds" value="無">
                </div>
            </div>
        `;
        specialNeedsRow.classList.add('disabled-group');
    }
    
    console.log('特殊選項設定完成:', {
        vegetarian: bookingSettings.enableVegetarian ? '已開啟' : '未開啟',
        specialRequests: bookingSettings.enableSpecialRequests ? '已開啟' : '未開啟'
    });
}
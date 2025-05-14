document.addEventListener('DOMContentLoaded', function() {
    // 從 sessionStorage 獲取所有選擇的資訊
    const bookingData = JSON.parse(sessionStorage.getItem('bookingData') || '{}');
    const storeSlug = window.storeSlug || (window.location.pathname.split('/')[1]);

    if (!bookingData.date || !bookingData.time) {
        window.location.href = `/${storeSlug}/booking/step1`;
        return;
    }

    // 顯示選擇的日期和時間
    document.getElementById('displayDate').textContent = bookingData.date;
    document.getElementById('displayTime').textContent = bookingData.time;

    // 顯示選擇的人數
    let peopleText = [];
    peopleText.push(`${bookingData.adults}位大人`);
    if (bookingData.children && bookingData.children !== 0) {
        peopleText.push(`${bookingData.children}位小孩`);
    }
    document.getElementById('displayPeople').textContent = peopleText.join('、');

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
        // 合併第一步 bookingData
        const data = {
            ...bookingData,
            ...Object.fromEntries(formData.entries()),
            storeSlug
        };

        try {
            const response = await fetch('/api/booking', {
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
// 獲取DOM元素
const bookingForm = document.querySelector('#booking-form');
const backButton = document.querySelector('.back-button');
const submitButton = document.querySelector('.submit-button');
const agreementCheckbox = document.querySelector('#agreement');

// 從 sessionStorage 獲取第一步的數據
const bookingData = JSON.parse(sessionStorage.getItem('bookingData') || '{}');

// 更新訂位摘要
function updateSummary() {
    document.querySelector('#summary-date').textContent = bookingData.date;
    document.querySelector('#summary-time').textContent = bookingData.time;
    document.querySelector('#summary-adults').textContent = bookingData.adults;
    document.querySelector('#summary-children').textContent = bookingData.children;
}

// 檢查表單是否完整
function checkForm() {
    const name = document.querySelector('#name').value;
    const phone = document.querySelector('#phone').value;
    const email = document.querySelector('#email').value;
    const gender = document.querySelector('input[name="gender"]:checked');
    
    submitButton.disabled = !(name && phone && email && gender && agreementCheckbox.checked);
}

// 格式化電話號碼
function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 0) {
        if (value.length <= 4) {
            value = value;
        } else if (value.length <= 8) {
            value = value.slice(0, 4) + '-' + value.slice(4);
        } else {
            value = value.slice(0, 4) + '-' + value.slice(4, 8) + '-' + value.slice(8, 10);
        }
    }
    input.value = value;
}

// 事件監聽器
document.querySelector('#name').addEventListener('input', checkForm);
document.querySelector('#phone').addEventListener('input', (e) => {
    formatPhoneNumber(e.target);
    checkForm();
});
document.querySelector('#email').addEventListener('input', checkForm);
document.querySelectorAll('input[name="gender"]').forEach(radio => {
    radio.addEventListener('change', checkForm);
});
agreementCheckbox.addEventListener('change', checkForm);

backButton.addEventListener('click', () => {
    window.location.href = '/booking/step1';
});

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!agreementCheckbox.checked) {
        alert('請同意用餐規則');
        return;
    }
    
    // 收集表單數據
    const formData = {
        ...bookingData,
        name: document.querySelector('#name').value,
        gender: document.querySelector('input[name="gender"]:checked').value,
        phone: document.querySelector('#phone').value,
        email: document.querySelector('#email').value,
        isVegetarian: document.querySelector('#vegetarian').checked,
        specialNeeds: Array.from(document.querySelectorAll('input[name="special-needs"]:checked'))
            .map(checkbox => checkbox.value),
        notes: document.querySelector('#notes').value
    };
    
    try {
        // 發送訂位請求
        const response = await fetch('/api/booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('訂位失敗');
        }
        
        const result = await response.json();
        
        // 清空 sessionStorage
        sessionStorage.removeItem('bookingData');
        
        // 跳轉到成功頁面
        window.location.href = `/booking/success?bookingId=${result.bookingId}`;
        
    } catch (error) {
        alert('訂位失敗，請稍後再試');
        console.error('訂位錯誤:', error);
    }
});

// 初始化
updateSummary();
checkForm(); 
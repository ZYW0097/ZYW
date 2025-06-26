// 獲取DOM元素
const calendarHeader = document.querySelector('.calendar-header');
const daysContainer = document.querySelector('.days-container');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const monthDisplay = document.getElementById('calendar-title');
const timeButtons = document.querySelector('.time-buttons');
const adultsSelect = document.querySelector('#adults');
const childrenSelect = document.querySelector('#children');
const nextButton = document.querySelector('.next-button');

// 當前日期和選擇的日期
let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;
let customTimeSlots = []; // 存儲自訂時段
let isLoadingTimeSlots = false; // 載入狀態標記，防止重複載入
let bookingSettings = null; // 存儲商家的訂位設定

// 生成日曆
function generateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 更新月份顯示
    monthDisplay.textContent = `${year}年${month + 1}月`;
    
    // 清空日期容器
    daysContainer.innerHTML = '';
    
    // 獲取當月第一天和最後一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 獲取當月第一天是星期幾
    const firstDayOfWeek = firstDay.getDay();
    
    // 添加上個月的日期
    for (let i = 0; i < firstDayOfWeek; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day disabled';
        daysContainer.appendChild(dayElement);
    }
    
    // 添加當月的日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day';
        dayElement.textContent = day;
        
        // 檢查是否是過去的日期
        const currentDay = new Date(year, month, day);
        if (currentDay < new Date().setHours(0, 0, 0, 0)) {
            dayElement.classList.add('disabled');
        } else {
            dayElement.addEventListener('click', () => selectDate(day));
        }
        
        // 如果是選中的日期，添加選中樣式
        if (selectedDate && 
            selectedDate.getDate() === day && 
            selectedDate.getMonth() === month && 
            selectedDate.getFullYear() === year) {
            dayElement.classList.add('selected');
        }
        
        daysContainer.appendChild(dayElement);
    }
}

// 選擇日期
function selectDate(day) {
    selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    selectedTime = null; // 清空選中的時段，因為不同日期可能有不同的可用時段
    generateCalendar();
    updateTimeButtons(); // 載入新日期的時段
    checkNextButton();
}

// 載入自訂時段
async function loadCustomTimeSlots() {
    try {
        const response = await fetch(`/${storeSlug}/api/timeSlots`);
        const data = await response.json();
        
        if (data.timeSlots && data.timeSlots.length > 0) {
            customTimeSlots = data.timeSlots.map(slot => slot.time);
        } else {
            // 如果沒有自訂時段，使用預設時段
            customTimeSlots = ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
        }
        
        // 如果有選中的日期，更新時段按鈕
        if (selectedDate) {
            updateTimeButtons();
        }
    } catch (error) {
        console.error('Error loading time slots:', error);
        // 使用預設時段
        customTimeSlots = ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
    }
}

// 載入特定日期的時段容量資訊
async function loadTimeSlotsWithCapacity(date) {
    try {
        const dateStr = date.getFullYear() + '-' + 
                       String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(date.getDate()).padStart(2, '0');
        
        const response = await fetch(`/${storeSlug}/api/timeSlots/${dateStr}`);
        const data = await response.json();
        
        if (data.success && data.timeSlots) {
            return data.timeSlots;
        } else {
            console.warn('未能獲取時段容量資訊，使用基本時段');
            return customTimeSlots.map(time => ({
                time: time,
                maxBookings: 10,
                currentBookings: 0,
                isAvailable: true,
                remainingSlots: 10
            }));
        }
    } catch (error) {
        console.error('Error loading time slots capacity:', error);
        // 回退到基本時段
        return customTimeSlots.map(time => ({
            time: time,
            maxBookings: 10,
            currentBookings: 0,
            isAvailable: true,
            remainingSlots: 10
        }));
    }
}

// 更新時段按鈕
async function updateTimeButtons() {
    if (!selectedDate) return;
    
    // 防止重複載入
    if (isLoadingTimeSlots) {
        return;
    }
    
    isLoadingTimeSlots = true;
    
    // 顯示載入狀態
    timeButtons.innerHTML = '<div class="loading-message">載入時段中...</div>';
    
    // 檢查是否是今天
    const today = new Date();
    const isToday = selectedDate.getDate() === today.getDate() && 
                   selectedDate.getMonth() === today.getMonth() && 
                   selectedDate.getFullYear() === today.getFullYear();
    
    // 獲取當前時間（小時和分鐘）
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    try {
        // 載入特定日期的時段容量資訊
        const timeSlotsWithCapacity = await loadTimeSlotsWithCapacity(selectedDate);
        
        timeButtons.innerHTML = '';
        
        timeSlotsWithCapacity.forEach(slot => {
            const button = document.createElement('button');
            button.className = 'time-button';
            
            // 檢查時段是否已過期（只對今天有效）
            let isTimeExpired = false;
            if (isToday) {
                const [timeHour, timeMinute] = slot.time.split(':').map(Number);
                const timeInMinutes = timeHour * 60 + timeMinute;
                
                // 如果時段已經過了，禁用該時段
                if (timeInMinutes <= currentTimeInMinutes) {
                    isTimeExpired = true;
                }
            }
            
            // 檢查容量狀態
            const isFullyBooked = !slot.isAvailable;
            const isDisabled = isTimeExpired || isFullyBooked;
            
            // 設置按鈕文字和樣式
            if (isFullyBooked) {
                button.innerHTML = `
                    <span class="time">${slot.time}</span>
                    <span class="status full">已滿</span>
                `;
                button.classList.add('disabled', 'fully-booked');
            } else if (isTimeExpired) {
                button.innerHTML = `
                    <span class="time">${slot.time}</span>
                    <span class="status expired">已過期</span>
                `;
                button.classList.add('disabled', 'expired');
            } else {
                button.innerHTML = `
                    <span class="time">${slot.time}</span>
                    <span class="capacity">剩餘 ${slot.remainingSlots} 組</span>
                `;
                
                // 如果容量較少，添加警告樣式
                if (slot.remainingSlots <= 2) {
                    button.classList.add('low-capacity');
                }
            }
            
            // 如果當前選中的時間被禁用，清除選擇
            if (selectedTime === slot.time && isDisabled) {
                selectedTime = null;
            }
            
            if (!isDisabled) {
                // 只有未禁用的時段才能點擊
                button.addEventListener('click', () => {
                    selectedTime = slot.time;
                    updateSelectedTimeUI(); // 只更新UI，不重新載入時段
                    checkNextButton();
                });
            }
            
            // 如果是選中的時間且未被禁用，添加選中樣式
            if (selectedTime === slot.time && !isDisabled) {
                button.classList.add('selected');
            }
            
            timeButtons.appendChild(button);
        });
        
    } catch (error) {
        console.error('更新時段按鈕失敗:', error);
        timeButtons.innerHTML = '<div class="error-message">載入時段失敗，請重新選擇日期</div>';
    } finally {
        // 重置載入狀態
        isLoadingTimeSlots = false;
    }
}

// 只更新時段按鈕的選中狀態，不重新載入資料
function updateSelectedTimeUI() {
    const timeButtonElements = timeButtons.querySelectorAll('.time-button');
    timeButtonElements.forEach(button => {
        // 移除所有按鈕的選中狀態
        button.classList.remove('selected');
        
        // 為選中的時段添加選中狀態
        const timeText = button.querySelector('.time').textContent;
        if (timeText === selectedTime && !button.classList.contains('disabled')) {
            button.classList.add('selected');
        }
    });
}

// 檢查是否可以進入下一步
function checkNextButton() {
    nextButton.disabled = !(selectedDate && selectedTime && adultsSelect.value);
}

// 更新兒童人數選項（根據商家設定和總人數限制）
function updateChildrenOptions() {
    if (!bookingSettings) return;
    
    const adults = parseInt(adultsSelect.value);
    let maxChildren;
    
    if (bookingSettings.limitType === 'total') {
        // 總人數上限模式：小孩數量 = 總人數上限 - 選擇的大人數量
        maxChildren = bookingSettings.maxTotalPeople - adults;
    } else {
        // 分別設定模式：檢查兩種限制（商家設定的小孩上限 vs 總人數限制）
        const maxChildrenByTotal = bookingSettings.maxTotalPeople - adults;
        maxChildren = Math.min(bookingSettings.maxChildren, maxChildrenByTotal);
    }
    
    childrenSelect.innerHTML = '';
    
    for (let i = 0; i <= Math.max(0, maxChildren); i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i}位`;
        childrenSelect.appendChild(option);
    }
    
    checkNextButton();
}

// 事件監聽器
prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    generateCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    generateCalendar();
});

adultsSelect.addEventListener('change', () => {
    updateChildrenOptions();
    validatePeopleCount();
    checkNextButton();
});

childrenSelect.addEventListener('change', () => {
    validatePeopleCount();
    checkNextButton();
});

nextButton.addEventListener('click', () => {
    if (!selectedDate || !selectedTime || !adultsSelect.value) return;
    
    const adults = parseInt(adultsSelect.value);
    const children = parseInt(childrenSelect.value);
    const totalPeople = adults + children;
    
    // 檢查總人數上限
    if (totalPeople > bookingSettings.maxTotalPeople) {
        alert(`很抱歉，單次訂位最多${bookingSettings.maxTotalPeople}位客人`);
        return;
    }
    
    // 修正：使用本地時區格式化日期，避免時區轉換問題
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    // 將數據存儲在 sessionStorage 中，包含商家設定
    sessionStorage.setItem('bookingData', JSON.stringify({
        date: formattedDate,
        time: selectedTime,
        adults: adults,
        children: children
    }));
    
    sessionStorage.setItem('bookingSettings', JSON.stringify(bookingSettings));
    
    // 跳轉到第二步
    window.location.href = `/${storeSlug}/booking/step2`;
});

// 載入商家的訂位設定
async function loadBookingSettings() {
    try {
        const response = await fetch(`/${storeSlug}/api/booking-settings`);
        const data = await response.json();
        
        if (data.success) {
            bookingSettings = data.bookingSettings;
            
            // 根據設定生成人數選擇器
            generatePeopleSelectors();
        } else {
            console.error('載入商家訂位設定失敗:', data.message);
            // 使用預設設定
            useDefaultBookingSettings();
        }
    } catch (error) {
        console.error('載入商家訂位設定發生錯誤:', error);
        // 使用預設設定
        useDefaultBookingSettings();
    }
}

// 使用預設訂位設定
function useDefaultBookingSettings() {
    bookingSettings = {
        limitType: 'separate',
        maxAdults: 6,
        maxChildren: 6,
        maxTotalPeople: 10,
        enableVegetarian: false,
        enableSpecialRequests: false,
        specialRequestsType: 'default',
        customSpecialRequests: []
    };
    generatePeopleSelectors();
}

// 根據商家設定生成人數選擇器
function generatePeopleSelectors() {
    // 根據限制類型處理人數選項
    if (bookingSettings.limitType === 'total') {
        // 總人數上限模式：大人和小孩都可以選到總人數上限
        adultsSelect.innerHTML = '';
        for (let i = 1; i <= bookingSettings.maxTotalPeople; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}位`;
            adultsSelect.appendChild(option);
        }
        
        childrenSelect.innerHTML = '';
        for (let i = 0; i <= bookingSettings.maxTotalPeople; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}位`;
            childrenSelect.appendChild(option);
        }
    } else {
        // 分別設定模式：按照各自的上限
        adultsSelect.innerHTML = '';
        for (let i = 1; i <= bookingSettings.maxAdults; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}位`;
            adultsSelect.appendChild(option);
        }
        
        childrenSelect.innerHTML = '';
        for (let i = 0; i <= bookingSettings.maxChildren; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}位`;
            childrenSelect.appendChild(option);
        }
    }
}

// 驗證人數是否超過限制
function validatePeopleCount() {
    const adults = parseInt(adultsSelect.value);
    const children = parseInt(childrenSelect.value);
    const totalPeople = adults + children;
    
    if (totalPeople > bookingSettings.maxTotalPeople) {
        // 如果總人數超過限制，自動調整小孩人數
        let maxChildren;
        if (bookingSettings.limitType === 'total') {
            maxChildren = bookingSettings.maxTotalPeople - adults;
        } else {
            maxChildren = Math.min(bookingSettings.maxChildren, bookingSettings.maxTotalPeople - adults);
        }
        if (maxChildren >= 0) {
            childrenSelect.value = maxChildren;
        }
    }
}

// 初始化
async function init() {
    await loadBookingSettings(); // 先載入商家設定
    await loadCustomTimeSlots();
    generateCalendar();
    checkNextButton();
}

// 啟動初始化
init(); 
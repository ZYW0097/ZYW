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
    generateCalendar();
    updateTimeButtons(); // 這個現在是異步的，但不需要等待
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
                    updateTimeButtons();
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
    }
}

// 檢查是否可以進入下一步
function checkNextButton() {
    nextButton.disabled = !(selectedDate && selectedTime && adultsSelect.value);
}

// 更新兒童人數選項
function updateChildrenOptions() {
    const maxChildren = Math.min(6, parseInt(adultsSelect.value) * 2);
    childrenSelect.innerHTML = '';
    
    for (let i = 0; i <= maxChildren; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
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
    checkNextButton();
});

nextButton.addEventListener('click', () => {
    if (!selectedDate || !selectedTime || !adultsSelect.value) return;
    
    // 修正：使用本地時區格式化日期，避免時區轉換問題
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    // 將數據存儲在 sessionStorage 中
    sessionStorage.setItem('bookingData', JSON.stringify({
        date: formattedDate,
        time: selectedTime,
        adults: parseInt(adultsSelect.value),
        children: parseInt(childrenSelect.value)
    }));
    
    // 跳轉到第二步
    window.location.href = `/${storeSlug}/booking/step2`;
});

// 初始化
async function init() {
    await loadCustomTimeSlots();
    generateCalendar();
    updateChildrenOptions();
    checkNextButton();
}

// 啟動初始化
init(); 
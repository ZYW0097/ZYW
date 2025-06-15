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
    updateTimeButtons();
    checkNextButton();
}

// 更新時段按鈕
function updateTimeButtons() {
    if (!selectedDate) return;
    
    const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
    const timeSlots = isWeekend ? 
        ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'] :
        ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
    
    // 檢查是否是今天
    const today = new Date();
    const isToday = selectedDate.getDate() === today.getDate() && 
                   selectedDate.getMonth() === today.getMonth() && 
                   selectedDate.getFullYear() === today.getFullYear();
    
    // 獲取當前時間（小時和分鐘）
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    timeButtons.innerHTML = '';
    
    timeSlots.forEach(time => {
        const button = document.createElement('button');
        button.className = 'time-button';
        button.textContent = time;
        
        // 檢查時段是否已過期（只對今天有效）
        let isTimeDisabled = false;
        if (isToday) {
            const [timeHour, timeMinute] = time.split(':').map(Number);
            const timeInMinutes = timeHour * 60 + timeMinute;
            
            // 如果時段已經過了，禁用該時段
            if (timeInMinutes <= currentTimeInMinutes) {
                isTimeDisabled = true;
            }
        }
        
        if (isTimeDisabled) {
            button.classList.add('disabled');
            // 如果當前選中的時間被禁用，清除選擇
            if (selectedTime === time) {
                selectedTime = null;
            }
        } else {
            // 只有未禁用的時段才能點擊
            button.addEventListener('click', () => {
                selectedTime = time;
                updateTimeButtons();
                checkNextButton();
            });
        }
        
        // 如果是選中的時間且未被禁用，添加選中樣式
        if (selectedTime === time && !isTimeDisabled) {
            button.classList.add('selected');
        }
        
        timeButtons.appendChild(button);
    });
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
generateCalendar();
updateChildrenOptions();
checkNextButton(); 
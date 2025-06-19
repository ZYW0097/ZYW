document.addEventListener('DOMContentLoaded', function() {
    // 漢堡選單功能
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    
    if (hamburger && mobileMenu && overlay) {
        function openMenu() {
            document.body.style.overflow = 'hidden';
            hamburger.classList.add('active');
            mobileMenu.classList.add('open');
            overlay.style.display = 'block';
        }
        
        function closeMenu() {
            document.body.style.overflow = '';
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('open');
            overlay.style.display = 'none';
        }
        
        // 漢堡按鈕點擊事件
        hamburger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (mobileMenu.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
        
        // 覆蓋層點擊關閉
        overlay.addEventListener('click', closeMenu);
        
        // 行動版選單連結點擊
        document.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', function(e) {
                // 如果不是下拉觸發器，則關閉選單
                if (!this.classList.contains('dropdown-trigger-mobile')) {
                    closeMenu();
                }
            });
        });

        // 行動版下拉選單功能
        document.querySelectorAll('.dropdown-trigger-mobile').forEach(trigger => {
            trigger.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const dropdown = this.closest('.mobile-dropdown');
                const isActive = dropdown.classList.contains('active');
                
                // 關閉所有其他下拉選單
                document.querySelectorAll('.mobile-dropdown').forEach(dd => {
                    dd.classList.remove('active');
                });
                
                // 切換當前下拉選單
                if (!isActive) {
                    dropdown.classList.add('active');
                }
            });
        });

        // 點擊下拉選項後關閉選單
        document.querySelectorAll('.mobile-dropdown-item').forEach(item => {
            item.addEventListener('click', closeMenu);
        });
    }

    // Desktop版訂位下拉選單功能
    const desktopBookingDropdown = document.querySelector('#desktop-booking-dropdown');
    const bookingTrigger = document.querySelector('#booking-trigger');
    const bookingDropdownMenu = document.querySelector('#booking-dropdown-menu');
    
    if (desktopBookingDropdown && bookingTrigger && bookingDropdownMenu) {
        let isBookingDropdownOpen = false;
        let bookingHoverTimeout;
        
        function openBookingDropdown() {
            isBookingDropdownOpen = true;
            bookingDropdownMenu.classList.add('show');
        }
        
        function closeBookingDropdown() {
            isBookingDropdownOpen = false;
            bookingDropdownMenu.classList.remove('show');
        }
        
        // 點擊觸發器展開/關閉
        bookingTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (isBookingDropdownOpen) {
                closeBookingDropdown();
            } else {
                openBookingDropdown();
            }
        });
        
        // 鼠標懸停自動展開
        desktopBookingDropdown.addEventListener('mouseenter', function() {
            clearTimeout(bookingHoverTimeout);
            openBookingDropdown();
        });
        
        // 鼠標離開自動關閉（有延遲）
        desktopBookingDropdown.addEventListener('mouseleave', function() {
            bookingHoverTimeout = setTimeout(closeBookingDropdown, 300);
        });
        
        // 點擊其他地方關閉下拉選單
        document.addEventListener('click', function(e) {
            if (!desktopBookingDropdown.contains(e.target)) {
                closeBookingDropdown();
            }
        });
        
        // 防止下拉選單內的點擊關閉選單
        bookingDropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Desktop版控制台下拉選單功能
    const desktopControlDropdown = document.querySelector('#desktop-control-dropdown');
    const controlTrigger = document.querySelector('#control-trigger');
    const controlDropdownMenu = document.querySelector('#control-dropdown-menu');
    
    if (desktopControlDropdown && controlTrigger && controlDropdownMenu) {
        let isControlDropdownOpen = false;
        let controlHoverTimeout;
        
        function openControlDropdown() {
            isControlDropdownOpen = true;
            controlDropdownMenu.classList.add('show');
        }
        
        function closeControlDropdown() {
            isControlDropdownOpen = false;
            controlDropdownMenu.classList.remove('show');
        }
        
        // 點擊觸發器展開/關閉
        controlTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (isControlDropdownOpen) {
                closeControlDropdown();
            } else {
                openControlDropdown();
            }
        });
        
        // 鼠標懸停自動展開
        desktopControlDropdown.addEventListener('mouseenter', function() {
            clearTimeout(controlHoverTimeout);
            openControlDropdown();
        });
        
        // 鼠標離開自動關閉（有延遲）
        desktopControlDropdown.addEventListener('mouseleave', function() {
            controlHoverTimeout = setTimeout(closeControlDropdown, 300);
        });
        
        // 點擊其他地方關閉下拉選單
        document.addEventListener('click', function(e) {
            if (!desktopControlDropdown.contains(e.target)) {
                closeControlDropdown();
            }
        });
        
        // 防止下拉選單內的點擊關閉選單
        controlDropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
});

// 智能後台登出處理
function handleBackstageLogout(event, storeSlug) {
    event.preventDefault();
    
    // 獲取當前頁面路徑
    const currentPath = window.location.pathname;
    const isInBackstage = currentPath.includes('/backstage') && !currentPath.includes('/backstage-login');
    
    // 發送 AJAX 登出請求
    fetch(`/${storeSlug}/backstage/logout`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (isInBackstage) {
                // 如果在後台頁面，跳轉到登入頁面
                window.location.href = `/${storeSlug}/backstage-login?message=已成功登出`;
            } else {
                // 如果不在後台頁面，保持在當前頁面並重新載入以更新 header
                window.location.reload();
            }
        }
    })
    .catch(error => {
        console.error('登出失敗:', error);
        // 即使 AJAX 失敗，也嘗試重定向
        if (isInBackstage) {
            window.location.href = `/${storeSlug}/backstage-login`;
        } else {
            window.location.reload();
        }
    });
}

// 讓函數可以在全域範圍內使用
window.handleBackstageLogout = handleBackstageLogout;
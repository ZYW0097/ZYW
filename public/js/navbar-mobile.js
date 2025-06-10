document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    
    // Desktop版下拉選單功能
    const desktopDropdown = document.querySelector('.nav-dropdown');
    const bookingTrigger = document.querySelector('#booking-trigger');
    const dropdownMenu = document.querySelector('#booking-dropdown-menu');
    
    if (desktopDropdown && bookingTrigger && dropdownMenu) {
        let isDropdownOpen = false;
        let hoverTimeout;
        
        function openDropdown() {
            isDropdownOpen = true;
            dropdownMenu.classList.add('show');
        }
        
        function closeDropdown() {
            isDropdownOpen = false;
            dropdownMenu.classList.remove('show');
        }
        
        // 點擊觸發器展開/關閉
        bookingTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (isDropdownOpen) {
                closeDropdown();
            } else {
                openDropdown();
            }
        });
        
        // 鼠標懸停自動展開
        desktopDropdown.addEventListener('mouseenter', function() {
            clearTimeout(hoverTimeout);
            openDropdown();
        });
        
        // 鼠標離開自動關閉（有延遲）
        desktopDropdown.addEventListener('mouseleave', function() {
            hoverTimeout = setTimeout(() => {
                closeDropdown();
            }, 300);
        });
        
        // 點擊其他地方關閉下拉選單
        document.addEventListener('click', function(e) {
            if (!desktopDropdown.contains(e.target)) {
                closeDropdown();
            }
        });
        
        // 防止下拉選單內的點擊關閉選單
        dropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
  
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
    hamburger.addEventListener('click', function() {
      if (mobileMenu.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });
    overlay.addEventListener('click', closeMenu);
    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', function(e) {
        // 如果不是下拉觸發器，則關閉選單
        if (!this.classList.contains('dropdown-trigger-mobile')) {
          closeMenu();
        }
      });
    });

    // 行動版下拉選單功能
    const mobileDropdownTriggers = document.querySelectorAll('.dropdown-trigger-mobile');
    mobileDropdownTriggers.forEach(trigger => {
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
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
});
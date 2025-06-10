document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
  
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
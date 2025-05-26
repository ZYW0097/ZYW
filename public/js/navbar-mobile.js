document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    const closeBtn = document.getElementById('close-menu-btn');
  
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
    hamburger.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
  });
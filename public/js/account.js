document.addEventListener('DOMContentLoaded', function() {
    // Account 統一漢堡選單控制
    const accountHamburger = document.getElementById('account-hamburger-btn');
    const accountMobileMenu = document.getElementById('account-mobile-menu');
    const accountMobileOverlay = document.getElementById('account-mobile-overlay');
    
    // 隱藏header的漢堡選單功能，避免衝突
    const headerHamburger = document.getElementById('hamburger-btn');
    if (headerHamburger) {
        headerHamburger.style.display = 'none';
    }
    
    if (accountHamburger && accountMobileMenu && accountMobileOverlay) {
        // 開啟/關閉選單
        accountHamburger.addEventListener('click', function() {
            accountHamburger.classList.toggle('active');
            accountMobileMenu.classList.toggle('active');
            accountMobileOverlay.classList.toggle('active');
            document.body.style.overflow = accountMobileMenu.classList.contains('active') ? 'hidden' : '';
        });
        
        // 點擊遮罩關閉選單
        accountMobileOverlay.addEventListener('click', function() {
            accountHamburger.classList.remove('active');
            accountMobileMenu.classList.remove('active');
            accountMobileOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        // 點擊選單項目後關閉選單
        const accountMobileLinks = document.querySelectorAll('.account-mobile-link, .account-mobile-logout');
        accountMobileLinks.forEach(link => {
            link.addEventListener('click', function() {
                accountHamburger.classList.remove('active');
                accountMobileMenu.classList.remove('active');
                accountMobileOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
    
    // 格式化點數顯示函數（與card頁面相同）
    function formatPoints(num) {
        if (num < 1000) {
            return num.toString();
        }

        const units = [
            { value: 1_000_000_000_000, symbol: 'T' },
            { value: 1_000_000_000, symbol: 'B' },
            { value: 1_000_000, symbol: 'M' },  
            { value: 1_000, symbol: 'K' }  
        ];

        for (let i = 0; i < units.length; i++) {
            const unit = units[i];
            if (num >= unit.value) {
                const dividedNum = num / unit.value;

                if (dividedNum < 10) {
                    const floorVal = Math.floor(dividedNum * 10) / 10;
                    if (floorVal % 1 === 0) {
                        return floorVal.toString() + unit.symbol;
                    } else {
                        return floorVal.toFixed(1) + unit.symbol; 
                    }
                } else {
                    return Math.floor(dividedNum).toString() + unit.symbol;
                }
            }
        }
        return num.toString(); 
    }

    // 格式化所有點數顯示
    document.querySelectorAll('.points-display').forEach(element => {
        const points = parseInt(element.dataset.points) || 0;
        element.textContent = formatPoints(points);
    });
});
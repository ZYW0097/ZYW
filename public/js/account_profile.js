document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileForm');
    const profileBtn = document.getElementById('profileBtn');

    // Alert自動消失功能
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(function() {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 500);
        }, 3000); // 3秒後開始消失
    });

    // 表單提交
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            const phone = document.querySelector('input[name="phone"]').value;
            const email = document.querySelector('input[name="email"]').value;

            // 手機號碼格式驗證
            if (phone && !/^[0-9]{10}$/.test(phone)) {
                e.preventDefault();
                alert('手機號碼格式不正確，請輸入10位數字');
                return;
            }

            // Email格式驗證
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                e.preventDefault();
                alert('電子郵件格式不正確');
                return;
            }

            profileBtn.textContent = '儲存中...';
            profileBtn.disabled = true;
        });
    }
}); 
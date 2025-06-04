document.addEventListener('DOMContentLoaded', function() {
    // Alert自動消失功能
    const alerts = document.querySelectorAll('.error-message, .success-message');
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

    const passwordForm = document.getElementById('passwordForm');
    const passwordBtn = document.getElementById('passwordBtn');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrength = document.getElementById('passwordStrength');
    const editPasswordBtn = document.getElementById('editPasswordBtn');
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    const currentPasswordInput = document.getElementById('currentPassword');

    // 編輯模式切換
    if (editPasswordBtn) {
        editPasswordBtn.addEventListener('click', function() {
            // 啟用輸入框
            if (currentPasswordInput) currentPasswordInput.disabled = false;
            newPasswordInput.disabled = false;
            confirmPasswordInput.disabled = false;
            
            // 切換按鈕顯示
            this.style.display = 'none';
            passwordBtn.style.display = 'inline-block';
            if (cancelPasswordBtn) cancelPasswordBtn.style.display = 'inline-block';
        });
    }

    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', function() {
            // 禁用輸入框並清空
            if (currentPasswordInput) {
                currentPasswordInput.disabled = true;
                currentPasswordInput.value = '';
            }
            newPasswordInput.disabled = true;
            newPasswordInput.value = '';
            confirmPasswordInput.disabled = true;
            confirmPasswordInput.value = '';
            passwordStrength.style.display = 'none';
            
            // 移除錯誤狀態
            confirmPasswordInput.classList.remove('error');
            
            // 切換按鈕顯示
            editPasswordBtn.style.display = 'inline-block';
            passwordBtn.style.display = 'none';
            this.style.display = 'none';
        });
    }

    // 密碼強度檢查
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            const password = this.value;
            
            if (password.length > 0) {
                passwordStrength.style.display = 'block';
                checkPasswordStrength(password);
            } else {
                passwordStrength.style.display = 'none';
            }
        });
    }

    // 確認密碼檢查
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            const password = newPasswordInput.value;
            const confirmPassword = this.value;
            
            if (confirmPassword.length > 0) {
                if (password === confirmPassword) {
                    this.classList.remove('error');
                } else {
                    this.classList.add('error');
                }
            }
        });
    }

    // 密碼強度檢查函數
    function checkPasswordStrength(password) {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const isLongEnough = password.length >= 8;
        
        let score = 0;
        if (hasUpperCase) score++;
        if (hasLowerCase) score++;
        if (hasNumbers) score++;
        if (hasSpecialChar) score++;
        if (isLongEnough) score++;
        
        const strengthBar = passwordStrength.querySelector('.strength-bar');
        const strengthText = passwordStrength.querySelector('.strength-text');
        
        strengthBar.classList.remove('strength-weak', 'strength-medium', 'strength-strong');
        
        if (score < 3) {
            strengthBar.classList.add('strength-weak');
            strengthText.textContent = '密碼強度：弱';
            strengthText.style.color = '#dc3545';
        } else if (score < 5) {
            strengthBar.classList.add('strength-medium');
            strengthText.textContent = '密碼強度：中等';
            strengthText.style.color = '#ffc107';
        } else {
            strengthBar.classList.add('strength-strong');
            strengthText.textContent = '密碼強度：強';
            strengthText.style.color = '#28a745';
        }
    }

    // 表單提交
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (newPassword !== confirmPassword) {
                e.preventDefault();
                alert('密碼確認不一致');
                return;
            }

            if (newPassword.length < 8) {
                e.preventDefault();
                alert('密碼長度至少需要8字元');
                return;
            }

            passwordBtn.textContent = '處理中...';
            passwordBtn.disabled = true;
        });
    }
});

// 移除密碼功能
function removePassword() {
    if (confirm('確定要移除密碼登入功能嗎？移除後您只能使用 LINE 登入。')) {
        fetch('/account/settings/remove-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }).then(response => {
            if (response.ok) {
                location.reload();
            } else {
                alert('操作失敗，請稍後再試');
            }
        }).catch(() => {
            alert('操作失敗，請檢查網路連線');
        });
    }
}

// 刪除帳號功能
function deleteAccount() {
    if (confirm('確定要刪除帳號嗎？此操作無法復原，所有資料將永久刪除。')) {
        if (confirm('請再次確認：您真的要刪除帳號嗎？')) {
            fetch('/account/settings/delete-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            }).then(response => {
                if (response.ok) {
                    alert('帳號已刪除');
                    window.location.href = '/';
                } else {
                    alert('操作失敗，請稍後再試');
                }
            }).catch(() => {
                alert('操作失敗，請檢查網路連線');
            });
        }
    }
} 
// 動態增減規則
function addRule() {
    const rulesList = document.getElementById('rules-list');
    const idx = rulesList.children.length;
    const div = document.createElement('div');
    div.className = 'rule-item';
    div.innerHTML = `
        <input type="text" name="rules[]" placeholder="請輸入規則" required>
        <span class="add-btn" onclick="addRule()">➕</span>
        <span class="remove-btn" onclick="removeRule(this)">🗑️</span>
    `;
    rulesList.appendChild(div);
    updateRuleButtons();
}
function removeRule(btn) {
    btn.parentElement.remove();
    updateRuleButtons();
}
function updateRuleButtons() {
    const items = document.querySelectorAll('#rules-list .rule-item');
    items.forEach((item, idx) => {
        item.querySelector('.add-btn').style.display = (idx === items.length - 1) ? '' : 'none';
        if (items.length === 1) {
            const removeBtn = item.querySelector('.remove-btn');
            if (removeBtn) removeBtn.style.display = 'none';
        } else {
            item.querySelector('.remove-btn').style.display = '';
        }
    });
}

// 動態增減獎勵
let rewardIdx = 1;
function addReward() {
    const rewardsList = document.getElementById('rewards-list');
    const idx = rewardIdx++;
    const div = document.createElement('div');
    div.className = 'reward-item';
    div.innerHTML = `
        <input type="text" name="rewards[${idx}][name]" placeholder="獎勵名稱" required>
        <input type="number" name="rewards[${idx}][points]" placeholder="所需點數" min="1" required>
        <input type="file" name="rewards[${idx}][img]" accept=".png,.jpg,.jpeg,.svg" onchange="previewImg(this, ${idx})" required>
        <img id="img-preview-${idx}" class="reward-img-preview" style="display:none;">
        <span class="add-btn" onclick="addReward()">➕</span>
        <span class="remove-btn" onclick="removeReward(this)">🗑️</span>
    `;
    rewardsList.appendChild(div);
    updateRewardButtons();
}
function removeReward(btn) {
    btn.parentElement.remove();
    updateRewardButtons();
}
function updateRewardButtons() {
    const items = document.querySelectorAll('#rewards-list .reward-item');
    items.forEach((item, idx) => {
        item.querySelector('.add-btn').style.display = (idx === items.length - 1) ? '' : 'none';
        if (items.length === 1) {
            const removeBtn = item.querySelector('.remove-btn');
            if (removeBtn) removeBtn.style.display = 'none';
        } else {
            item.querySelector('.remove-btn').style.display = '';
        }
    });
}

// 圖片預覽
function previewImg(input, idx) {
    const file = input.files[0];
    const preview = document.getElementById('img-preview-' + idx);
    if (file && /\.(png|jpe?g|svg)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = '';
        };
        reader.readAsDataURL(file);
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    updateRuleButtons();
    updateRewardButtons();
});
document.addEventListener('DOMContentLoaded', function() {
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
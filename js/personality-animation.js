// 创建符号元素
function createSymbol(type, size) {
    const symbol = document.createElement('div');
    symbol.className = `personality-symbol ${type}-symbol ${size}`;
    
    // 随机起始位置（屏幕底部）
    const startX = Math.random() * window.innerWidth;
    const startY = window.innerHeight;
    
    // 随机结束位置（屏幕顶部）
    const endX = Math.random() * window.innerWidth;
    const endY = -100;
    
    // 中间点（用于曲线效果）
    const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 200;
    const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 200;
    
    // 设置CSS变量
    symbol.style.setProperty('--startX', `${startX}px`);
    symbol.style.setProperty('--startY', `${startY}px`);
    symbol.style.setProperty('--midX', `${midX}px`);
    symbol.style.setProperty('--midY', `${midY}px`);
    symbol.style.setProperty('--endX', `${endX}px`);
    symbol.style.setProperty('--endY', `${endY}px`);
    
    // 添加到body
    document.body.appendChild(symbol);
    
    return symbol;
}

// 生成多个符号
function generateSymbols(type, count) {
    const sizes = ['small', 'medium', 'large'];
    
    for (let i = 0; i < count; i++) {
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        createSymbol(type, size);
    }
}

// 持续生成符号的函数
function startSymbolGeneration(type) {
    // 清除现有的符号
    const existingSymbols = document.querySelectorAll('.personality-symbol');
    existingSymbols.forEach(symbol => symbol.remove());
    
    // 初始生成一批符号
    generateSymbols(type, 15);
    
    // 每隔一段时间生成新的符号
    return setInterval(() => {
        generateSymbols(type, 5);
    }, 500);
}

// 监听性格选择
document.addEventListener('DOMContentLoaded', () => {
    // 确保选择器匹配HTML中的类名
    const emotionalChoice = document.querySelector('.personality-choice[data-type="emotional"]');
    const rationalChoice = document.querySelector('.personality-choice[data-type="rational"]');
    
    if (emotionalChoice) {
        emotionalChoice.addEventListener('click', () => {
            emotionalChoice.classList.add('selected');
            if (rationalChoice) rationalChoice.classList.remove('selected');
        });
    }
    
    if (rationalChoice) {
        rationalChoice.addEventListener('click', () => {
            rationalChoice.classList.add('selected');
            if (emotionalChoice) emotionalChoice.classList.remove('selected');
        });
    }
}); 
// 创建音符元素
function createMusicNote(type, playSound = false) {
    const note = document.createElement('div');
    note.className = `music-note ${type}`;
    
    // 随机选择音符符号
    const musicSymbols = ['♪', '♫', '♬', '♩', '♭', '♮'];
    note.textContent = musicSymbols[Math.floor(Math.random() * musicSymbols.length)];
    
    // 随机起始位置（屏幕底部）
    const startX = Math.random() * window.innerWidth;
    const startY = window.innerHeight + 50; // 确保从屏幕底部以下开始
    
    // 随机结束位置（屏幕顶部）
    const endX = startX + (Math.random() - 0.5) * 300; // 水平方向有一定偏移
    const endY = -100;
    
    // 中间点（用于曲线效果）
    const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 200;
    const midY = (startY + endY) / 2;
    
    // 设置CSS变量
    note.style.setProperty('--startX', `${startX}px`);
    note.style.setProperty('--startY', `${startY}px`);
    note.style.setProperty('--midX', `${midX}px`);
    note.style.setProperty('--midY', `${midY}px`);
    note.style.setProperty('--endX', `${endX}px`);
    note.style.setProperty('--endY', `${endY}px`);
    
    // 随机大小
    const sizes = ['24px', '32px', '40px'];
    note.style.fontSize = sizes[Math.floor(Math.random() * sizes.length)];
    
    // 添加到body
    document.body.appendChild(note);
    
    // 动画结束后移除元素
    note.addEventListener('animationend', () => {
        note.remove();
    });
    
    // 只在指定时才播放音效
    if (playSound && window.soundEffects) {
        window.soundEffects.play('select');
    }
    
    return note;
}

// 生成多个音符
function generateMusicNotes(type, count, playSound = false) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            createMusicNote(type, i === 0 && playSound); // 只在第一个音符时播放音效
        }, i * 150); // 缩短音符之间的延迟
    }
}

// 持续生成音符的函数
function startMusicNoteGeneration(type) {
    // 清除现有的音符
    const existingNotes = document.querySelectorAll('.music-note');
    existingNotes.forEach(note => note.remove());
    
    // 初始生成一批音符，只在开始时播放一次音效
    generateMusicNotes(type, 12, true);
    
    // 每隔一段时间生成新的音符，但不播放音效
    return setInterval(() => {
        generateMusicNotes(type, 4, false);
    }, 1500);
}

// 监听性格选择
document.addEventListener('DOMContentLoaded', () => {
    let currentInterval = null;
    
    const introvertChoice = document.querySelector('.personality-choice[data-type="introvert"]');
    const extrovertChoice = document.querySelector('.personality-choice[data-type="extrovert"]');
    
    if (introvertChoice) {
        introvertChoice.addEventListener('click', () => {
            if (currentInterval) clearInterval(currentInterval);
            currentInterval = startMusicNoteGeneration('introvert');
            
            introvertChoice.classList.add('selected');
            if (extrovertChoice) extrovertChoice.classList.remove('selected');
        });
    }
    
    if (extrovertChoice) {
        extrovertChoice.addEventListener('click', () => {
            if (currentInterval) clearInterval(currentInterval);
            currentInterval = startMusicNoteGeneration('extrovert');
            
            extrovertChoice.classList.add('selected');
            if (introvertChoice) introvertChoice.classList.remove('selected');
        });
    }
    
    // 当切换页面时停止动画
    document.addEventListener('fullpage_leave', (event) => {
        if (currentInterval) {
            clearInterval(currentInterval);
            currentInterval = null;
            
            // 清除所有音符
            const notes = document.querySelectorAll('.music-note');
            notes.forEach(note => note.remove());
        }
    });
}); 
document.addEventListener('DOMContentLoaded', () => {
    // 获取自定义光标元素
    const cursor = document.querySelector('.custom-cursor');
    let cursorVisible = true;
    let currentProgress = 0;
    let selectedEmotions = new Set();

    // 音频元素
    const bgMusic = document.getElementById('bgMusic');
    bgMusic.src = 'baizaoyin.mp3';  // 设置默认背景音乐
    bgMusic.volume = 0.3;  // 设置适中的音量
    bgMusic.loop = true;  // 确保音乐循环播放
    
    // 尝试自动播放音乐
    function tryPlayMusic() {  
        bgMusic.play().then(() => {
            console.log('Background music started automatically');
        }).catch(error => {
            console.warn('Auto-play prevented, waiting for user interaction');
            // 如果自动播放失败，添加一次性点击事件监听器
            document.addEventListener('click', function playOnFirstClick() {
                bgMusic.play().then(() => {
                    console.log('Background music started after user interaction');
                });
                document.removeEventListener('click', playOnFirstClick);
            }, { once: true });
        });
    }

    // 在页面加载完成后尝试播放音乐
    tryPlayMusic();

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            bgMusic.pause();
        } else {
            bgMusic.play().catch(() => {});
        }
    });

    let currentEmotion = '';
    let selectedPersonalityTraits = {
        style: null,  // 'rational' or 'emotional'
        social: null  // 'extrovert' or 'introvert'
    };

    // 为所有可点击元素添加音效
    const addSoundEffects = () => {
        // 获取所有可点击元素
        const clickableElements = document.querySelectorAll('button, .emotion-card, .personality-choice, .action-btn, a');
        
        clickableElements.forEach(element => {
            // 点击音效
            element.addEventListener('click', () => {
                if (element.classList.contains('emotion-card')) {
                    window.soundEffects.play('select');
                } else if (element.classList.contains('start-btn')) {
                    window.soundEffects.play('success');
                } else {
                    window.soundEffects.play('click');
                }
            });
            
            // 悬停音效
            element.addEventListener('mouseenter', () => {
                window.soundEffects.play('hover');
            });
        });
    };

    // 光标移动效果
    const moveCursor = (e) => {
        const { clientX: x, clientY: y } = e;
        cursor.style.transform = `translate(${x - cursor.offsetWidth / 2}px, ${y - cursor.offsetHeight / 2}px)`;
        
        if (!cursorVisible) {
            cursor.style.opacity = '1';
            cursorVisible = true;
        }
    };

    // 光标点击效果
    const addClickEffect = () => {
        cursor.classList.add('active');
        setTimeout(() => cursor.classList.remove('active'), 300);
    };

    // 处理光标离开窗口
    const hideCursor = () => {
        cursor.style.opacity = '0';
        cursorVisible = false;
    };

    // 添加事件监听
    document.addEventListener('mousemove', moveCursor);
    document.addEventListener('mousedown', () => {
        addClickEffect();
        // 添加通用点击音效
        window.soundEffects.play('click');
    });
    document.addEventListener('mouseup', () => cursor.classList.remove('active'));
    document.addEventListener('mouseleave', hideCursor);
    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = '1';
        cursorVisible = true;
    });

    // 初始化音效
    addSoundEffects();

    // 初始化全屏滚动
    new fullpage('#fullpage', {
        licenseKey: 'gplv3-license',
        autoScrolling: true,
        scrollHorizontally: true,
        anchors: ['section1', 'section2', 'section3', 'section4'],
        afterLoad: function(origin, destination, direction) {
            // 处理页面切换逻辑
            if (destination.index === 3) { // 当进入第四页时
                if (!window.handDrawingManager) {
                    window.handDrawingManager = new HandDrawingManager();
                    if (currentEmotion) {
                        window.handDrawingManager.setColor(currentEmotion);
                    }
                }
            } else if (origin && origin.index === 3) {
                // 当离开第四页时，停止摄像头
                if (window.handDrawingManager) {
                    window.handDrawingManager.camera.stop();
                }
            }
        }
    });

    // 添加脚本加载函数
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // 预加载MediaPipe相关脚本
    Promise.all([
        loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'),
        loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
        loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js')
    ]).catch(error => {
        console.error('Failed to preload MediaPipe scripts:', error);
    });

    // START按钮点击事件
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            resetEmotionSelection();
            fullpage_api.moveTo(2);
        });
    }

    // 情绪卡片点击事件
    const emotionCards = document.querySelectorAll('.emotion-card');
    const emotionOverlay = document.querySelector('.emotion-overlay');
    const emotionsSection = document.querySelector('[data-anchor="section2"]');
    const personalitySection = document.querySelector('[data-anchor="section3"]');
    const emotionProgressFill = document.querySelector('.emotions-content .progress-fill');
    const emotionProgressText = document.querySelector('.emotions-content .progress-percentage');
    const emotionNextBtn = document.getElementById('emotionNextBtn');

    // 添加情绪动画相关变量
    let emotionInterval;
    const emotionEmojis = [];

    function createEmotionEmoji(emotion) {
        const emoji = document.createElement('div');
        emoji.className = `emotion-emoji ${emotion}`;
        const img = document.createElement('img');
        
        // 根据情绪选择对应的图片
        switch(emotion) {
            case 'happy':
                img.src = 'happy.jpg';
                break;
            case 'sad':
                img.src = 'sad.jpg';
                break;
            case 'angry':
                img.src = 'angry.jpg';
                break;
            case 'blank':
                img.src = 'fadai.jpg';
                break;
        }
        
        emoji.appendChild(img);
        
        // 生成随机起点、中点和终点
        const startX = Math.random() * window.innerWidth;
        const startY = Math.random() * window.innerHeight;
        
        // 确保中点和终点与起点有一定距离
        const midX = (startX + Math.random() * 400 - 200 + window.innerWidth) % window.innerWidth;
        const midY = (startY + Math.random() * 400 - 200 + window.innerHeight) % window.innerHeight;
        
        const endX = (midX + Math.random() * 400 - 200 + window.innerWidth) % window.innerWidth;
        const endY = (midY + Math.random() * 400 - 200 + window.innerHeight) % window.innerHeight;

        // 设置CSS变量用于动画
        emoji.style.setProperty('--startX', `${startX}px`);
        emoji.style.setProperty('--startY', `${startY}px`);
        emoji.style.setProperty('--midX', `${midX}px`);
        emoji.style.setProperty('--midY', `${midY}px`);
        emoji.style.setProperty('--endX', `${endX}px`);
        emoji.style.setProperty('--endY', `${endY}px`);
        
        // 设置初始位置
        emoji.style.left = '0';
        emoji.style.top = '0';
        
        document.body.appendChild(emoji);
        
        // 动画结束后移除元素
        emoji.addEventListener('animationend', () => {
            emoji.remove();
        });

        return emoji;
    }

    function startEmotionAnimation(emotion) {
        // 清除现有的动画
        stopEmotionAnimation();
        
        // 创建新的表情动画
        emotionInterval = setInterval(() => {
            // 每隔一定时间创建新的表情
            if (Math.random() < 0.4) { // 40%的概率创建新表情
                createEmotionEmoji(emotion);
            }
        }, 300);
    }

    function stopEmotionAnimation() {
        clearInterval(emotionInterval);
        document.querySelectorAll('.emotion-emoji').forEach(emoji => {
            emoji.style.animation = 'none';
            setTimeout(() => emoji.remove(), 100);
        });
    }

    // 重置情绪选择状态
    function resetEmotionSelection() {
        selectedEmotions.clear();
        if (emotionProgressFill && emotionProgressText) {
            emotionProgressFill.style.width = '0%';
            emotionProgressText.textContent = '0%';
        }
        if (emotionNextBtn) {
            emotionNextBtn.disabled = true;
        }
        // 清除所有情绪卡片的选中状态
        document.querySelectorAll('.emotion-card').forEach(card => {
            card.classList.remove('clicked');
        });
        // 重置情绪叠加层
        if (emotionOverlay) {
            emotionOverlay.className = 'emotion-overlay';
        }
        // 停止任何正在进行的动画
        stopEmotionAnimation();
        // 隐藏箭头
        const arrowElement = document.querySelector('.emotion-arrow');
        if (arrowElement) {
            arrowElement.style.opacity = '0';
        }
    }

    emotionCards.forEach(card => {
        card.addEventListener('click', () => {
            const emotion = card.getAttribute('data-emotion');
            currentEmotion = emotion;
            
            // 停止之前的动画
            stopEmotionAnimation();
            
            // 开始新的情绪动画
            startEmotionAnimation(emotion);

            // 更新情绪叠加层
            emotionOverlay.className = 'emotion-overlay';
            void emotionOverlay.offsetWidth;
            emotionOverlay.classList.add(emotion, 'active');

            // 触发情绪变化事件
            const event = new CustomEvent('emotionChange', {
                detail: { emotion: emotion }
            });
            document.dispatchEvent(event);

            // 更新选中的情绪集合
            if (!selectedEmotions.has(emotion)) {
                selectedEmotions.add(emotion);
                
                // 重置进度条到0%
                if (emotionProgressFill && emotionProgressText) {
                    emotionProgressFill.style.width = '0%';
                    emotionProgressText.textContent = '0%';
                }
                
                // 使用动画从0%增加到25%
                let progress = 0;
                const animateProgress = setInterval(() => {
                    progress += 1;
                    if (progress <= 25) {
                        if (emotionProgressFill) {
                            emotionProgressFill.style.width = `${progress}%`;
                        }
                        if (emotionProgressText) {
                            emotionProgressText.textContent = `${progress}%`;
                        }
                    } else {
                        clearInterval(animateProgress);
                    }
                }, 20); // 每20毫秒更新一次，总共500毫秒完成动画
            }

            // 启用NEXT按钮
            if (emotionNextBtn) emotionNextBtn.disabled = false;

            // 添加点击动画效果
            card.classList.add('clicked');
            setTimeout(() => card.classList.remove('clicked'), 300);

            // 创建情绪粒子效果
            createEmotionParticles(emotion);

            // 更新箭头图片
            updateArrow(emotion);
        });
    });

    function updateArrow(emotion) {
        const arrowElement = document.querySelector('.emotion-arrow');
        const arrowImg = arrowElement.querySelector('img');
        
        // 移除所有情绪类名
        arrowElement.classList.remove('happy', 'sad', 'angry', 'blank');
        
        // 根据情绪设置对应的箭头图片
        switch(emotion) {
            case 'happy':
                arrowImg.src = 'lv.jpg';
                arrowElement.classList.add('happy');
                break;
            case 'sad':
                arrowImg.src = 'lan.jpg';
                arrowElement.classList.add('sad');
                break;
            case 'angry':
                arrowImg.src = 'hong.jpg';
                arrowElement.classList.add('angry');
                break;
            case 'blank':
                arrowImg.src = 'huang.jpg';
                arrowElement.classList.add('blank');
                break;
        }
        
        // 显示箭头
        arrowElement.style.opacity = '1';
    }

    // 在页面切换时隐藏箭头
    document.addEventListener('fullpage:afterLoad', function(event) {
        if (event.detail.destination.index !== 1) {
            const arrowElement = document.querySelector('.emotion-arrow');
            if (arrowElement) {
                arrowElement.style.opacity = '0';
            }
            stopEmotionAnimation();
        }
    });

    // 情绪选择页面的NEXT按钮点击事件
    if (emotionNextBtn) {
        emotionNextBtn.addEventListener('click', () => {
            // 停止情绪动画
            stopEmotionAnimation();
            
            // 隐藏箭头
            const arrowElement = document.querySelector('.emotion-arrow');
            if (arrowElement) {
                arrowElement.style.opacity = '0';
            }
            
            fullpage_api.moveTo(3);
        });
    }

    // 性格选择事件处理
    const personalityChoices = document.querySelectorAll('.personality-choice');
    const selectedTraitsText = document.getElementById('selectedTraits');
    const personalityNextBtn = document.getElementById('personalityNextBtn');
    const personalityProgress = document.querySelector('.personality-progress .progress-fill');
    const personalityPercentage = document.querySelector('.personality-progress .progress-percentage');
    let selectedCategories = {
        style: false,
        social: false
    };

    personalityChoices.forEach(choice => {
        choice.addEventListener('click', () => {
            const type = choice.getAttribute('data-type');
            const category = choice.getAttribute('data-category');
            
            // 移除同类选项的选中状态
            const sameTypeChoices = document.querySelectorAll(`.personality-choice[data-category="${category}"]`);
            sameTypeChoices.forEach(el => el.classList.remove('selected'));
            
            // 添加选中状态
            choice.classList.add('selected');
            
            // 更新选中的特征
            selectedPersonalityTraits[category === 'style' ? 'style' : 'social'] = type;
            selectedCategories[category] = true;
            
            // 更新显示的文本
            updateSelectedTraits();
            
            // 应用样式变化
            applyPersonalityStyles();
            
            // 处理音乐播放
            handleMusicPlayback();

            // 更新进度
            updatePersonalityProgress();

            // 如果两个特征都选择了，启用NEXT按钮
            const selectedCount = Object.values(selectedCategories).filter(Boolean).length;
            if (personalityNextBtn) personalityNextBtn.disabled = selectedCount < 2;
        });
    });

    function updatePersonalityProgress() {
        const baseProgress = 25; // 基础进度
        const selectedCount = Object.values(selectedCategories).filter(Boolean).length;
        const additionalProgress = selectedCount * 12.5; // 每个选择增加12.5%
        const totalProgress = baseProgress + additionalProgress;
        
        if (personalityProgress) {
            personalityProgress.style.width = `${totalProgress}%`;
        }
        if (personalityPercentage) {
            personalityPercentage.textContent = `${Math.round(totalProgress)}%`;
        }
    }

    function updateSelectedTraits() {
        if (!selectedTraitsText) return;
        const traits = [];
        if (selectedPersonalityTraits.style) {
            traits.push(selectedPersonalityTraits.style === 'rational' ? '理性' : '感性');
        }
        if (selectedPersonalityTraits.social) {
            traits.push(selectedPersonalityTraits.social === 'extrovert' ? '外向' : '内向');
        }
        selectedTraitsText.textContent = traits.length > 0 ? traits.join('、') : '未选择';
    }

    function applyPersonalityStyles() {
        const style = selectedPersonalityTraits.style;
        if (style && personalitySection) {
            // 移除现有的样式类
            personalitySection.classList.remove('rational-style', 'emotional-style');
            // 添加新的样式类
            personalitySection.classList.add(`${style}-style`);
            
            // 设置背景透明度
            document.documentElement.style.setProperty(
                '--background-opacity', 
                style === 'rational' ? '0.8' : '1'
            );
        }
    }

    function handleMusicPlayback() {
        const social = selectedPersonalityTraits.social;
        if (social) {
            // 防止多次触发音乐切换
            if (bgMusic.dataset.currentType === social) {
                return;
            }
            bgMusic.dataset.currentType = social;

            // 淡出当前音乐
            let fadeOutInterval = setInterval(() => {
                if (bgMusic.volume > 0.02) {
                    bgMusic.volume = Math.max(0, bgMusic.volume - 0.02);
                } else {
                    clearInterval(fadeOutInterval);
                    fadeOutInterval = null;
                    
                    // 设置新的音频源
                    const newSource = social === 'extrovert' ? 'happy.mp3' : 'sad.mp3';
                    if (bgMusic.src.indexOf(newSource) === -1) {
                        bgMusic.src = newSource;
                    }
                    bgMusic.volume = 0;
                    
                    // 播放新音乐并淡入
                    bgMusic.play().then(() => {
                        let fadeInInterval = setInterval(() => {
                            if (bgMusic.volume < 0.28) {
                                bgMusic.volume = Math.min(0.3, bgMusic.volume + 0.02);
                            } else {
                                bgMusic.volume = 0.3;
                                clearInterval(fadeInInterval);
                                fadeInInterval = null;
                            }
                        }, 100);
                    }).catch(error => {
                        console.warn('Failed to play new background music:', error);
                        // 恢复音量以防播放失败
                        bgMusic.volume = 0.3;
                    });
                }
            }, 100);
        }
    }

    // 创建情绪相关的粒子效果
    function createEmotionParticles(emotion) {
        const colors = {
            happy: '#62FF8F',
            sad: '#62B6FF',
            angry: '#FF6262',
            blank: '#FFD962'
        };

        const card = document.querySelector(`[data-emotion="${emotion}"]`);
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.position = 'fixed';
            particle.style.width = '8px';
            particle.style.height = '8px';
            particle.style.background = colors[emotion];
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            
            document.body.appendChild(particle);

            const angle = (i / 12) * Math.PI * 2;
            const velocity = 2;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;

            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;

            particle.animate([
                { transform: 'scale(1) translate(0, 0)', opacity: 1 },
                { transform: `scale(0) translate(${vx * 100}px, ${vy * 100}px)`, opacity: 0 }
            ], {
                duration: 1000,
                easing: 'ease-out'
            }).onfinish = () => particle.remove();
        }
    }

    // 粒子效果相关变量和函数
    const particles = [];
    const maxParticles = 50;
    const stars = [];
    const maxStars = 100;

    // 创建星星背景
    function createStars() {
        const starContainer = document.createElement('div');
        starContainer.className = 'star-container';
        starContainer.style.position = 'fixed';
        starContainer.style.top = '0';
        starContainer.style.left = '0';
        starContainer.style.width = '100%';
        starContainer.style.height = '100%';
        starContainer.style.pointerEvents = 'none';
        starContainer.style.zIndex = '0';
        document.body.appendChild(starContainer);

        for (let i = 0; i < maxStars; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.position = 'absolute';
            star.style.width = `${Math.random() * 3}px`;
            star.style.height = star.style.width;
            star.style.background = 'white';
            star.style.borderRadius = '50%';
            star.style.opacity = Math.random() * 0.8 + 0.2;
            star.style.animation = `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`;
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            
            const glowSize = parseInt(star.style.width) * 2;
            
            starContainer.appendChild(star);
            stars.push(star);
        }
    }

    // 创建鼠标跟随粒子
    const createMouseParticle = (x, y, isClick = false) => {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.position = 'absolute';
        particle.style.width = isClick ? '8px' : '4px';
        particle.style.height = isClick ? '8px' : '4px';
        particle.style.background = `rgba(255, 255, 255, ${isClick ? 0.8 : 0.6})`;
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        document.body.appendChild(particle);

        const angle = Math.random() * Math.PI * 2;
        const velocity = isClick ? 5 : 2;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        const animation = particle.animate([
            { transform: 'scale(1)', opacity: 1 },
            { transform: `translate(${vx * 50}px, ${vy * 50}px) scale(0)`, opacity: 0 }
        ], {
            duration: isClick ? 1000 : 800,
            easing: 'ease-out'
        });
        
        animation.onfinish = () => {
            particle.remove();
        };
    };

    // 添加鼠标移动效果
    document.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        
        // 星星视差效果
        stars.forEach(star => {
            const speed = parseFloat(star.style.width) * 0.2;
            const x = (clientX / window.innerWidth - 0.5) * speed;
            const y = (clientY / window.innerHeight - 0.5) * speed;
            star.style.transform = `translate(${x}px, ${y}px)`;
        });
        
        // 创建鼠标跟随粒子
        if (Math.random() < 0.3) {
            createMouseParticle(clientX, clientY);
        }
    });

    // 添加点击效果
    document.addEventListener('click', (e) => {
        const { clientX, clientY } = e;
        for (let i = 0; i < 8; i++) {
            createMouseParticle(clientX, clientY, true);
        }
    });

    // 创建星星
    createStars();

    // 为可点击元素添加光标效果
    const clickableElements = document.querySelectorAll('a, button, .card, .feature-item, .contact-input, .emotion-card');
    clickableElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.classList.add('active');
        });
        element.addEventListener('mouseleave', () => {
            cursor.classList.remove('active');
        });
    });

    // 处理视频背景
    const video = document.querySelector('.background-video');
    if (video) {
        // 确保视频加载完成后播放
        video.addEventListener('loadeddata', function() {
            video.play();
        });

        // 如果视频加载失败，添加错误处理
        video.addEventListener('error', function(e) {
            console.error('Video loading error:', e);
        });

        // 确保视频循环播放
        video.addEventListener('ended', function() {
            video.currentTime = 0;
            video.play();
        });

        // 添加视频播放状态检查
        setInterval(function() {
            if (video.paused) {
                video.play();
            }
        }, 1000);
    }

    // 添加性格选择NEXT按钮的点击事件
    if (personalityNextBtn) {
        personalityNextBtn.addEventListener('click', () => {
            fullpage_api.moveTo(4); // 移动到第四页
        });
    }

    // 融合进度部分
    let fusionTaskId = null;
    let fusionReqKey = null;
    let fusionPollingTimer = null;
    let starInterval = null;

    function createFusionStar() {
        const container = document.getElementById('fusionStars');
        if (!container) return;

        const star = document.createElement('div');
        star.className = 'fusion-star';
        
        // 随机位置
        const startX = Math.random() * window.innerWidth;
        star.style.left = `${startX}px`;
        star.style.bottom = '-30px';
        
        // 随机大小
        const size = 20 + Math.random() * 20;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // 随机动画延迟
        star.style.animationDelay = `${Math.random() * 2}s`;
        
        // 添加发光效果
        star.classList.add('glowing');
        
        container.appendChild(star);
        
        // 动画结束后移除星星
        star.addEventListener('animationend', () => {
            star.remove();
        });
    }

    function startFusionStars() {
        // 确保只在section5显示
        const currentSection = document.querySelector('.section.active');
        if (!currentSection || currentSection.getAttribute('data-anchor') !== 'section5') {
            return;
        }

        // 清除现有的星星生成器
        if (starInterval) {
            clearInterval(starInterval);
        }
        
        // 每300ms生成一个新的星星
        starInterval = setInterval(createFusionStar, 300);
    }

    function stopFusionStars() {
        if (starInterval) {
            clearInterval(starInterval);
            starInterval = null;
        }
        // 清除所有现有的星星
        const container = document.getElementById('fusionStars');
        if (container) {
            container.innerHTML = '';
        }
    }

    // 监听页面切换事件
    document.addEventListener('fullpage:afterLoad', function(event) {
        if (event.detail.destination.index === 4) { // 当进入section5时
            startFusionStars();
        } else {
            stopFusionStars();
        }
    });

    function showFusionSection({ imageUrl }) {
        // 只展示图片
        if (window.fullpage_api) window.fullpage_api.moveTo(5);
        const img = document.getElementById('fusionImage');
        if (img && imageUrl) {
            img.src = imageUrl;
            img.style.display = 'block';
            // 开始生成星星
            startFusionStars();
        }
    }

    async function queryFusionProgress() {
        if (!fusionTaskId || !fusionReqKey) return;
        try {
            // 展示第二句
            document.getElementById('msg2').textContent = '已发送融合请求';
            const res = await fetch(`/api/queryFusionProgress?task_id=${fusionTaskId}&req_key=${fusionReqKey}`);
            const data = await res.json();
            if (data.status === 'done') {
                document.getElementById('msg3').textContent = '融合完成';
                clearInterval(fusionPollingTimer);
                // 融合完成时停止生成星星
                stopFusionStars();
            } else {
                document.getElementById('msg3').textContent = '进行融合中...';
            }
        } catch (e) {
            document.getElementById('msg3').textContent = '进度查询失败';
        }
    }

    // section4保存图片后调用showFusionSection
    // 假设handDrawing.js保存图片后会调用如下：
    window.onHandDrawingSaved = function({ imageUrl, keywords, taskId, reqKey }) {
        showFusionSection({ imageUrl });
    };

    // fullPage.js 页面切换事件
    document.addEventListener('fullpage:afterLoad', function(event) {
        // event.detail.destination.index 是当前页的索引（第六页为5）
        if (event.detail.destination.index === 5) {
            // 设置风格
            const personalityStyle = selectedPersonalityTraits.style; // 'rational' or 'emotional'
            const giftSection = document.querySelector('[data-anchor="section6"]');
            if (giftSection) {
                giftSection.classList.remove('rational-style', 'emotional-style');
                if (personalityStyle) giftSection.classList.add(`${personalityStyle}-style`);
            }
            // 设置礼物盒图片和发光色
            const giftImg = document.getElementById('giftBoxImg');
            if (giftImg) {
                let emotion = currentEmotion;
                let src = 'yellow1.jpg', glowClass = 'happy';
                if (emotion === 'happy') { src = 'green1.jpg'; glowClass = 'happy'; }
                else if (emotion === 'sad') { src = 'blue1.jpg'; glowClass = 'sad'; }
                else if (emotion === 'angry') { src = 'red1.jpg'; glowClass = 'angry'; }
                else if (emotion === 'blank') { src = 'yellow1.jpg'; glowClass = 'blank'; }
                giftImg.src = src;
                giftImg.className = `gift-img ${glowClass}`;
            }
        }
    });

    // Web Speech API implementation
    let recognition;
    let isListening = false;

    function initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'zh-CN';

            recognition.onresult = function(event) {
                const result = event.results[event.results.length - 1][0].transcript.toLowerCase();
                if (result.includes('打开礼物盒') || result.includes('open the gift')) {
                    transformGiftBox();
                }
            };

            recognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
            };

            recognition.onend = function() {
                if (isListening) {
                    recognition.start();
                }
            };
        }
    }

    function startListening() {
        if (recognition && !isListening) {
            isListening = true;
            recognition.start();
        }
    }

    function stopListening() {
        if (recognition && isListening) {
            isListening = false;
            recognition.stop();
        }
    }

    function transformGiftBox() {
        const giftBox = document.querySelector('.gift-box');
        const giftImg = document.getElementById('giftBoxImg');
        const giftTip = document.querySelector('.gift-tip');
        
        // Stop listening after transformation
        stopListening();
        
        // Change the image to envelope
        giftImg.src = 'xinfeng.jpg';
        const kwBox = document.getElementById('qianwen-keywords-box');
        const keywords = kwBox ? kwBox.value : '';
        console.log('即梦关键词：' + keywords);
        // Update the text
        giftTip.innerHTML = `
            <div style="font-size: 1.8rem; margin-bottom: 1rem;">你在画，它在跟；你在引，它在生。</div>
            <div style="font-size: 1.2rem; color: rgba(255,255,255,0.8);">(信封中的话，是AI依据你刚才绘制的路径联想生成的。)</div>
            <div style="font-size: 1.2rem; margin-top: 1rem;">As you draw, it follows; As you guide, it creates.</div>
            <div style="font-size: 1rem; color: rgba(255,255,255,0.8);">(The words in the envelope are generated by AI based on your drawing path.)</div>
        `;
        
        // Add envelope-specific animations
        giftBox.classList.add('envelope-transformed');
    }

    // Initialize speech recognition when the page loads
    initSpeechRecognition();
    
    // Start listening when entering the gift box section
    document.addEventListener('fullpage:afterLoad', function(event) {
        if (event.detail.destination.index === 5) { // Sixth page
            startListening();
        } else {
            stopListening();
        }
    });

    // 启用语音识别按钮
    const startVoiceBtn = document.getElementById('startVoiceBtn');
    if (startVoiceBtn) {
        startVoiceBtn.addEventListener('click', () => {
            startListening(); // 用户点击后才开始语音识别
        });
    }

    // 生成萤火虫
    function createFireflies(num = 20) {
        const container = document.querySelector('.firefly-container');
        if (!container) return;
        for (let i = 0; i < num; i++) {
            const firefly = document.createElement('div');
            firefly.className = 'firefly';
            // 随机初始位置
            firefly.style.top = Math.random() * 90 + 'vh';
            firefly.style.left = Math.random() * 100 + 'vw';
            // 随机动画延迟和时长
            firefly.style.animationDelay = `${Math.random() * 8}s, ${Math.random() * 2}s`;
            firefly.style.animationDuration = `${6 + Math.random() * 6}s, 2s`;
            container.appendChild(firefly);
        }
    }
    createFireflies(8);

    // 云朵动画处理
    class CloudAnimationManager {
        constructor() {
            this.cloud = document.querySelector('.global-cloud');
            this.message = document.querySelector('.cloud-message');
            this.currentSize = 1;
            this.initCloud();
            this.setupEventListeners();
        }

        initCloud() {
            this.cloud.style.setProperty('--current-scale', '1');
            // 初始显示消息
            setTimeout(() => {
                this.message.classList.add('show');
            }, 1000);
        }

        setupEventListeners() {
            // 点击事件监听
            document.addEventListener('click', (e) => {
                this.growCloud();
            });

            // 监听手绘事件
            if (window.handDrawingManager) {
                window.handDrawingManager.onDrawingComplete = () => {
                    this.growCloud();
                };
            }

            // 监听语音识别事件
            document.getElementById('startVoiceBtn')?.addEventListener('click', () => {
                this.growCloud();
            });

            // 监听页面切换事件
            document.addEventListener('fullpage:afterLoad', () => {
                // 确保云朵和消息在页面切换时保持可见
                this.cloud.style.display = 'block';
                this.message.style.display = 'block';
            });
        }

        growCloud() {
            // 增加当前尺寸
            this.currentSize += 0.1;
            
            // 更新CSS变量以实现累积缩放
            this.cloud.style.setProperty('--current-scale', this.currentSize.toString());

            // 添加生长动画
            this.cloud.classList.add('growing');
            setTimeout(() => {
                this.cloud.classList.remove('growing');
            }, 500);

            // 如果达到特定大小，添加发光效果
            if (this.currentSize >= 1.5) {
                this.cloud.classList.add('glowing');
            }

            // 如果云朵变得太大，调整其位置
            if (this.currentSize > 3) {
                this.cloud.style.bottom = '50%';
                this.cloud.style.transform = `translate(-50%, 50%) scale(${this.currentSize})`;
                // 调整消息位置
                this.message.style.bottom = 'calc(50% - 40px)';
            } else {
                this.cloud.style.transform = `translateX(-50%) scale(${this.currentSize})`;
                // 重置消息位置
                this.message.style.bottom = '5px';
            }

            // 如果云朵变得非常大，增加其透明度
            if (this.currentSize > 5) {
                this.cloud.style.opacity = '0.6';
                this.message.style.opacity = '0.6';
            }

            // 显示消息动画
            this.message.classList.remove('show');
            void this.message.offsetWidth; // 触发重排
            this.message.classList.add('show');
        }
    }

    // 初始化云朵动画管理器
    window.cloudAnimationManager = new CloudAnimationManager();
}); 
class InteractiveArt {
    constructor() {
        // 获取用户选择
        const artSection = document.querySelector('[data-anchor="section4"]');
        this.currentEmotion = artSection.getAttribute('data-emotion') || '';
        this.personalityStyle = artSection.getAttribute('data-personality') || '';

        // 初始化Three.js
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('artCanvas'), 
            alpha: true,
            antialias: true 
        });
        this.shapes = [];
        this.brightness = 1.0;

        // 设置渲染器背景色以匹配情绪
        this.renderer.setClearColor(0x000000, 0);
        
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.createShapes();
        this.animate();
    }

    setupScene() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    setupCamera() {
        this.camera.position.z = 5;
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 1);
        this.scene.add(directionalLight);
    }

    createShapes() {
        // 根据性格选择创建不同的形状
        const isRational = this.personalityStyle === 'rational';
        const geometry = isRational ? 
            new THREE.BoxGeometry(1, 1, 1) : 
            new THREE.SphereGeometry(0.5, 32, 32);

        // 根据情绪选择颜色
        let color;
        switch(this.currentEmotion) {
            case 'happy':
                color = new THREE.Color(0x62FF8F);
                break;
            case 'sad':
                color = new THREE.Color(0x62B6FF);
                break;
            case 'angry':
                color = new THREE.Color(0xFF6262);
                break;
            case 'blank':
                color = new THREE.Color(0xFFD962);
                break;
            default:
                color = new THREE.Color(0xFFFFFF);
        }

        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });

        for(let i = 0; i < 50; i++) {
            const shape = new THREE.Mesh(geometry, material.clone());
            shape.position.set(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            shape.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            this.shapes.push(shape);
            this.scene.add(shape);
        }
    }

    updateBrightness(value) {
        this.brightness = value;
        this.shapes.forEach(shape => {
            shape.material.opacity = this.brightness;
        });
    }

    handleHandGesture(landmarks) {
        if (!landmarks || landmarks.length === 0) return;

        const palmPosition = landmarks[0];
        const scale = Math.min(Math.max(Math.abs(palmPosition.y - 0.5) * 2, 0.3), 2.0); // 限制缩放范围
        
        this.shapes.forEach(shape => {
            // 保持当前旋转
            const currentRotation = {
                x: shape.rotation.x,
                y: shape.rotation.y,
                z: shape.rotation.z
            };
            
            // 更新缩放，但保持最小值
            shape.scale.set(scale, scale, scale);
            
            // 根据手的位置移动形状，但限制移动范围
            const targetX = (palmPosition.x - 0.5) * 10;
            const targetY = (0.5 - palmPosition.y) * 10;
            const targetPosition = new THREE.Vector3(
                Math.min(Math.max(targetX, -5), 5),
                Math.min(Math.max(targetY, -5), 5),
                shape.position.z
            );
            
            // 使用lerp进行平滑移动
            shape.position.lerp(targetPosition, 0.1);
            
            // 保持旋转动画
            shape.rotation.set(
                currentRotation.x + 0.01,
                currentRotation.y + 0.01,
                currentRotation.z
            );
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // 添加一些动画效果
        this.shapes.forEach(shape => {
            shape.rotation.x += 0.01;
            shape.rotation.y += 0.01;
        });

        this.renderer.render(this.scene, this.camera);
    }

    setEmotion(emotion) {
        this.currentEmotion = emotion;
        this.updateShapesColor();
    }

    setPersonalityStyle(style) {
        this.personalityStyle = style;
        this.updateShapesGeometry();
    }

    updateShapesColor() {
        let color;
        switch(this.currentEmotion) {
            case 'happy':
                color = new THREE.Color(0xA4D03A);
                break;
            case 'sad':
                color = new THREE.Color(0x4B9FE1);
                break;
            case 'angry':
                color = new THREE.Color(0xFF4B4B);
                break;
            case 'blank':
                color = new THREE.Color(0xFFA726);
                break;
            default:
                color = new THREE.Color(0xFFFFFF);
        }

        this.shapes.forEach(shape => {
            shape.material.color = color;
        });
    }

    updateShapesGeometry() {
        const isRational = this.personalityStyle === 'rational';
        const geometry = isRational ? 
            new THREE.BoxGeometry(1, 1, 1) : 
            new THREE.SphereGeometry(0.5, 32, 32);

        this.shapes.forEach(shape => {
            shape.geometry.dispose();
            shape.geometry = geometry;
        });
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

class InteractionManager {
    constructor() {
        const artSection = document.querySelector('[data-anchor="section4"]');
        
        // 确保canvas容器具有正确的样式
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.style.background = 'transparent';
            canvasContainer.style.backdropFilter = 'blur(10px)';
        }

        this.art = new InteractiveArt();
        this.progressFill = document.querySelector('.final-progress .progress-fill');
        this.progressText = document.querySelector('.final-progress .progress-percentage');
        this.progress = 60;
        
        // 初始化交互
        this.setupFaceDetection();
        this.setupHandTracking();
        this.setupEventListeners();

        // 监听进度变化
        this.checkProgress();
    }

    checkProgress() {
        const checkInterval = setInterval(() => {
            if (this.progress >= 100) {
                clearInterval(checkInterval);
                this.showFinalArtwork();
            }
        }, 1000);
    }

    showFinalArtwork() {
        // 移动到最终展示页面
        fullpage_api.moveTo(5);
        
        // 初始化最终画布
        const finalCanvas = document.getElementById('finalArtCanvas');
        const finalVideo = document.getElementById('finalVideoInput');
        
        // 复制视频流
        if (document.getElementById('videoInput').srcObject) {
            finalVideo.srcObject = document.getElementById('videoInput').srcObject;
            finalVideo.play();
        }
        
        // 复制艺术效果
        const finalArt = new THREE.WebGLRenderer({
            canvas: finalCanvas,
            alpha: true,
            antialias: true
        });
        finalArt.setSize(finalCanvas.clientWidth, finalCanvas.clientHeight);
        
        // 复制当前场景
        const scene = this.art.scene.clone();
        const camera = this.art.camera.clone();
        
        // 渲染最终画面
        const animate = () => {
            requestAnimationFrame(animate);
            finalArt.render(scene, camera);
        };
        animate();

        // 设置拍照和按钮事件
        this.setupCaptureButton(finalCanvas, finalVideo, finalArt, scene, camera);
        this.setupFinalButtons();
    }

    setupCaptureButton(finalCanvas, finalVideo, finalArt, scene, camera) {
        const captureBtn = document.querySelector('.capture-btn');
        const retakeBtn = document.querySelector('.retake-btn');
        const saveBtn = document.querySelector('.save-btn');
        const shareBtn = document.querySelector('.share-btn');
        const artworkDisplay = document.querySelector('.artwork-display');
        const artworkPreview = document.querySelector('.artwork-preview');
        const capturedCanvas = document.getElementById('capturedCanvas');
        const overlay = document.querySelector('.capture-overlay');
        const countdown = document.querySelector('.countdown');

        if (captureBtn) {
            captureBtn.addEventListener('click', () => {
                // 显示倒计时
                overlay.style.display = 'flex';
                let count = 3;
                countdown.textContent = count;

                const countdownInterval = setInterval(() => {
                    count--;
                    if (count > 0) {
                        countdown.textContent = count;
                    } else {
                        clearInterval(countdownInterval);
                        overlay.style.display = 'none';
                        
                        // 拍照
                        this.capturePhoto(finalCanvas, finalVideo, finalArt, scene, camera, capturedCanvas);
                        
                        // 显示预览
                        artworkDisplay.style.display = 'none';
                        artworkPreview.style.display = 'block';
                        
                        // 启用保存和分享按钮
                        saveBtn.disabled = false;
                        shareBtn.disabled = false;
                    }
                }, 1000);
            });
        }

        if (retakeBtn) {
            retakeBtn.addEventListener('click', () => {
                artworkDisplay.style.display = 'block';
                artworkPreview.style.display = 'none';
                saveBtn.disabled = true;
                shareBtn.disabled = true;
            });
        }
    }

    capturePhoto(finalCanvas, finalVideo, finalArt, scene, camera, capturedCanvas) {
        // 设置捕获画布的尺寸
        const width = finalCanvas.width;
        const height = finalCanvas.height;
        capturedCanvas.width = width;
        capturedCanvas.height = height;

        // 获取画布上下文
        const ctx = capturedCanvas.getContext('2d');

        // 绘制视频
        ctx.drawImage(finalVideo, 0, 0, width, height);

        // 渲染3D场景
        finalArt.render(scene, camera);

        // 将3D场景叠加到视频上
        ctx.globalAlpha = 0.7; // 设置透明度
        ctx.drawImage(finalCanvas, 0, 0);
        ctx.globalAlpha = 1.0;

        // 添加滤镜效果
        ctx.filter = 'brightness(1.1) contrast(1.1)';
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
    }

    setupFinalButtons() {
        const saveBtn = document.querySelector('.save-btn');
        const shareBtn = document.querySelector('.share-btn');
        const restartBtn = document.querySelector('.restart-btn');
        const exitBtn = document.querySelector('.exit-btn');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const capturedCanvas = document.getElementById('capturedCanvas');
                const link = document.createElement('a');
                link.download = 'personality-fusion-artwork.png';
                link.href = capturedCanvas.toDataURL();
                link.click();
            });
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                try {
                    const capturedCanvas = document.getElementById('capturedCanvas');
                    const blob = await new Promise(resolve => capturedCanvas.toBlob(resolve));
                    const file = new File([blob], 'personality-fusion-artwork.png', { type: 'image/png' });
                    
                    if (navigator.share) {
                        await navigator.share({
                            title: '人格融合艺术作品',
                            text: '这是我与AI共同创造的艺术作品',
                            files: [file]
                        });
                    } else {
                        alert('您的浏览器不支持分享功能');
                    }
                } catch (error) {
                    console.error('分享失败:', error);
                }
            });
        }

        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                // 重置所有状态
                this.progress = 60;
                if (this.progressFill) this.progressFill.style.width = '60%';
                if (this.progressText) this.progressText.textContent = '60%';
                
                // 清除所有选中状态
                document.querySelectorAll('.emotion-card').forEach(card => {
                    card.classList.remove('clicked');
                });
                document.querySelectorAll('.personality-choice').forEach(choice => {
                    choice.classList.remove('selected');
                });
                
                // 移动到第一页
                fullpage_api.moveTo(1);
                
                // 重置进度条和文本
                const emotionProgress = document.querySelector('.emotions-content .progress-fill');
                const emotionProgressText = document.querySelector('.emotions-content .progress-percentage');
                const personalityProgress = document.querySelector('.personality-progress .progress-fill');
                const personalityProgressText = document.querySelector('.personality-progress .progress-percentage');
                
                if (emotionProgress) emotionProgress.style.width = '0%';
                if (emotionProgressText) emotionProgressText.textContent = '0%';
                if (personalityProgress) personalityProgress.style.width = '25%';
                if (personalityProgressText) personalityProgressText.textContent = '25%';
                
                // 禁用下一步按钮
                const emotionNextBtn = document.getElementById('emotionNextBtn');
                const personalityNextBtn = document.getElementById('personalityNextBtn');
                if (emotionNextBtn) emotionNextBtn.disabled = true;
                if (personalityNextBtn) personalityNextBtn.disabled = true;
            });
        }

        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                // 显示感谢信息
                const thankYouMessage = document.querySelector('.thank-you-message');
                if (thankYouMessage) {
                    thankYouMessage.style.display = 'block';
                    thankYouMessage.style.opacity = '1';
                }
                
                // 2秒后关闭窗口
                setTimeout(() => {
                    window.close();
                    // 如果window.close()不生效（大多数现代浏览器会阻止），则尝试其他方法
                    const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
                    if (isChrome) {
                        // Chrome中的替代方法
                        window.location.href = "about:blank";
                    } else {
                        // 其他浏览器中的替代方法
                        window.location.href = "about:blank";
                        window.history.go(-window.history.length);
                    }
                }, 2000);
            });
        }
    }

    async setupFaceDetection() {
        try {
            const model = await faceDetection.createDetector(faceDetection.SupportedModels.MediaPipeFaceDetector);
            const video = document.getElementById('videoInput');

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            facingMode: "user"
                        } 
                    });
                    
                    video.srcObject = stream;
                    video.onloadedmetadata = () => {
                        video.play();
                        console.log('Camera started successfully');
                    };

                    const detectFace = async () => {
                        try {
                            const faces = await model.estimateFaces(video);
                            if (faces.length > 0) {
                                const face = faces[0];
                                const brightness = face.probability ? face.probability : 0.5;
                                this.art.updateBrightness(brightness);
                                this.updateProgress('face', true);
                            }
                            requestAnimationFrame(detectFace);
                        } catch (error) {
                            console.error('Face detection error:', error);
                        }
                    };

                    video.addEventListener('play', () => {
                        detectFace();
                    });
                } catch (error) {
                    console.error('Camera access error:', error);
                }
            } else {
                console.error('getUserMedia is not supported');
            }
        } catch (error) {
            console.error('Face detection setup error:', error);
        }
    }

    async setupHandTracking() {
        try {
            const hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            hands.onResults((results) => {
                if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                    this.art.handleHandGesture(results.multiHandLandmarks[0]);
                    this.updateProgress('hand', true);
                }
            });

            const video = document.getElementById('videoInput');
            const camera = new Camera(video, {
                onFrame: async () => {
                    try {
                        await hands.send({image: video});
                    } catch (error) {
                        console.error('Hand tracking frame error:', error);
                    }
                },
                width: 1280,
                height: 720
            });

            try {
                await camera.start();
                console.log('Hand tracking camera started successfully');
            } catch (error) {
                console.error('Hand tracking camera start error:', error);
            }
        } catch (error) {
            console.error('Hand tracking setup error:', error);
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.art.resize());
    }

    updateProgress(interactionType, completed) {
        if (completed) {
            if (interactionType === 'face') {
                this.progress = Math.min(80, this.progress);
            } else if (interactionType === 'hand') {
                this.progress = Math.min(100, this.progress + 20);
            }

            this.progressFill.style.width = `${this.progress}%`;
            this.progressText.textContent = `${Math.round(this.progress)}%`;
        }
    }
}

// 等待DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否在第四个section
    const currentSection = document.querySelector('.section.active');
    if (currentSection && currentSection.getAttribute('data-anchor') === 'section4') {
        const manager = new InteractionManager();
    }
}); 
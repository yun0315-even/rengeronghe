class HandDrawingManager {
    constructor() {
        this.video = document.getElementById('input-video');
        this.canvas = document.getElementById('output-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.currentColor = '#ffffff';
        this.lineWidth = 5;
        this.hands = null;
        this.camera = null;
        this.currentFacingMode = 'user';
        this.points = []; // 存储绘制点
        this.smoothingFactor = 0.3; // 平滑因子
        this.paths = []; // 存储所有路径
        this.isPaused = false; // 是否暂停绘制
        this.frozenImage = null; // 存储定格后的图像
        
        this.init();
    }

    async init() {
        try {
            // 设置画布大小
            this.canvas.width = 640;
            this.canvas.height = 480;

            // 初始化MediaPipe Hands
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults(this.onResults.bind(this));

            // 初始化摄像头
            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    await this.hands.send({image: this.video});
                },
                width: 640,
                height: 480,
                facingMode: this.currentFacingMode
            });

            // 添加控制按钮事件监听
            document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
            document.getElementById('toggleCamera').addEventListener('click', () => this.toggleCamera());
            document.getElementById('saveImage').addEventListener('click', () => this.saveImage());

            // 开始摄像头
            await this.camera.start();
            console.log('Camera started successfully');
        } catch (error) {
            console.error('Error initializing hand tracking:', error);
        }
    }

    onResults(results) {
        // 清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制摄像头画面
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

        // 绘制所有已保存的路径
        this.drawAllPaths();

        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                // 获取所有手指的指尖位置
                const thumb = landmarks[4];
                const indexFinger = landmarks[8];
                const middleFinger = landmarks[12];
                const ringFinger = landmarks[16];
                const pinky = landmarks[20];

                // 计算所有手指之间的距离
                const distances = [
                    this.calculateDistance(thumb, indexFinger),
                    this.calculateDistance(thumb, middleFinger),
                    this.calculateDistance(thumb, ringFinger),
                    this.calculateDistance(thumb, pinky)
                ];

                // 检查是否所有手指都张开（距离大于阈值）
                const allFingersOpen = distances.every(distance => distance > 0.2);

                if (allFingersOpen && !this.isPaused) {
                    // 手掌张开，暂停绘制并保存图片
                    this.pauseDrawing();
                } else if (!allFingersOpen) {
                    // 手掌未完全张开，继续绘制
                    this.isPaused = false;
                    const x = indexFinger.x * this.canvas.width;
                    const y = indexFinger.y * this.canvas.height;

                    // 获取食指和拇指之间的距离
                    const distance = this.calculateDistance(indexFinger, thumb);

                    // 如果手指距离足够近，开始绘制
                    if (distance < 0.1) {
                        if (!this.isDrawing) {
                            this.isDrawing = true;
                            this.lastX = x;
                            this.lastY = y;
                            this.points = [{x, y}]; // 开始新的路径
                        }
                        this.points.push({x, y}); // 添加新的点
                        this.drawSmoothPath(); // 绘制平滑路径
                    } else {
                        if (this.isDrawing) {
                            this.isDrawing = false;
                            // 保存当前路径
                            if (this.points.length > 1) {
                                this.paths.push({
                                    points: [...this.points],
                                    color: this.currentColor,
                                    lineWidth: this.lineWidth
                                });
                            }
                            this.points = []; // 清空点数组
                        }
                    }
                }
            }
        }
    }

    calculateDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point1.x - point2.x, 2) + 
            Math.pow(point1.y - point2.y, 2)
        );
    }

    pauseDrawing() {
        if (!this.isPaused) {
            this.isPaused = true;
            this.isDrawing = false;
            
            // 保存当前路径
            if (this.points.length > 1) {
                this.paths.push({
                    points: [...this.points],
                    color: this.currentColor,
                    lineWidth: this.lineWidth
                });
            }
            this.points = [];

            // 保存图片
            this.saveImage();
            
            // 显示提示信息
            this.showMessage('绘制已暂停，图片已保存！');
        }
    }

    drawAllPaths() {
        // 绘制所有已保存的路径
        this.paths.forEach(path => {
            this.ctx.beginPath();
            this.ctx.moveTo(path.points[0].x, path.points[0].y);

            // 使用贝塞尔曲线绘制平滑路径
            for (let i = 1; i < path.points.length - 2; i++) {
                const xc = (path.points[i].x + path.points[i + 1].x) / 2;
                const yc = (path.points[i].y + path.points[i + 1].y) / 2;
                this.ctx.quadraticCurveTo(path.points[i].x, path.points[i].y, xc, yc);
            }

            // 处理最后两个点
            if (path.points.length > 2) {
                const lastPoint = path.points[path.points.length - 1];
                const secondLastPoint = path.points[path.points.length - 2];
                this.ctx.quadraticCurveTo(
                    secondLastPoint.x,
                    secondLastPoint.y,
                    lastPoint.x,
                    lastPoint.y
                );
            }

            // 设置绘制样式
            this.ctx.strokeStyle = path.color;
            this.ctx.lineWidth = path.lineWidth;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();

            // 添加发光效果
            this.ctx.shadowColor = path.color;
            this.ctx.shadowBlur = 10;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        });
    }

    drawSmoothPath() {
        if (this.points.length < 2) return;

        this.ctx.beginPath();
        this.ctx.moveTo(this.points[0].x, this.points[0].y);

        // 使用贝塞尔曲线绘制平滑路径
        for (let i = 1; i < this.points.length - 2; i++) {
            const xc = (this.points[i].x + this.points[i + 1].x) / 2;
            const yc = (this.points[i].y + this.points[i + 1].y) / 2;
            this.ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
        }

        // 处理最后两个点
        if (this.points.length > 2) {
            const lastPoint = this.points[this.points.length - 1];
            const secondLastPoint = this.points[this.points.length - 2];
            this.ctx.quadraticCurveTo(
                secondLastPoint.x,
                secondLastPoint.y,
                lastPoint.x,
                lastPoint.y
            );
        }

        // 设置绘制样式
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();

        // 添加发光效果
        this.ctx.shadowColor = this.currentColor;
        this.ctx.shadowBlur = 10;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    saveImage() {
        try {
            // 创建临时画布来保存当前状态
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');

            // 设置透明背景
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

            // 只绘制路径
            this.paths.forEach(path => {
                tempCtx.beginPath();
                tempCtx.moveTo(path.points[0].x, path.points[0].y);

                // 使用贝塞尔曲线绘制平滑路径
                for (let i = 1; i < path.points.length - 2; i++) {
                    const xc = (path.points[i].x + path.points[i + 1].x) / 2;
                    const yc = (path.points[i].y + path.points[i + 1].y) / 2;
                    tempCtx.quadraticCurveTo(path.points[i].x, path.points[i].y, xc, yc);
                }

                // 处理最后两个点
                if (path.points.length > 2) {
                    const lastPoint = path.points[path.points.length - 1];
                    const secondLastPoint = path.points[path.points.length - 2];
                    tempCtx.quadraticCurveTo(
                        secondLastPoint.x,
                        secondLastPoint.y,
                        lastPoint.x,
                        lastPoint.y
                    );
                }

                // 设置绘制样式
                tempCtx.strokeStyle = path.color;
                tempCtx.lineWidth = path.lineWidth;
                tempCtx.lineCap = 'round';
                tempCtx.lineJoin = 'round';
                tempCtx.stroke();

                // 添加发光效果
                tempCtx.shadowColor = path.color;
                tempCtx.shadowBlur = 10;
                tempCtx.stroke();
                tempCtx.shadowBlur = 0;
            });

            // 创建下载链接
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.download = `drawing_${timestamp}.png`;
            link.href = tempCanvas.toDataURL('image/png');
            link.click();

            // 显示提示信息
            this.showMessage('图片已保存！');
        } catch (error) {
            console.error('Error saving image:', error);
            this.showMessage('保存图片失败，请重试');
        }
    }

    showMessage(message) {
        // 创建消息元素
        const messageElement = document.createElement('div');
        messageElement.style.position = 'fixed';
        messageElement.style.top = '20px';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translateX(-50%)';
        messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        messageElement.style.color = 'white';
        messageElement.style.padding = '10px 20px';
        messageElement.style.borderRadius = '5px';
        messageElement.style.zIndex = '1000';
        messageElement.textContent = message;

        // 添加到页面
        document.body.appendChild(messageElement);

        // 3秒后移除
        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.points = []; // 清空点数组
        this.paths = []; // 清空所有路径
        this.isPaused = false; // 重置暂停状态
        this.frozenImage = null;
    }

    async toggleCamera() {
        try {
            this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
            await this.camera.stop();
            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    await this.hands.send({image: this.video});
                },
                width: 640,
                height: 480,
                facingMode: this.currentFacingMode
            });
            await this.camera.start();
        } catch (error) {
            console.error('Error toggling camera:', error);
        }
    }

    setColor(emotion) {
        const colorMap = {
            'happy': '#FFD700', // 金色
            'sad': '#4169E1',   // 蓝色
            'angry': '#FF4500', // 红色
            'blank': '#808080'  // 灰色
        };
        this.currentColor = colorMap[emotion] || '#ffffff';
    }

    freezePath() {
        // 创建临时画布来保存当前状态
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // 将当前画布内容复制到临时画布
        tempCtx.drawImage(this.canvas, 0, 0);

        // 保存定格图像
        this.frozenImage = tempCanvas;
        this.isPathFrozen = true;

        // 创建下载链接
        const link = document.createElement('a');
        link.download = `drawing_${new Date().getTime()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();

        // 显示提示信息
        this.showMessage('路径已定格并保存！');
    }
} 
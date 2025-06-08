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
        this.frozenImage = null; // 存储定格后的图像123
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
            console.log('绘制已暂停，图片已保存！');
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

    async saveImage() {
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

            // 上传图片到服务器
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            tempCanvas.toBlob(async (blob) => {
                if (!blob) {
                    console.log('图片生成失败');
                    return;
                }
                const file = new File([blob], `drawing_${timestamp}.png`, { type: 'image/png' });
                try {
                    // 动态引入uploadFile
                    const { uploadFile } = await import('./js/upload.js');
                    const res = await uploadFile(file);
                    // 假设返回res.data.url或res.url
                    const url = res.data?.url || res.url || '';
                    this.uploadedImageUrl = url;
                    if (url) {
                        console.log('图片已上传，地址：' + url);
                        if (window.onHandDrawingSaved) {
                            window.onHandDrawingSaved({ url });
                        }
                        // 调用千问3图片解析，生成即梦关键词
                        try {
                            const { default: qianwen3ImageParse } = await import('./js/qianwen3.js');
                            const keywords = await qianwen3ImageParse(url, '请根据用户随机绘制的路径进行联想与想象，将路径联想为一个与其相似的动物或植物或其他物体，并将路径演化想象为一个具象的场景，随后根据生成的场景生成一段即梦AI关键词');
                            this.dreamKeywords = keywords;
                            console.log('即梦关键词：' + keywords);
                            // 调用即梦API，生成视频
                            try {
                                console.log('[即梦API] 提交任务参数:', { image_urls: [url], prompt: keywords });
                                const { taskId, req_key } = await this.submitJimengTask({
                                    image_urls: [url],
                                    prompt: keywords
                                });
                                console.log('[即梦API] 任务已提交，task_id:', taskId, 'req_key:', req_key);
                                const videoUrl = await this.queryJimengTaskUntilDone({ req_key, task_id: taskId });
                                console.log('[即梦API] 视频生成成功，地址:', videoUrl);
                                // ===== 操作已有元素 =====
                                const msg3 = document.getElementById('msg3');
                                if (msg3) msg3.textContent = '完成融合';
                                const fusionViewBtn = document.getElementById('fusionViewBtn');
                                if (fusionViewBtn) {
                                    fusionViewBtn.style.display = '';
                                    fusionViewBtn.onclick = () => window.open(videoUrl, '_blank');
                                }
                            } catch (e) {
                                console.error('[即梦API] 失败', e);
                            }
                        } catch (e) {
                            console.error('千问3解析失败', e);
                        }
                    } else {
                        console.log('图片上传成功，但未返回地址');
                    }
                } catch (e) {
                    console.error('上传失败', e);
                }
            }, 'image/png');
        } catch (error) {
            console.log('保存图片失败，请重试');
            console.error('Error saving image:', error);
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
        console.log('路径已定格并保存！');
    }

    // ======= 新增方法：提交任务 =======
    async submitJimengTask({ image_urls, prompt, req_key = 'jimeng_vgfm_i2v_l20' }) {
        const JimengApi = (await import('./js/jimengApi.js')).default || window.JimengApi;
        console.log('[submitJimengTask] doImage2Video参数:', { req_key, image_urls, prompt });
        const res = await JimengApi.doImage2Video({ req_key, image_urls, prompt });
        console.log('[submitJimengTask] doImage2Video返回:', res);
        let data;
        try {
            data = JSON.parse(res.body);
            console.log('[submitJimengTask] 解析body:', data);
        } catch (e) {
            console.error('[submitJimengTask] 解析body失败', e, res.body);
        }
        const taskId = data?.TaskId || data?.data?.task_id;
        if (!taskId) throw new Error('未获取到task_id');
        return { taskId, req_key };
    }

    // ======= 新增方法：轮询查询任务 =======
    async queryJimengTaskUntilDone({ req_key, task_id, interval = 10000, maxTry = 60 }) {
        const JimengApi = (await import('./js/jimengApi.js')).default || window.JimengApi;
        for (let i = 0; i < maxTry; i++) {
            console.log(`[queryJimengTaskUntilDone] 第${i+1}次查询, req_key:`, req_key, 'task_id:', task_id);
            const res = await JimengApi.queryTaskProgress({ req_key, task_id });
            console.log('[queryJimengTaskUntilDone] queryTaskProgress返回:', res);
            let data;
            try {
                data = JSON.parse(res.body);
                console.log('[queryJimengTaskUntilDone] 解析body:', data);
            } catch (e) {
                console.error('[queryJimengTaskUntilDone] 解析body失败', e, res.body);
            }
            if (data?.data?.status === 'done' && data?.data?.video_url) {
                console.log('[queryJimengTaskUntilDone] 视频已生成:', data.data.video_url);
                return data.data.video_url;
            }
            await new Promise(r => setTimeout(r, interval));
        }
        throw new Error('视频生成超时');
    }
} 
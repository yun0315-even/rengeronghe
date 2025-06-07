class ParticleSystem {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseSpeed = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.currentEmotion = null;

        // 设置画布样式
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';

        document.body.appendChild(this.canvas);
        this.resize();
        this.init();
        this.bindEvents();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        // 创建初始粒子
        for (let i = 0; i < 100; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle(x, y, isMouseParticle = false) {
        const colors = {
            default: ['#FFB6C1', '#87CEEB', '#98FB98'],
            happy: ['#A4D03A', '#B5E150', '#98C32D'],
            sad: ['#4B9FE1', '#6BB5E8', '#3989C9'],
            angry: ['#FF4B4B', '#FF6B6B', '#FF2B2B'],
            blank: ['#FFA726', '#FFB74D', '#FF9800']
        };

        const colorSet = this.currentEmotion ? colors[this.currentEmotion] : colors.default;
        
        return {
            x: x || Math.random() * this.canvas.width,
            y: y || Math.random() * this.canvas.height,
            size: isMouseParticle ? Math.random() * 4 + 2 : Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 2,
            speedY: (Math.random() - 0.5) * 2,
            color: colorSet[Math.floor(Math.random() * colorSet.length)],
            alpha: Math.random() * 0.5 + 0.5,
            life: isMouseParticle ? 50 : 150,
            maxLife: isMouseParticle ? 50 : 150,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02
        };
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        
        window.addEventListener('mousemove', (e) => {
            // 计算鼠标速度
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
            
            this.lastMouseX = this.mouseX;
            this.lastMouseY = this.mouseY;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            // 根据鼠标速度创建粒子
            const particleCount = Math.floor(this.mouseSpeed / 10) + 1;
            for (let i = 0; i < particleCount; i++) {
                this.particles.push(this.createParticle(this.mouseX, this.mouseY, true));
            }
        });

        // 监听情绪变化
        document.addEventListener('emotionChange', (e) => {
            this.currentEmotion = e.detail.emotion;
        });
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // 更新位置
            p.x += p.speedX;
            p.y += p.speedY;
            p.rotation += p.rotationSpeed;

            // 鼠标吸引力
            const dx = this.mouseX - p.x;
            const dy = this.mouseY - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 200) {
                const force = (200 - distance) / 200;
                p.speedX += (dx / distance) * force * 0.2;
                p.speedY += (dy / distance) * force * 0.2;
            }

            // 限制速度
            const speed = Math.sqrt(p.speedX * p.speedX + p.speedY * p.speedY);
            if (speed > 5) {
                p.speedX = (p.speedX / speed) * 5;
                p.speedY = (p.speedY / speed) * 5;
            }

            // 更新生命周期
            p.life--;
            p.alpha = p.life / p.maxLife;

            // 移除死亡粒子
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            // 边界检查
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
        }

        // 保持粒子数量
        while (this.particles.length < 100) {
            this.particles.push(this.createParticle());
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            
            // 绘制发光效果
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
            gradient.addColorStop(0, p.color);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 绘制核心
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// 初始化粒子系统
document.addEventListener('DOMContentLoaded', () => {
    const particleSystem = new ParticleSystem();
}); 
class SoundEffectsManager {
    constructor() {
        this.sounds = {
            click: new Audio('assets/sounds/click.mp3'),
            hover: new Audio('assets/sounds/hover.mp3'),
            select: new Audio('assets/sounds/select.mp3'),
            success: new Audio('assets/sounds/success.mp3')
        };

        // 设置每个音效的默认音量和最大音量
        this.defaultVolumes = {
            click: 0.2,
            hover: 0.1,
            select: 0.3,
            success: 0.4
        };

        // 初始化音量
        Object.entries(this.sounds).forEach(([name, sound]) => {
            sound.volume = this.defaultVolumes[name];
        });

        // 预加载所有音效
        this.preloadSounds();

        // 添加调试信息
        console.log('SoundEffectsManager initialized');

        // 防止音效重叠的计时器
        this.lastPlayTime = {};
        this.minPlayInterval = 50; // 最小播放间隔（毫秒）
    }

    preloadSounds() {
        Object.entries(this.sounds).forEach(([name, sound]) => {
            sound.load();
            sound.addEventListener('error', (e) => {
                console.warn(`Failed to load sound: ${name}`, e);
            });
            // 添加结束事件监听器
            sound.addEventListener('ended', () => {
                sound.currentTime = 0;
            });
        });
    }

    play(soundName) {
        const sound = this.sounds[soundName];
        if (!sound) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }

        const now = Date.now();
        if (now - (this.lastPlayTime[soundName] || 0) < this.minPlayInterval) {
            return; // 忽略过于频繁的播放请求
        }

        // 更新最后播放时间
        this.lastPlayTime[soundName] = now;

        // 如果音效正在播放，重置它
        if (!sound.paused && sound.currentTime > 0) {
            sound.currentTime = 0;
        }

        // 播放音效
        sound.play().catch(error => {
            console.warn(`Failed to play sound: ${soundName}`, error);
        });
    }

    // 调整特定音效的音量
    setVolume(soundName, volume) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.volume = Math.max(0, Math.min(1, volume));
        }
    }

    // 调整所有音效的音量
    setMasterVolume(volume) {
        Object.entries(this.sounds).forEach(([name, sound]) => {
            sound.volume = Math.max(0, Math.min(1, volume * this.defaultVolumes[name]));
        });
    }

    // 暂时禁用所有音效
    mute() {
        Object.values(this.sounds).forEach(sound => {
            sound.muted = true;
        });
    }

    // 恢复所有音效
    unmute() {
        Object.values(this.sounds).forEach(sound => {
            sound.muted = false;
        });
    }
}

// 创建全局实例并确保在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.soundEffects = new SoundEffectsManager();
    console.log('Sound effects system ready');
}); 
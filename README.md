# 人格融合

## 技术与框架

- 原生 JavaScript，无主流前端框架
- 3D 渲染：Three.js（CDN）
- 全屏滚动：fullPage.js（CDN）
- 手势识别：MediaPipe Hands（CDN）
- AI 能力：
  - 千问3图片解析（阿里云 DashScope API）
  - DeepSeek Chat（deepseek API，带本地兜底AI）
- 动画与交互：自定义 JS 动画（音乐符号、性格符号、粒子系统等）
- 样式：CSS3，部分字体和图标通过 Google Fonts、Font Awesome、justfont CDN 引入
- 音效：原生 Audio API，自定义音效管理
- 多媒体：视频背景、音频播放

## 主要依赖（CDN/外部库）

- [Three.js](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js)
- [fullPage.js](https://cdnjs.cloudflare.com/ajax/libs/fullPage.js/4.0.20/fullpage.min.js)
- [MediaPipe Hands](https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js)
- [Font Awesome](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css)
- [Google Fonts](https://fonts.googleapis.com)
- 其他自定义脚本：`handDrawing.js`、`art.js`、`deepseek_chat.js`、`qianwen3.js`、`particles.js`、`js/music-animation.js`、`js/personality-animation.js`、`js/sound-effects.js`

## 运行/启动方式

1. **本地运行**
   - 直接用浏览器打开 `index.html` 即可体验全部功能（建议使用 Chrome/Edge 等现代浏览器）。
   - 若涉及本地 API Key（如 deepseek/千问3），请在相关 JS 文件中配置好密钥。
   - 若需测试千问3图片解析，可用 `test_qianwen3.html`。

2. **本地服务器（推荐）**
   - 推荐用 VSCode Live Server、http-server、Nginx 等本地服务器运行，避免部分浏览器安全限制导致的资源加载失败。
   - 例如：
     ```
     npx http-server .
     ```
     或
     ```
     python -m http.server
     ```
   - 然后浏览器访问 `http://localhost:8080`（端口号视实际情况而定）。

3. **注意事项**
   - 需联网以加载 CDN 依赖和远程 API。
   - 若需自定义音效、图片、视频等资源，请将文件放在 `assets/`、`images/`、`sounds/` 等目录下并在代码中引用。
   - 若需体验 AI 相关功能，需有效的 API Key。 
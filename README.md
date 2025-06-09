# 人格融合（云心共绘）

## 项目简介
通过手势识别、情绪选择与 AI 解析，融合用户情绪与个性，生成专属视频与动画，带来沉浸式多媒体互动体验。

## 主要功能
- 情绪与性格选择：多种情绪和性格标签，影响后续交互与动画
- 手势绘画：MediaPipe Hands 实时识别手势，在画布上绘制心情图案
- AI 解析与视频生成：
  - 千问3图片解析，将手绘图案转为梦境关键词
  - 即梦API，根据关键词生成专属视频
  - DeepSeek Chat，AI 聊天与互动，支持本地兜底
- 多媒体交互：背景音乐、音效、视频背景、粒子动画等
- 资源自定义：支持自定义音效、图片、视频等资源

## 技术架构
- 前端：原生 JavaScript，无主流前端框架
- 3D 渲染：Three.js（CDN）
- 全屏滚动：fullPage.js（CDN）
- 手势识别：MediaPipe Hands（CDN）
- AI 能力：
  - 千问3图片解析（阿里云 DashScope API）
  - DeepSeek Chat（deepseek API，带本地兜底AI）
- 动画与交互：自定义 JS 动画（音乐符号、性格符号、粒子系统等）
- 样式：CSS3，Google Fonts、Font Awesome
- 音效：原生 Audio API
- 多媒体：视频背景、音频播放

## 目录结构
- `index.html`：主页面
- `script.js`：主逻辑脚本
- `handDrawing.js`：手势绘画与图片保存、AI 解析、视频生成
- `art.js`：交互与动画管理
- `deepseek_chat.js`：AI 聊天功能
- `assets/`、`images/`、`sounds/`：多媒体资源目录
- 其他测试/演示页面：`test_qianwen3.html`、`jimengDemoTest.html`、`test-upload.html`

## 运行方式
1. **本地运行**
   - 直接用浏览器打开 `index.html` 即可体验全部功能（建议使用 Chrome/Edge 等现代浏览器）。
   - 若涉及本地 API Key（如 deepseek/千问3），请在相关 JS 文件中配置好密钥。
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

## 注意事项
- 需联网以加载 CDN 依赖和远程 API。
- 若需自定义音效、图片、视频等资源，请将文件放在 `assets/`、`images/`、`sounds/` 等目录下并在代码中引用。
- 若需体验 AI 相关功能，需有效的 API Key。

## 联系与反馈
如有建议或问题，请提交 issue 或联系开发者。 
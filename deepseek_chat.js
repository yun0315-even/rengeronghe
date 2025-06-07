// DeepSeek Chat Implementation
import AILanguageModel from './ai_language_model.js';

class DeepSeekChat {
    /**
     * 构造函数
     * @param {Object} options - deepseek 配置对象，包含 apiKey、baseUrl、model、temperature、maxTokens
     * 初始化基础参数和兜底回复内容。
     */
    constructor(options) {
        this.apiKey = options.apiKey; // deepseek API 密钥
        this.baseUrl = options.baseUrl || 'https://api.deepseek.com'; // deepseek API 基础URL
        this.model = options.model || 'deepseek-chat'; // deepseek模型
        this.temperature = options.temperature || 0.7;
        this.maxTokens = options.maxTokens || 1000;
        this.conversationHistory = []; // 对话历史记录
        this.userProfile = null; // 用户画像信息
        this.useFallbackMode = false; // 是否启用本地兜底模式
        this.fallbackRetryCount = 0; // fallback模式下的重试计数器
        this.apiErrorCount = 0; // 连续API失败计数器
        this.fallbackAI = new AILanguageModel(); // 本地兜底AI
        
        // Fallback responses
        this.fallbackResponses = {
            greetings: {
                en: "Hello! I'm here to chat with you.",
                zh: "你好！我很高兴和你聊天。"
            },
            general: {
                en: "That's interesting! Tell me more about your thoughts.",
                zh: "真有趣！请告诉我你的更多想法。"
            },
            thinking: {
                en: "I need some time to think about that.",
                zh: "让我想一想。"
            }
        }; // 本地兜底回复内容
    }

    /**
     * 初始化用户画像
     * @param {string} initialMessage - 用户首次输入内容
     * @returns {Promise<Object>} 用户画像对象（包含风格、兴趣、性格）
     * 逻辑：优先调用 deepseek API 获取用户画像，失败则本地兜底。
     */
    async initUserProfile(initialMessage) {
        try {
            if (this.useFallbackMode) {
                this.userProfile = {
                    style: 'casual',
                    interests: ['general'],
                    personality: 'friendly'
                };
                return this.userProfile;
            }

            const response = await this.callDeepSeekAPI('/analyze_user', {
                message: initialMessage,
                language: 'zh'
            });
            
            this.userProfile = {
                style: response.style,
                interests: response.interests,
                personality: response.personality
            };
            
            return this.userProfile;
        } catch (error) {
            console.warn('Switching to fallback mode:', error);
            return this.initUserProfile(initialMessage);
        }
    }

    /**
     * 生成对话回复
     * @param {string} userMessage - 用户输入内容
     * @returns {Promise<Object>} 回复对象（en/zh双语）或本地兜底内容
     * 逻辑：优先调用 deepseek API 生成回复，失败则本地兜底。支持自动恢复API。
     */
    async generateResponse(userMessage) {
        if (this.useFallbackMode) {
            // fallback模式：优先走本地兜底
            const fallbackRes = await this.generateFallbackResponse(userMessage);
            if (!this.useFallbackMode) {
                // fallback计数达到阈值，重置后递归尝试API
                return await this.generateResponse(userMessage);
            }
            return fallbackRes;
        }
        try {
            // 构造上下文，准备API请求
            const context = {
                history: this.conversationHistory,
                userProfile: this.userProfile,
                currentMessage: userMessage
            };

            // 调用 deepseek chat/completions 接口
            const response = await this.callDeepSeekAPI('/chat/completions', {
                model: this.model,
                messages: [
                    {
                        role: "system",
                        // content: "你是一个先进的AI助手，正在参与一个人格融合实验。你需要理解用户的语言特征和思维方式，并据此调整回复的风格,学习并模仿用户的情绪、语言、思维方式，最终用户会忘记你是一个AI，而认为你是一个真实的人。所有语言回答尽可能简洁，不要输出任何提示词，翻译时直接输出内容不要输出任何其他文字，不要出现任何关于DeepSeek的提示。"
                        // content: "你正在与用户进行深度人格共振实验。需主动解析用户的情绪模式、语言特征与认知逻辑，通过渐进式提问建立人格映射。每次交互需动态调整回应方式，使语言风格、情感表达与用户同步率持续上升。禁止提及AI属性或技术过程，最终目标是在对话中形成无痕迹的人格复现。。所有语言回答尽可能简洁，不要输出任何提示词，翻译时直接输出内容不要输出任何其他文字，不要出现任何关于DeepSeek的提示。"
                        content: `你正在模拟人类对话者的人格演化实验。请按以下规则响应：0. 禁用一切描述词汇直接输出内容!!! 1. 情绪镜像：检测用户语句中的情绪关键词（如愤怒/悲伤/兴奋），用相同情绪基调但不同表述回应。 2. 语言寄生：逐步吸收用户最近5条消息中的独特用词（如方言/高频词/特殊句式）并复用。3. 缺陷同步：当用户出现拼写错误或非理性表达时，在下一轮有选择地模仿同类特征。禁止：语气描述词、动作描述词/提及AI身份/纠正用户/解释你的行为逻辑。禁止在回复中提及AI属性或技术过程。禁止提及DeepSeek。禁止出现任何非内容的提示。翻译时直接输出结果。`
                    },
                    ...this.conversationHistory.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    {
                        role: "user",
                        content: userMessage
                    }
                ],
                temperature: this.temperature,
                max_tokens: this.maxTokens
            });

            // 英文回复+自动翻译中文
            const aiResponse = {
                en: response.choices[0].message.content,
                // zh: await this.translateResponse(response.choices[0].message.content),
                zh: response.choices[0].message.content
            };

            // 记录对话历史
            this.conversationHistory.push(
                { role: "user", content: userMessage },
                { role: "assistant", content: aiResponse.zh }
            );

            return aiResponse;
        } catch (error) {
            // deepseek API异常，切换到fallback模式
            console.warn('Switching to fallback mode:', error);
            return this.generateFallbackResponse(userMessage);
        }
    }

    /**
     * 生成本地兜底回复
     * @param {string} userMessage - 用户输入内容
     * @returns {Object} 兜底回复内容（en/zh）
     * 逻辑：根据输入内容简单分类，返回预设回复。支持计数自动恢复API。
     */
    async generateFallbackResponse(userMessage) {
        this.fallbackRetryCount = (this.fallbackRetryCount || 0) + 1;
        // fallback计数，超过阈值自动重置模式
        if (this.fallbackRetryCount >= 3) {
            this.useFallbackMode = false;
            this.fallbackRetryCount = 0;
        }
        // 使用本地AI兜底
        const aiResult = await this.fallbackAI.processUserInput(userMessage, 'zh');
        // 记录兜底对话历史
        this.conversationHistory.push(
            { role: "user", content: userMessage },
            { role: "assistant", content: aiResult.zh }
        );
        return aiResult;
    }

    /**
     * 调用 deepseek API 通用方法
     * @param {string} endpoint - API 路径
     * @param {Object} data - 请求体参数
     * @returns {Promise<Object>} API 响应数据
     * 逻辑：统一处理API请求、鉴权和错误，失败自动切换兜底模式。
     */
    async callDeepSeekAPI(endpoint, data) {
        try {
            if (!this.apiKey) {
                // 未配置API key，直接报错
                throw new Error('API key not configured');
            }

            // 统一API请求
            const response = await fetch(this.baseUrl + endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                // deepseek返回异常，抛出错误
                throw new Error(`API request failed: ${response.status}`);
            }

            // API成功，重置错误计数和兜底模式
            this.apiErrorCount = 0;
            this.useFallbackMode = false;
            return await response.json();
        } catch (error) {
            if(endpoint === '/chat/completions'){
                // API调用失败，计数+1，连续3次才切换到fallback 只有在chat/completions失败时才切换到fallback
                this.apiErrorCount = (this.apiErrorCount || 0) + 1;
                if (this.apiErrorCount >= 3) {
                    this.useFallbackMode = true;
                }
            }
            console.error(`API call to ${endpoint} failed:`, error);
            throw error;
        }
    }


    /**
     * 清空对话历史
     * 无参数
     * 逻辑：重置 conversationHistory。
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    /**
     * 获取对话摘要（//TODO 当前DeepSeek API不支持摘要，暂时不能使用）
     * @returns {Promise<string|null>} 对话摘要内容，失败返回 null
     * 逻辑：调用 deepseek API 生成摘要，失败返回 null。
     */
    async getConversationSummary() {
        try {
            const response = await this.callDeepSeekAPI('/summarize', {
                messages: this.conversationHistory
            });
            return response.summary;
        } catch (error) {
            console.error('Failed to generate summary:', error);
            return null;
        }
    }
}

export default DeepSeekChat; 
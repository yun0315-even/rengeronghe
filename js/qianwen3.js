/**
 * 用于请求千问3图片解析
 * @param {string} imageUrl - 图片URL
 * @param {string} [question='图中描绘的是什么景象?'] - 问题文本（可选）
 * @returns {Promise<string>} - 解析内容（字符串）
 */
async function qianwen3ImageParse(imageUrl, question = '图中描绘的是什么景象?') {
    const apiKey = 'sk-5ec7f35644e64c3d922e01c8e8f51f2a';
    const url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };
    const body = {
        model: 'qwen-vl-max',
        messages: [
            {
                role: 'system',
                content: [
                    { type: 'text', text: 'You are a helpful assistant.' }
                ]
            },
            {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: imageUrl } },
                    { type: 'text', text: question }
                ]
            }
        ]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${await response.text()}`);
    }
    const data = await response.json();
    // 直接返回解析内容（字符串）
    return data.choices?.[0]?.message?.content || '';
}

export default qianwen3ImageParse;

// 测试代码，仅在直接运行本文件时执行
defineTest();

async function defineTest() {
  if (typeof require !== 'undefined' && require.main === module) {
    const testImageUrl = 'https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20241022/emyrja/dog_and_girl.jpeg';
    try {
      const result = await qianwen3ImageParse(testImageUrl);
      console.log('解析结果:', result);
    } catch (e) {
      console.error('接口调用失败:', e);
    }
  }
} 
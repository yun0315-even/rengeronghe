/**
 * 上传文件到指定OSS
 * @param {File} file 需要上传的文件对象
 * @returns {Promise<Object>} 响应数据
 */
export async function uploadFile(file) {
  const url = 'https://yxgh.rundasoft.cn/api/platform/screen/upload';
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9'
    },
    credentials: 'include'
  });
  return await res.json();
} 
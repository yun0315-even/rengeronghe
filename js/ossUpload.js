// 阿里云OSS上传工具，内置参数，支持图片上传
// 需填写你的OSS配置
const OSS_CONFIG = {
  region: 'oss-cn-beijing',
  accessKeyId: 'LTAI5tJPADRoSBqgnow3YU6B',
  accessKeySecret: 'eAOVzE0jZOY63no7eLt1ExUXIVgReF',
  bucket: 'sven-market',
  // 可选：自定义endpoint
  endpoint: 'https://oss-cn-beijing.aliyuncs.com',
};

// 生成ISO8601格式时间
function getISOTime() {
  return new Date(new Date().getTime() + 5 * 60 * 1000).toISOString();
}

// 生成policy和签名
function getPolicyAndSignature() {
  const policyText = {
    expiration: getISOTime(),
    conditions: [
      ['content-length-range', 0, 10485760], // 最大10MB
    ],
  };
  const policyBase64 = btoa(JSON.stringify(policyText));
  // 签名需后端生成，这里仅做演示
  // 实际项目中请勿在前端暴露AccessKeySecret
  const signature = CryptoJS.enc.Base64.stringify(
    CryptoJS.HmacSHA1(policyBase64, OSS_CONFIG.accessKeySecret)
  );
  return { policy: policyBase64, signature };
}

// 上传图片到OSS
function uploadToOSS(file, onProgress, onSuccess, onError) {
  const { policy, signature } = getPolicyAndSignature();
  const formData = new FormData();
  const filename = 'upload/' + Date.now() + '_' + file.name;
  formData.append('key', filename);
  formData.append('OSSAccessKeyId', OSS_CONFIG.accessKeyId);
  formData.append('policy', policy);
  formData.append('Signature', signature);
  formData.append('success_action_status', '200');
  formData.append('file', file);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', OSS_CONFIG.endpoint, true);
  xhr.upload.onprogress = function (e) {
    if (onProgress && e.lengthComputable) {
      onProgress(Math.round((e.loaded / e.total) * 100));
    }
  };
  xhr.onload = function () {
    if (xhr.status === 200) {
      onSuccess && onSuccess(`https://${OSS_CONFIG.bucket}.oss-cn-beijing.aliyuncs.com/${filename}`);
    } else {
      onError && onError(xhr.responseText);
    }
  };
  xhr.onerror = function () {
    onError && onError('上传失败');
  };
  xhr.send(formData);
}

// 依赖CryptoJS库，需在html中引入
// window.uploadToOSS = uploadToOSS;
export { uploadToOSS }; 
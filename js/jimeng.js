/**
 * @function submitImageToVideoTask
 * @description 图生视频API，提交图片生成视频任务
 * @param {Object} options - 参数对象
 * @param {string[]} [options.image_urls] - 图片链接数组，二选一
 * @param {string[]} [options.binary_data_base64] - 图片Base64数组，二选一
 * @param {string} [options.prompt] - 提示词
 * @param {number} [options.seed] - 随机种子
 * @param {string} options.aspect_ratio - 图片比例，必填
 * @param {string} options.ak - Access Key
 * @param {string} options.sk - Secret Key
 * @returns {Promise<Object>} 返回Promise，resolve为API响应
 */
function submitImageToVideoTask({ image_urls, binary_data_base64, prompt, seed, aspect_ratio, ak, sk }) {
    if (!aspect_ratio) aspect_ratio = "4:3";
    if ((!image_urls || image_urls.length === 0) && (!binary_data_base64 || binary_data_base64.length === 0)) {
      throw new Error('image_urls和binary_data_base64必须二选一');
    }
    const method = 'POST';
    const host = 'visual.volcengineapi.com';
    const uri = '/';
    const query = 'Action=CVSync2AsyncSubmitTask&Version=2022-08-31';
    const url = `https://${host}?${query}`;
    const payload = JSON.stringify({
      req_key: "jimeng_vgfm_i2v_l20",
      aspect_ratio,
      ...(image_urls ? { image_urls } : {}),
      ...(binary_data_base64 ? { binary_data_base64 } : {}),
      ...(prompt ? { prompt } : {}),
      ...(typeof seed === 'number' ? { seed } : {})
    });
    const xDate = getXDate();
    const shortDate = getShortDate();
    const headers = {
      'content-type': 'application/json',
      'host': host,
      'x-date': xDate
    };
    const signedHeaders = ['content-type', 'host', 'x-date'];
    const canonicalRequest = buildCanonicalRequest({
      method,
      uri,
      query,
      headers,
      signedHeaders,
      payload
    });
    let authorization = '';
    if (ak && sk) {
      authorization = genVolcAuthorization({
        ak,
        sk,
        region: 'cn-north-1',
        service: 'cv',
        shortDate,
        canonicalRequest,
        signedHeadersStr: signedHeaders.join(';')
      });
      headers['authorization'] = authorization;
    }
    return fetch(url, {
      method: 'POST',
      headers,
      body: payload
    }).then(res => res.json());
}

/**
 * @function queryImageToVideoTask
 * @description 查询图生视频任务进度和结果
 * @param {Object} options - 参数对象
 * @param {string} options.req_key - 服务标识，必填
 * @param {string} options.task_id - 任务ID，必填
 * @param {string} options.ak - Access Key
 * @param {string} options.sk - Secret Key
 * @returns {Promise<Object>} 返回Promise，resolve为API响应
 */
function queryImageToVideoTask({ task_id, ak, sk }) {
    if (!task_id) throw new Error('task_id为必填项');
    const method = 'POST';
    const host = 'visual.volcengineapi.com';
    const uri = '/';
    const query = 'Action=CVSync2AsyncGetResult&Version=2022-08-31';
    const url = `https://${host}?${query}`;
    const payload = JSON.stringify({
      req_key: "jimeng_vgfm_i2v_l20",
      task_id
    });
    const xDate = getXDate();
    const shortDate = getShortDate();
    const headers = {
      'content-type': 'application/json',
      'host': host,
      'x-date': xDate
    };
    const signedHeaders = ['content-type', 'host', 'x-date'];
    const canonicalRequest = buildCanonicalRequest({
      method,
      uri,
      query,
      headers,
      signedHeaders,
      payload
    });
    let authorization = '';
    if (ak && sk) {
      authorization = genVolcAuthorization({
        ak,
        sk,
        region: 'cn-north-1',
        service: 'cv',
        shortDate,
        canonicalRequest,
        signedHeadersStr: signedHeaders.join(';')
      });
      headers['authorization'] = authorization;
    }
    return fetch(url, {
      method: 'POST',
      headers,
      body: payload
    }).then(res => res.json());
}

/**
 * @function submitAndWaitForVideoUrl
 * @description 提交图生视频任务并自动轮询，直到成功返回视频播放地址
 * @param {Object} options - 参数对象，同submitImageToVideoTask
 * @param {string[]} [options.image_urls]
 * @param {string[]} [options.binary_data_base64]
 * @param {string} [options.prompt]
 * @param {number} [options.seed]
 * @param {string} [options.aspect_ratio]
 * @param {number} [options.interval] 轮询间隔ms，默认2000
 * @param {number} [options.maxRetry] 最大轮询次数，默认30
 * @returns {Promise<string>} 成功时resolve视频url，否则reject错误
 */
function submitAndWaitForVideoUrl({ image_urls, binary_data_base64, prompt, seed, aspect_ratio, interval = 2000, maxRetry = 30 }) {
  return submitImageToVideoTask({ image_urls, binary_data_base64, prompt, seed, aspect_ratio })
    .then(res => {
      if (!res || !res.data || !res.data.task_id) throw new Error('提交任务失败');
      const task_id = res.data.task_id;
      let retry = 0;
      return new Promise((resolve, reject) => {
        function poll() {
          queryImageToVideoTask({ task_id })
            .then(r => {
              if (r && r.data && r.data.status === 'done' && r.data.video_url) {
                resolve(r.data.video_url);
              } else if (retry++ < maxRetry) {
                setTimeout(poll, interval);
              } else {
                reject(new Error('查询超时或未生成视频'));
              }
            })
            .catch(reject);
        }
        poll();
      });
    });
}

/**
 * 计算请求体的 SHA256 HEX
 * @param {string} payload
 * @returns {string}
 */
function hashPayload(payload) {
  return CryptoJS.SHA256(payload || '').toString(CryptoJS.enc.Hex);
}

/**
 * 生成 CanonicalRequest
 * @param {Object} params
 * @param {string} method
 * @param {string} uri
 * @param {string} query
 * @param {Object} headers 参与签名的header对象（小写）
 * @param {string[]} signedHeaders 参与签名的header名数组（小写）
 * @param {string} payload
 * @returns {string}
 */
function buildCanonicalRequest({ method, uri, query, headers, signedHeaders, payload }) {
  const canonicalHeaders = signedHeaders
    .map(h => h + ':' + (headers[h] || '').trim() + '\n')
    .join('');
  const signedHeadersStr = signedHeaders.join(';');
  const hashedPayload = hashPayload(payload);
  return [
    method.toUpperCase(),
    uri,
    query,
    canonicalHeaders,
    signedHeadersStr,
    hashedPayload
  ].join('\n');
}

/**
 * 生成 Authorization 签名
 * @param {Object} params
 * @param {string} ak
 * @param {string} sk
 * @param {string} region
 * @param {string} service
 * @param {string} shortDate
 * @param {string} canonicalRequest
 * @param {string} signedHeadersStr
 * @returns {string}
 */
function genVolcAuthorization({ ak, sk, region, service, shortDate, canonicalRequest, signedHeadersStr }) {
  const signature = CryptoJS.HmacSHA256(canonicalRequest, sk).toString(CryptoJS.enc.Hex);
  return [
    'VolcEngineV1',
    `AccessKeyId=${ak}`,
    `Signature=${signature}`,
    `Region=${region}`,
    `Service=${service}`,
    `SignedHeaders=${signedHeadersStr}`,
    `ShortDate=${shortDate}`
  ].join('/');
}

/**
 * 获取当前UTC时间字符串，格式YYYYMMDDTHHmmssZ
 * @returns {string}
 */
function getXDate() {
  const d = new Date();
  const pad = n => n.toString().padStart(2, '0');
  return d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + 'Z';
}

/**
 * 获取当前UTC日期字符串，格式YYYYMMDD
 * @returns {string}
 */
function getShortDate() {
  const d = new Date();
  const pad = n => n.toString().padStart(2, '0');
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
}

/**
 * 一站式图片转视频，自动提交任务并查询，返回视频地址
 * @param {Object} params
 * @param {string} params.imageUrl 图片URL
 * @param {string} params.prompt 关键词
 * @param {string} params.ak AccessKeyId
 * @param {string} params.sk SecretKey
 * @param {string} [params.aspect_ratio] 图片比例，默认16:9
 * @returns {Promise<string>} 视频播放地址
 */
function oneStepImageToVideo({ imageUrl, prompt, ak, sk, aspect_ratio = '16:9' }) {
  return submitImageToVideoTask({
    image_urls: [imageUrl],
    prompt,
    aspect_ratio,
    ak,
    sk
  }).then(res => {
    if (!res || !res.data || !res.data.task_id) throw new Error('提交任务失败');
    const task_id = res.data.task_id;
    return new Promise((resolve, reject) => {
      let retry = 0;
      const maxRetry = 30;
      const interval = 2000;
      function poll() {
        queryImageToVideoTask({ task_id, ak, sk })
          .then(r => {
            if (r && r.data && r.data.status === 'done' && r.data.video_url) {
              resolve(r.data.video_url);
            } else if (retry++ < maxRetry) {
              setTimeout(poll, interval);
            } else {
              reject(new Error('查询超时或未生成视频'));
            }
          })
          .catch(reject);
      }
      poll();
    });
  });
}

// 导出
export {
  submitImageToVideoTask,
  queryImageToVideoTask,
  submitAndWaitForVideoUrl,
  genVolcAuthorization,
  hashPayload,
  buildCanonicalRequest,
  oneStepImageToVideo
};
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
async function submitImageToVideoTask({ image_urls, binary_data_base64, prompt, seed, aspect_ratio, ak, sk }) {
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
    const canonicalRequest = await buildCanonicalRequest({
      method,
      uri,
      query,
      headers,
      signedHeaders,
      payload
    });
    let authorization = '';
    if (ak && sk) {
      authorization = await genVolcAuthorization({
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
async function queryImageToVideoTask({ task_id, ak, sk }) {
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
    const canonicalRequest = await buildCanonicalRequest({
      method,
      uri,
      query,
      headers,
      signedHeaders,
      payload
    });
    let authorization = '';
    if (ak && sk) {
      authorization = await genVolcAuthorization({
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
async function submitAndWaitForVideoUrl({ image_urls, binary_data_base64, prompt, seed, aspect_ratio, interval = 2000, maxRetry = 30 }) {
  const res = await submitImageToVideoTask({ image_urls, binary_data_base64, prompt, seed, aspect_ratio });
  if (!res || !res.data || !res.data.task_id) throw new Error('提交任务失败');
  const task_id = res.data.task_id;
  let retry = 0;
  return new Promise((resolve, reject) => {
    async function poll() {
      try {
        const r = await queryImageToVideoTask({ task_id });
        if (r && r.data && r.data.status === 'done' && r.data.video_url) {
          resolve(r.data.video_url);
        } else if (retry++ < maxRetry) {
          setTimeout(poll, interval);
        } else {
          reject(new Error('查询超时或未生成视频'));
        }
      } catch (e) {
        reject(e);
      }
    }
    poll();
  });
}

import { sign as jimengSign, sha256Hex, queryParamsToString } from './jimeng-sign.js';

// 用Web Crypto API替代CryptoJS
async function hashPayload(payload) {
  return await sha256Hex(payload || '');
}

// buildCanonicalRequest改为异步，payload hash用await
async function buildCanonicalRequest({ method, uri, query, headers, signedHeaders, payload }) {
  // query应为对象，需排序、url编码
  const queryStr = typeof query === 'string' ? query : queryParamsToString(query);
  const canonicalHeaders = signedHeaders
    .map(h => h.toLowerCase() + ':' + (headers[h] || '').trim() + '\n')
    .join('');
  const signedHeadersStr = signedHeaders.map(h => h.toLowerCase()).join(';');
  const hashedPayload = await hashPayload(payload);
  return [
    method.toUpperCase(),
    uri,
    queryStr,
    canonicalHeaders,
    signedHeadersStr,
    hashedPayload
  ].join('\n');
}

// 替换genVolcAuthorization为异步签名
async function genVolcAuthorization({ ak, sk, region, service, shortDate, canonicalRequest, signedHeadersStr }) {
  const headers = {
    'X-Date': shortDate,
    'host': 'visual.volcengineapi.com',
  };
  const bodySha = await sha256Hex(canonicalRequest.split('\n').pop() || '');
  const authorization = await jimengSign({
    headers,
    query: {},
    region,
    serviceName: service,
    method: 'POST',
    pathName: '/',
    accessKeyId: ak,
    secretAccessKey: sk,
    needSignHeaderKeys: ['X-Date', 'host'],
    bodySha
  });
  return authorization;
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
async function oneStepImageToVideo({ imageUrl, prompt, ak, sk, aspect_ratio = '16:9' }) {
  const res = await submitImageToVideoTask({
    image_urls: [imageUrl],
    prompt,
    aspect_ratio,
    ak,
    sk
  });
  if (!res || !res.data || !res.data.task_id) throw new Error('提交任务失败');
  const task_id = res.data.task_id;
  return new Promise((resolve, reject) => {
    let retry = 0;
    const maxRetry = 30;
    const interval = 2000;
    async function poll() {
      try {
        const r = await queryImageToVideoTask({ task_id, ak, sk });
        if (r && r.data && r.data.status === 'done' && r.data.video_url) {
          resolve(r.data.video_url);
        } else if (retry++ < maxRetry) {
          setTimeout(poll, interval);
        } else {
          reject(new Error('查询超时或未生成视频'));
        }
      } catch (e) {
        reject(e);
      }
    }
    poll();
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
/**
 * 基础JS签名工具，适用于浏览器环境，无Node依赖
 */

// 需要忽略的 header key，不参与签名
const HEADER_KEYS_TO_IGNORE = new Set([
    "authorization",
    "content-type",
    "content-length",
    "user-agent",
    "presigned-expires",
    "expect",
]);

/**
 * HMAC-SHA256 计算
 * @param {string|ArrayBuffer} key 密钥
 * @param {string} msg 消息
 * @returns {Promise<ArrayBuffer>} 签名结果
 */
async function hmacSHA256(key, msg) {
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        typeof key === "string" ? enc.encode(key) : key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
    return await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
}

/**
 * 计算字符串的SHA256十六进制
 * @param {string} msg 输入字符串
 * @returns {Promise<string>} 十六进制hash
 */
async function sha256Hex(msg) {
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(msg));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 获取当前UTC时间字符串，格式YYYYMMDDTHHmmssZ
 * @returns {string}
 */
function getDateTimeNow() {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    return now.getUTCFullYear() +
        pad(now.getUTCMonth() + 1) +
        pad(now.getUTCDate()) + 'T' +
        pad(now.getUTCHours()) +
        pad(now.getUTCMinutes()) +
        pad(now.getUTCSeconds()) + 'Z';
}

/**
 * query对象转为排序后的url参数字符串
 * @param {Object} params
 * @returns {string}
 */
function queryParamsToString(params) {
    return Object.keys(params)
        .sort()
        .map(key => {
            const val = params[key];
            if (typeof val === 'undefined' || val === null) return undefined;
            const escapedKey = encodeURIComponent(key);
            if (!escapedKey) return undefined;
            if (Array.isArray(val)) {
                return `${escapedKey}=${val.map(encodeURIComponent).sort().join(`&${escapedKey}=`)}`;
            }
            return `${escapedKey}=${encodeURIComponent(val)}`;
        })
        .filter(Boolean)
        .join('&');
}

/**
 * 获取需要参与签名的headers及其规范化字符串
 * @param {Object} originHeaders 原始header对象
 * @param {string[]} needSignHeaders 需要签名的header名
 * @returns {[string, string]} [已签名header名(分号分隔), 规范化header字符串]
 */
function getSignHeaders(originHeaders, needSignHeaders) {
    let h = Object.keys(originHeaders);
    // 只保留需要签名的header
    if (Array.isArray(needSignHeaders)) {
        const needSignSet = new Set([...needSignHeaders, 'x-date', 'host'].map(k => k.toLowerCase()));
        h = h.filter(k => needSignSet.has(k.toLowerCase()));
    }
    // 排除不参与签名的header
    h = h.filter(k => !HEADER_KEYS_TO_IGNORE.has(k.toLowerCase()));
    const signedHeaderKeys = h.map(k => k.toLowerCase()).sort().join(';');
    const canonicalHeaders = h
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .map(k => `${k.toLowerCase()}:${originHeaders[k].toString().trim().replace(/\s+/g, ' ')}`)
        .join('\n');
    return [signedHeaderKeys, canonicalHeaders];
}

/**
 * 生成签名字符串
 * @param {Object} options 签名参数
 * @param {Object} options.headers 请求头对象，需包含X-Date
 * @param {Object} options.query 查询参数对象
 * @param {string} options.region 区域
 * @param {string} options.serviceName 服务名
 * @param {string} options.method HTTP方法
 * @param {string} options.pathName 路径
 * @param {string} options.accessKeyId AK
 * @param {string} options.secretAccessKey SK
 * @param {string[]} [options.needSignHeaderKeys] 需要签名的header名
 * @param {string} [options.bodySha] 请求体sha256十六进制
 * @returns {Promise<string>} 签名字符串
 */
async function sign({
    headers = {},
    query = {},
    region = '',
    serviceName = '',
    method = '',
    pathName = '/',
    accessKeyId = '',
    secretAccessKey = '',
    needSignHeaderKeys = [],
    bodySha,
}) {
    // 兼容X-Date和x-date
    const datetime = headers["X-Date"] || headers["x-date"];
    if (!datetime) throw new Error("headers.X-Date 不能为空");
    const date = datetime.substring(0, 8);
    // 2. 获取签名header
    const [signedHeaders, canonicalHeaders] = getSignHeaders(headers, needSignHeaderKeys);
    // 3. 构造规范化请求字符串
    const canonicalRequest = [
        method.toUpperCase(),
        pathName,
        queryParamsToString(query) || '',
        `${canonicalHeaders}\n`,
        signedHeaders,
        bodySha || await sha256Hex(''),
    ].join('\n');
    // 4. 构造凭证作用域
    const credentialScope = [date, region, serviceName, "request"].join('/');
    // 5. 构造待签名字符串
    const stringToSign = [
        "HMAC-SHA256",
        datetime,
        credentialScope,
        await sha256Hex(canonicalRequest)
    ].join('\n');
    // 6. 计算签名
    let kDate = await hmacSHA256(secretAccessKey, date);
    let kRegion = await hmacSHA256(kDate, region);
    let kService = await hmacSHA256(kRegion, serviceName);
    let kSigning = await hmacSHA256(kService, "request");
    let signatureBuf = await hmacSHA256(kSigning, stringToSign);
    let signature = Array.from(new Uint8Array(signatureBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    // 7. 返回最终签名字符串，严格按截图格式
    return `HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

/**
 * 测试签名调用示例
 * 可直接在浏览器控制台调用 testSign() 查看效果
 */
async function testSign() {
    // 构造示例参数
    const headers = {
        "X-Date": getDateTimeNow(),
        "host": "iam.volcengineapi.com"
    };
    const query = {
        Version: '2018-01-01',
        Action: 'ListPolicies'
    };
    const region = 'cn-beijing';
    const serviceName = 'iam';
    const method = 'GET';
    const pathName = '/';
    const accessKeyId = 'testAK'; // 测试用AK
    const secretAccessKey = 'testSK'; // 测试用SK
    const bodySha = await sha256Hex(''); // GET请求body为空

    // 生成签名
    const authorization = await sign({
        headers,
        query,
        region,
        serviceName,
        method,
        pathName,
        accessKeyId,
        secretAccessKey,
        bodySha
    });

    // 打印结果
    console.log('Authorization:', authorization);
    console.log('请求URL:', `https://iam.volcengineapi.com/?${queryParamsToString(query)}`);
    console.log('Headers:', headers);
}

// 导出方法，供外部调用
export {
    sign, // 生成签名主方法
    sha256Hex, // 计算sha256十六进制
    hmacSHA256, // HMAC-SHA256
    getDateTimeNow, // 获取UTC时间字符串
    queryParamsToString, // query对象转url参数
    getSignHeaders, // 获取签名header
    testSign // 导出测试函数
}; 
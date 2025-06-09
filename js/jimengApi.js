// volcengine 签名请求（浏览器版）

const JimengApi = {
    async hashSHA256(content) {
        const encoder = new TextEncoder();
        const data = typeof content === 'string' ? encoder.encode(content) : content;
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    },
    async hmacSHA256(key, content) {
        const encoder = new TextEncoder();
        const keyData = typeof key === 'string' ? encoder.encode(key) : key;
        const cryptoKey = await crypto.subtle.importKey(
            'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(content));
        return new Uint8Array(sig);
    },
    signStringEncoder(source) {
        return encodeURIComponent(source)
            .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
            .replace(/%20/g, '+');
    },
    async genSigningSecretKeyV4(secretKey, date, region, service) {
        let kDate = await this.hmacSHA256(secretKey, date);
        let kRegion = await this.hmacSHA256(kDate, region);
        let kService = await this.hmacSHA256(kRegion, service);
        return await this.hmacSHA256(kService, 'request');
    },
    bytesToHex(bytes) {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    },
    async doRequest({
        method = 'POST',
        queryList = {},
        body = {},
        date = new Date(),
        action,
        version,
        region,
        service,
        schema = 'https',
        host,
        path = '/',
        ak,
        sk
    }) {
        const bodyStr = JSON.stringify(body);
        const encoder = new TextEncoder();
        const bodyBuffer = encoder.encode(bodyStr);
        const xContentSha256 = await this.hashSHA256(bodyBuffer);
        const pad = n => n.toString().padStart(2, '0');
        const xDate = date.getUTCFullYear() +
            pad(date.getUTCMonth() + 1) +
            pad(date.getUTCDate()) + 'T' +
            pad(date.getUTCHours()) +
            pad(date.getUTCMinutes()) +
            pad(date.getUTCSeconds()) + 'Z';
        const shortXDate = xDate.slice(0, 8);
        const realQueryList = { ...queryList, Action: action, Version: version };
        const querySB = Object.keys(realQueryList)
            .sort()
            .map(key => `${this.signStringEncoder(key)}=${this.signStringEncoder(realQueryList[key])}`)
            .join('&');
        const contentType = 'application/json';
        const signHeader = 'host;x-date;x-content-sha256;content-type';
        const canonicalStringBuilder =
            `${method}\n${path}\n${querySB}\n` +
            `host:${host}\n` +
            `x-date:${xDate}\n` +
            `x-content-sha256:${xContentSha256}\n` +
            `content-type:${contentType}\n\n` +
            `${signHeader}\n` +
            `${xContentSha256}`;
        const hashcanonicalString = await this.hashSHA256(canonicalStringBuilder);
        const credentialScope = `${shortXDate}/${region}/${service}/request`;
        const signString =
            `HMAC-SHA256\n${xDate}\n${credentialScope}\n${hashcanonicalString}`;
        const signKey = await this.genSigningSecretKeyV4(sk, shortXDate, region, service);
        const signature = this.bytesToHex(await this.hmacSHA256(signKey, signString));
        const url = `${schema}://${host}${path}?${querySB}`;
        const headers = {
            'Host': host,
            'X-Date': xDate,
            'X-Content-Sha256': xContentSha256,
            'Content-Type': contentType,
            'Authorization': `HMAC-SHA256 Credential=${ak}/${credentialScope}, SignedHeaders=${signHeader}, Signature=${signature}`
        };
        const resp = await fetch(url, {
            method,
            headers,
            body: method === 'GET' ? undefined : bodyStr
        });
        const text = await resp.text();
        return { status: resp.status, body: text };
    },
    // 新增：图生视频简洁请求方法
    async doImage2Video({ req_key, image_urls, prompt }) {
        // 默认参数
        const ak = 'AKLTMmU2NGQ5MjAzNmFlNDU3ODk4MjljMjI4YWI4MjExZTk';
        const sk = 'TnpBek9USTJaV1l4TkRnM05Ea3lOemsxTVRWa1pUVXlNRGN3WTJZek5XTQ==';
        const endpoint = 'visual.volcengineapi.com';
        const path = '/';
        const service = 'cv';
        const region = 'cn-north-1';
        const schema = 'https';
        const action = 'CVSync2AsyncSubmitTask';
        const version = '2022-08-31';
        return await this.doRequest({
            method: 'POST',
            queryList: {},
            body: { req_key, image_urls, prompt },
            date: new Date(),
            action,
            version,
            region,
            service,
            schema,
            host: endpoint,
            path,
            ak,
            sk
        });
    },
    // 新增：查询进度简洁方法
    async queryTaskProgress({ req_key, task_id }) {
        // 默认参数
        const ak = 'AKLTMmU2NGQ5MjAzNmFlNDU3ODk4MjljMjI4YWI4MjExZTk';
        const sk = 'TnpBek9USTJaV1l4TkRnM05Ea3lOemsxTVRWa1pUVXlNRGN3WTJZek5XTQ==';
        const endpoint = 'visual.volcengineapi.com';
        const path = '/';
        const service = 'cv';
        const region = 'cn-north-1';
        const schema = 'https';
        const action = 'CVSync2AsyncGetResult';
        const version = '2022-08-31';
        return await this.doRequest({
            method: 'POST',
            queryList: {},
            body: { req_key, task_id },
            date: new Date(),
            action,
            version,
            region,
            service,
            schema,
            host: endpoint,
            path,
            ak,
            sk
        });
    }
};

// 可通过 window.JimengApi 访问
window.JimengApi = JimengApi;

// api/gemini.js (满血防弹版)
const ipCache = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: { message: "只支持 POST 请求" } });
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : forwardedFor) || req.socket.remoteAddress || 'unknown';
    const limit = 5; // 每分钟允许的最大请求次数
    const windowMs = 60 * 1000;
    const now = Date.now();

    if (ipCache.has(ip)) {
        const ipData = ipCache.get(ip);

        if (now - ipData.startTime < windowMs) {
            if (ipData.count >= limit) {
                console.log(`🚨 拦截恶意刷单 IP: ${ip}`);
                return res.status(429).json({
                    error: { message: "你的相机过热了！请休息一分钟再拍。" }
                });
            }

            ipData.count++;
        } else {
            ipCache.set(ip, { count: 1, startTime: now });
        }
    } else {
        ipCache.set(ip, { count: 1, startTime: now });
    }

    // 1. 检查 API Key
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        console.error("🚨 致命错误：环境变量 GEMINI_API_KEY 未找到！");
        return res.status(500).json({ error: { message: "服务器未配置 API_KEY" } });
    }

    // 2. 组装请求 URL（注意：这里必须用键盘左上角的反引号 `，不能用单引号！）
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    try {
        const { contents, generationConfig, safetySettings } = req.body || {};
        if (!Array.isArray(contents) || contents.length === 0) {
            return res.status(400).json({ error: { message: "请求体缺少 contents" } });
        }

        const safeBody = { contents };
        if (generationConfig && typeof generationConfig === 'object') {
            safeBody.generationConfig = generationConfig;
        }
        if (Array.isArray(safetySettings)) {
            safeBody.safetySettings = safetySettings;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(safeBody)
        });

        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
            ? await response.json()
            : { error: { message: await response.text() } };

        // 3. 拦截 Google 的报错！
        if (!response.ok) {
            console.error("❌ Google API 报错了：", JSON.stringify(data));
            return res.status(response.status).json(data); 
        }

        // 4. 成功返回数据
        res.status(200).json(data);
    } catch (error) {
        console.error("❌ Vercel 服务器崩溃：", error.message);
        res.status(500).json({ error: { message: error.message } });
    }
}

// api/gemini.js (满血防弹版)
const ipCache = new Map();
function useQuota(req,res) {
    const forwarded=req.headers['x-forwarded-for'];
    const ip=(typeof forwarded==='string'?forwarded.split(',')[0].trim():null)||req.socket?.remoteAddress||'unknown';
    const header=req.headers['x-game-session'];
    const session=typeof header==='string'&&/^[a-zA-Z0-9-]{16,64}$/.test(header)?header:null;
    const now=Date.now(),windowMs=60000;
    for(const [key,value] of ipCache)if(now-value.startTime>=windowMs)ipCache.delete(key);
    // Separate players sharing classroom Wi-Fi; retain an overall IP ceiling.
    const buckets=[[`ip:${ip}`,120],[`player:${ip}:${session||'legacy'}`,session?12:5]];
    for(const [key,limit] of buckets){
        const value=ipCache.get(key);
        if(value&&value.count>=limit){
            res.setHeader('Retry-After',String(Math.max(1,Math.ceil((value.startTime+windowMs-now)/1000))));
            res.status(429).json({error:{message:'少し時間をおいて、もう一度試してください。サンプル画像でも続けられます。'}});
            return false;
        }
    }
    if(ipCache.size>5000){res.setHeader('Retry-After','60');res.status(429).json({error:{message:'混み合っています。少し待ってから試してください。'}});return false;}
    for(const [key] of buckets){const value=ipCache.get(key);if(value)value.count++;else ipCache.set(key,{count:1,startTime:now});}
    return true;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: { message: "只支持 POST 请求" } });
    }

    if(!useQuota(req,res))return;

    // 1. 检查 API Key
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        console.error("🚨 致命错误：环境变量 GEMINI_API_KEY 未找到！");
        return res.status(500).json({ error: { message: "服务器未配置 API_KEY" } });
    }

    // 2. 组装请求 URL（注意：这里必须用键盘左上角的反引号 `，不能用单引号！）
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
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

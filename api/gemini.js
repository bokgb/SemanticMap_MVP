// api/gemini.js (满血防弹版)
export default async function handler(req, res) {
    // 1. 检查 API Key
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        console.error("🚨 致命错误：环境变量 GEMINI_API_KEY 未找到！");
        return res.status(500).json({ error: { message: "服务器未配置 API_KEY" } });
    }

    // 2. 组装请求 URL（注意：这里必须用键盘左上角的反引号 `，不能用单引号！）
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

    try {
        const { contents } = req.body;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();

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
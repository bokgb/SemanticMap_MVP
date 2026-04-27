// api/gemini.js
export default async function handler(req, res) {
    // 1. 获取前端传来的图片数据
    const { contents } = req.body;
    
    // 2. 从服务器的环境变量里读取 API_KEY (绝对不会泄露给前端)
    const API_KEY = process.env.GEMINI_API_KEY; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();
        // 3. 把 Google 返回的结果原封不动传给前端
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "服务器转发失败" });
    }
}
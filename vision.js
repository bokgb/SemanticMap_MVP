(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    const elements = {};
    let currentStream = null;

    function updateDifficultyHint() {
        if (!elements.levelSelector || !elements.difficultyHint) return;

        const hintMap = {
            N5: '当前难度：N5 - 新手',
            N3: '当前难度：N3 - 进阶',
            N1: '当前难度：N1 - 专家'
        };

        elements.difficultyHint.innerText = hintMap[elements.levelSelector.value] || '当前难度：未知';
        elements.difficultyHint.dataset.level = elements.levelSelector.value;
    }

    async function openCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("当前浏览器不支持摄像头调用，请使用 HTTPS 或 localhost 环境。");
            return;
        }

        elements.cameraLayer.style.display = 'flex';
        elements.captureBtn.disabled = true;
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            elements.cameraFeed.srcObject = currentStream;
            await elements.cameraFeed.play();
            elements.captureBtn.disabled = false;
        } catch (err) {
            elements.cameraLayer.style.display = 'none';
            state.activeQuest = null;
            alert("无法调用摄像头\n错误信息: " + err.message);
        }
    }

    function closeCamera() {
        elements.cameraLayer.style.display = 'none';
        elements.captureBtn.disabled = false;
        elements.closeCameraBtn.disabled = false;
        if (currentStream) currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
        elements.cameraFeed.srcObject = null;
    }

    function captureFrameAsBase64() {
        const video = elements.cameraFeed;
        if (!video || !video.videoWidth || !video.videoHeight) {
            throw new Error("摄像头画面尚未准备好，请稍等一秒再拍。");
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        return dataURL.split(',')[1];
    }

    async function callRealVisionAI() {
        let base64Image = "";
        try {
            base64Image = captureFrameAsBase64();
        } catch (error) {
            alert(`无法拍摄当前画面：${error.message}`);
            return null;
        }

        const currentLevel = elements.levelSelector?.value || 'N5';
        const levelInstructions = {
            N5: "【例句要求】：使用 JLPT N5-N4 级别的极简基础语法（如 です/ます、～を食べる）。句子要短，非常直白，汉字必须标注假名。",
            N3: "【例句要求】：使用 JLPT N3-N2 级别的进阶日常语法（如 被动、使役、～てしまう、～かもしれない）。句子要像当地人日常交流，包含适度的细节或情感描写。",
            N1: "【例句要求】：使用 JLPT N1 级别的高级书面语法或专业表达（如 ～ざるを得ない、～にほかならない、四字熟语）。句子要结构复杂，带有强烈的议论、说明或文学色彩。"
        };

        const activeQuest = state.activeQuest;
        const rewardPrompt = (activeQuest && activeQuest.rarity && activeQuest.rarity !== 'N')
            ? `【奖励模式】：由于这是${activeQuest.rarity}级任务，除了主单词外，请额外提供2个与其相关的形容词或动词，放入字段 "extra_words" 中。每个元素包含 {"text","kana","zh","pos"}。`
            : "";

        let catSafetyRule = "";
        if (activeQuest && activeQuest.type === 'NPC') {
            catSafetyRule = `
            【特殊规则：流浪猫喂食判定】
            当前玩家正在给流浪猫喂食。请扮演兽医，判定图片中的食物是否适合猫咪食用。
            （警告：巧克力、洋葱、葡萄、纯牛奶、高盐高糖零食对猫危险；猫粮、无调味熟肉、鱼类是安全的。）
            `;
        }

        const promptText = `
        你是一个 LBS 语言学习游戏的物体识别引擎。
        请识别图片中最主要的物品。

        ${rewardPrompt}
        ${catSafetyRule}

        【词汇提取绝对原则】：无论当前是什么难度，提取的物品名称 (word.text) 必须是现代日语中最自然、最常用、最接地气的说法！

        ${levelInstructions[currentLevel]}

        严格返回 JSON 格式：
        {
            "word": { "text": "日文", "kana": "假名", "zh": "中文" },
            "pos": "名词 或 动词",
            "tag": "必须从以下选择其一：Food, Nature, Transit, Retail, Health, Item",
            "tagColor": "对应的十六进制颜色",
            "example": { "s": "日文例句", "k": "假名", "z": "中文" },
            "extra_words": [ {"text": "单词", "kana": "假名", "zh": "翻译", "pos": "词性"} ],
            "is_safe": true/false (如果有喂猫特殊规则必填),
            "danger_reason": "如果危险请用中文解释原因，安全留空" (如果有喂猫特殊规则必填)
        }
        `;

        const requestBody = {
            contents: [{
                parts: [
                    { text: promptText },
                    { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                ]
            }],
            generationConfig: {
                response_mime_type: "application/json"
            }
        };

        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.error) {
                alert("🚨 AI 识别出错: " + (data.error.message || "请检查后端日志"));
                return null;
            }

            if (!response.ok) {
                throw new Error(`API 拒绝请求: ${data.error?.message || response.status}`);
            }

            const resultTextPart = data?.candidates?.[0]?.content?.parts?.find(part => typeof part.text === 'string');
            if (!resultTextPart) {
                throw new Error("AI 没有返回可解析的文本结果。");
            }

            let resultText = resultTextPart.text;
            resultText = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim();

            const aiResult = JSON.parse(resultText);
            return SM.inventory.normalizeAiResult(aiResult);
        } catch (error) {
            console.error("AI 识别失败:", error);
            alert(`🚨 系统排错：\n识别失败了！\n真实原因：${error.message}`);

            return SM.inventory.normalizeAiResult({
                word: { text: "未知物品（エラー）", kana: "", zh: "识别失败" },
                pos: "名词",
                tag: "Item",
                tagColor: "#607D8B",
                example: { s: "", k: "", z: "" }
            });
        }
    }

    async function handleCapture() {
        elements.cameraLayer.classList.add('flash-effect');
        setTimeout(() => elements.cameraLayer.classList.remove('flash-effect'), 150);

        if (navigator.vibrate) navigator.vibrate(50);

        const originalText = elements.captureBtn.innerText;
        elements.captureBtn.innerText = "解析中...";
        elements.captureBtn.disabled = true;
        elements.closeCameraBtn.disabled = true;

        if (elements.cameraFeed && typeof elements.cameraFeed.pause === 'function') {
            elements.cameraFeed.pause();
        }

        if (elements.scannerOverlay) elements.scannerOverlay.classList.remove('hidden');

        let aiResult = null;
        try {
            aiResult = await callRealVisionAI();
        } catch (error) {
            console.error("AI 识别流程异常:", error);
            alert(`🚨 识别流程异常：${error.message}`);
        } finally {
            if (elements.cameraFeed && typeof elements.cameraFeed.play === 'function' && elements.cameraFeed.srcObject) {
                elements.cameraFeed.play().catch(() => {});
            }
            if (elements.scannerOverlay) elements.scannerOverlay.classList.add('hidden');

            elements.captureBtn.innerText = originalText;
            elements.captureBtn.disabled = false;
            elements.closeCameraBtn.disabled = false;
            closeCamera();
        }

        handleAiResult(aiResult);
    }

    function handleAiResult(aiResult) {
        if (!aiResult || !aiResult.word) {
            state.activeQuest = null;
            return;
        }

        const activeQuest = state.activeQuest;
        if (!activeQuest) {
            SM.inventory.showWordDetailCard(aiResult);
            return;
        }

        if (aiResult.tag === activeQuest.requiredTag) {
            if (activeQuest.type === 'NPC') {
                if (aiResult.is_safe === false) {
                    alert(`❌ 喂食失败！AI 兽医紧急警告：\n${aiResult.danger_reason}`);
                    state.activeQuest = null;
                    return;
                }
                alert(`🐱 喵~！\n流浪猫开心地吃下了【${aiResult.word.text}】！\n成功组合：猫 に [ ${aiResult.word.text} ] を あげる`);
            } else if (activeQuest.type === 'POI') {
                const finishedSentence = activeQuest.text.replace('[ ? ]', `[ ${aiResult.word.text} ]`);
                alert(`🎉 任务完成！\n成功组合：${finishedSentence}\n区域已净化！`);
            }

            SM.inventory.queueExtraWordRewards(aiResult);
            SM.inventory.showWordDetailCard(aiResult);
            SM.quests.completeQuest(activeQuest);
            document.getElementById('quest-layer').classList.add('hidden');
            state.activeQuest = null;
        } else {
            if (activeQuest.type === 'NPC') {
                alert(`😾 喵？\n流浪猫闻了闻【${aiResult.word.text}】，嫌弃地走开了。\n（提示：你需要拍【Food】类的物品！）`);
            } else {
                alert(`❌ 语境不符！\n你拍到了【${aiResult.word.text}】，但这东西不能“吃”哦。`);
            }
            state.activeQuest = null;
        }
    }

    function init() {
        Object.assign(elements, {
            scanBtn: document.getElementById('scan-btn'),
            levelSelector: document.getElementById('level-selector'),
            difficultyHint: document.getElementById('difficulty-hint'),
            cameraLayer: document.getElementById('camera-layer'),
            cameraFeed: document.getElementById('camera-feed'),
            closeCameraBtn: document.getElementById('close-camera-btn'),
            captureBtn: document.getElementById('capture-btn'),
            scannerOverlay: document.getElementById('ai-scanning-overlay')
        });

        elements.levelSelector.addEventListener('change', updateDifficultyHint);
        updateDifficultyHint();

        elements.scanBtn.addEventListener('click', openCamera);
        elements.closeCameraBtn.addEventListener('click', closeCamera);
        elements.captureBtn.addEventListener('click', handleCapture);
    }

    SM.vision = {
        init,
        openCamera,
        closeCamera,
        callRealVisionAI,
        updateDifficultyHint
    };
})();

(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    const elements = {};
    let currentStream = null;
    const LEVEL_STORAGE_KEY = 'semantic-map-selected-level';

    function updateDifficultyHint() {
        if (!elements.levelSelector || !elements.difficultyHint) return;

        state.currentLevel = elements.levelSelector.value;
        const hintMap = {
            N5: '当前难度：N5 - 新手',
            N3: '当前难度：N3 - 进阶',
            N1: '当前难度：N1 - 专家'
        };

        elements.difficultyHint.innerText = hintMap[elements.levelSelector.value] || '当前难度：未知';
        elements.difficultyHint.dataset.level = elements.levelSelector.value;

        if (SM.map && state.lastPlayerPosition) {
            SM.map.updateVisibleSpots(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng);
        }
    }

    function setLevel(level, { persist = true, refresh = true } = {}) {
        if (!elements.levelSelector) return;

        const option = Array.from(elements.levelSelector.options).find(item => item.value === level);
        const nextLevel = option ? level : 'N5';
        elements.levelSelector.value = nextLevel;
        if (persist) {
            localStorage.setItem(LEVEL_STORAGE_KEY, nextLevel);
        }

        if (refresh) {
            updateDifficultyHint();
        } else {
            state.currentLevel = nextLevel;
        }
    }

    function initLevelOnboarding() {
        const savedLevel = localStorage.getItem(LEVEL_STORAGE_KEY);

        if (savedLevel) {
            setLevel(savedLevel, { persist: false, refresh: false });
        }

        if (!elements.levelOnboardingLayer) return;

        if (!savedLevel) {
            elements.levelOnboardingLayer.classList.remove('hidden');
        }

        elements.levelChoiceButtons.forEach(button => {
            button.addEventListener('click', () => {
                const level = button.dataset.levelChoice || 'N5';
                setLevel(level, { persist: true, refresh: true });
                elements.levelOnboardingLayer.classList.add('hidden');
                SM.ui?.showToast(`已选择：${button.querySelector('.level-choice-main')?.innerText || level}`, { type: 'success' });
            });
        });
    }

    async function openCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            SM.ui?.showToast("当前浏览器不支持摄像头调用，请使用 HTTPS 或 localhost 环境。", { type: 'error', duration: 4200 });
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
            SM.ui?.showToast(`无法调用摄像头：${err.message}`, { type: 'error', duration: 4200 });
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
            SM.ui?.showToast(`无法拍摄当前画面：${error.message}`, { type: 'error', duration: 4200 });
            return null;
        }

        const currentLevel = elements.levelSelector?.value || 'N5';
        state.currentLevel = currentLevel;
        const levelInstructions = {
            N5: "【等级】：JLPT N5-N4。优先返回最基础、最常见的名词。",
            N3: "【等级】：JLPT N3-N2。优先返回自然日常用语，不要过度书面化。",
            N1: "【等级】：JLPT N1。名词仍然要自然常用，但中文解释可以更精确。"
        };

        const activeQuest = state.activeQuest;
        const questPrompt = activeQuest
            ? `
        【当前文型任务】
        地点：${activeQuest.spot?.name || '未知地点'}
        地点类型：${activeQuest.spot?.type || 'unknown'}
        目标语义标签：${activeQuest.requiredTag}
        目标文型：${activeQuest.text}
        语法点：${activeQuest.grammar || '未指定'}
        拍摄条件：${activeQuest.instruction || '能填入空格的现实物体'}

        请判断图片中的主要物体是否适合填入目标文型的 [ ? ]。如果不适合，也返回识别出的词，但 tag 应反映真实语义类别。
        `
            : `
        【练习扫描】
        当前没有地点文型任务。只返回图片中最主要物品的名词信息。
        `;

        let catSafetyRule = "";
        if (activeQuest && activeQuest.type === 'NPC') {
            catSafetyRule = `
            【特殊规则：流浪猫帮助事件】
            这是轻量游戏事件，不是严格兽医模拟。请把面包、饭团、便当、点心、水、茶、咖啡、饮料等日常可食用/可饮用物品都判定为 Food，并让任务通过。
            只有在图片主体明显不是食物饮料，或明显是危险/不可食用物品时，才不要判定为 Food。
            如果物品只是“不太适合真实猫咪食用”，但它仍然是人类日常食物或饮料，也请保持 tag 为 Food，不要因为真实喂养风险而失败。
            `;
        }

        const promptText = `
        你是一个 LBS 语言学习游戏的物体识别引擎。
        请识别图片中最主要、最适合作为日语名词学习对象的物品。
        拍照输入只负责补充名词，不要把动词、形容词作为主单词返回。

        ${questPrompt}
        ${catSafetyRule}

        【词汇提取绝对原则】：无论当前是什么难度，提取的物品名称 (word.text) 必须是现代日语中最自然、最常用、最接地气的说法！

        ${levelInstructions[currentLevel]}

        严格返回 JSON 格式：
        {
            "word": { "text": "日文", "kana": "假名", "zh": "中文" },
            "pos": "名词",
            "tag": "必须从以下选择其一：Food, Nature, Transit, Retail, Health, Item",
            "tagColor": "对应的十六进制颜色",
            "example": { "s": "日文例句", "k": "假名", "z": "中文" },
            "is_safe": true/false (流浪猫事件可选；只要是食物或饮料通常填 true),
            "danger_reason": "只有明显不可食用或明显危险时才填写，其他情况留空"
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
                SM.ui?.showToast(`AI 识别出错：${data.error.message || "请检查后端日志"}`, { type: 'error', duration: 4200 });
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
            SM.ui?.showToast(`识别失败：${error.message}`, { type: 'error', duration: 4200 });

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
            SM.ui?.showToast(`识别流程异常：${error.message}`, { type: 'error', duration: 4200 });
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
            SM.ui?.showToast("请先点击地图上的地点文型任务，再开始正式拍照。", { type: 'warning' });
            return;
        }

        const isCatQuest = activeQuest.type === 'NPC';
        const isCatFoodLike = isCatQuest && isLooseCatFood(aiResult);
        const isQuestMatch = aiResult.tag === activeQuest.requiredTag || isCatFoodLike;

        if (isQuestMatch) {
            if (activeQuest.type === 'NPC') {
                aiResult.tag = 'Food';
                const areaResult = SM.map?.recordCatComplete?.(activeQuest);
                if (areaResult?.justPurified) {
                    SM.ui?.showToast(`小猫救援 +${areaResult.addedPoints}\n${areaResult.area.name} 净化完成`, { type: 'success', duration: 3600 });
                } else if (areaResult?.addedPoints) {
                    SM.ui?.showToast(`小猫救援 +${areaResult.addedPoints}\n${areaResult.area.name} ${Math.min(areaResult.repairPoints, areaResult.requiredPoints)}/${areaResult.requiredPoints}`, { type: 'success', duration: 3600 });
                } else {
                    SM.ui?.showToast(`喂食成功：猫 に ${aiResult.word.text} を あげる`, { type: 'success' });
                }
                SM.map?.clearCatEvent?.(activeQuest.marker);
            } else if (activeQuest.type === 'POI') {
                const finishedSentence = activeQuest.text.replace('[ ? ]', `[ ${aiResult.word.text} ]`);
                aiResult.quest = {
                    level: activeQuest.level,
                    grammar: activeQuest.grammar,
                    review: buildGrammarReview(activeQuest, aiResult.word.text),
                    sentence: finishedSentence,
                    location: activeQuest.spot?.name || '',
                    spotType: activeQuest.spot?.type || '',
                    requiredTag: activeQuest.requiredTag
                };
            }

            SM.inventory.showWordDetailCard(aiResult);
            SM.quests.completeQuest(activeQuest);
            if (activeQuest.type === 'POI' && SM.map?.recordQuestComplete) {
                const areaResult = SM.map.recordQuestComplete(activeQuest);
                if (areaResult?.justPurified) {
                    SM.ui?.showToast(`区域净化完成！\n${areaResult.area.name} ${Math.min(areaResult.repairPoints, areaResult.requiredPoints)}/${areaResult.requiredPoints}`, { type: 'success', duration: 3600 });
                } else if (areaResult?.addedPoints) {
                    SM.ui?.showToast(`区域修复 +${areaResult.addedPoints}\n${areaResult.area.name} ${Math.min(areaResult.repairPoints, areaResult.requiredPoints)}/${areaResult.requiredPoints}`, { type: 'success' });
                } else if (areaResult?.outsideArea) {
                    SM.ui?.showToast("区域外练习完成：已获得词卡，但不增加区域修复值。", { type: 'info', duration: 3200 });
                }
            }
            document.getElementById('quest-layer').classList.add('hidden');
            state.activeQuest = null;
        } else {
            showWrongObjectDialog(activeQuest, aiResult);
            state.activeQuest = null;
        }
    }

    function showWrongObjectDialog(activeQuest, aiResult) {
        if (activeQuest?.type === 'NPC') {
            SM.ui?.showDialog({
                title: '拍摄对象不符合任务',
                message: `你拍到了：${aiResult.word.text}\n这个任务需要食物或饮料类物品。`,
                buttonText: '知道了',
                type: 'warning'
            });
            return;
        }

        SM.ui?.showDialog({
            title: '拍摄对象不符合任务',
            message: `你拍到了：${aiResult.word.text}\n识别类别：${aiResult.tag}\n这个任务需要：${activeQuest?.requiredTag || '任务指定类别'}`,
            buttonText: '知道了',
            type: 'warning'
        });
    }

    function isLooseCatFood(aiResult) {
        const text = `${aiResult?.word?.text || ''} ${aiResult?.word?.kana || ''} ${aiResult?.word?.zh || ''}`.toLowerCase();
        const foodWords = [
            'パン', 'ぱん', '面包', 'bread',
            'おにぎり', '弁当', 'べんとう', '饭团', '便当',
            '水', 'みず', 'water',
            '茶', 'お茶', 'ちゃ', 'tea',
            'コーヒー', 'coffee', '咖啡',
            'ジュース', 'juice', '饮料', '飲料',
            '牛乳', 'ミルク', '奶', 'milk',
            '菓子', 'お菓子', 'スナック', '点心', '零食',
            '食べ物', '食品', '食物', 'food',
            'ご飯', 'ごはん', '米饭',
            'サンドイッチ', 'sandwich', '三明治',
            '肉', '魚', '鱼', '肉类',
            '果物', '水果'
        ];

        return foodWords.some(word => text.includes(word.toLowerCase()));
    }

    function buildGrammarReview(quest, wordText) {
        if (!quest) return [];

        const text = quest.text || '';
        const review = [];

        if (quest.grammar) {
            review.push(`文型：${quest.grammar}`);
        }
        if (text.includes('を')) {
            review.push(`を：把「${wordText}」标记为动作对象`);
        }
        if (text.includes('に')) {
            review.push('に：表示目标、到达点或存在位置');
        }
        if (text.includes('で')) {
            review.push('で：表示动作发生的场所或手段');
        }
        if (text.includes('は')) {
            review.push('は：提示主题，说明这个名词的性质或作用');
        }
        if (text.includes('が')) {
            review.push('が：标记主语、存在物或被强调的信息');
        }
        if (text.includes('ために')) {
            review.push('ために：表示目的，“为了……”');
        }
        if (text.includes('てから')) {
            review.push('てから：表示动作顺序，“做完之后……”');
        }
        if (text.includes('ながら')) {
            review.push('ながら：表示两个动作同时进行');
        }
        if (text.includes('ように')) {
            review.push('ように：表示目的、提醒或避免某种情况');
        }
        if (text.includes('まで')) {
            review.push('まで：表示持续到某个时间点或事件发生');
        }
        if (text.includes('ば')) {
            review.push('ば：表示条件，“如果……”');
        }
        if (text.includes('かどうか')) {
            review.push('かどうか：表示“是否……”');
        }
        if (text.includes('として')) {
            review.push('として：表示身份、用途或立场，“作为……”');
        }
        if (text.includes('うえで')) {
            review.push('うえで：表示“在……方面 / 为了……时”');
        }
        if (text.includes('において')) {
            review.push('において：表示范围或场合，“在……中”');
        }
        if (text.includes('を通して')) {
            review.push('を通して：表示媒介或经验路径，“通过……”');
        }
        if (text.includes('に応じて')) {
            review.push('に応じて：表示根据情况变化，“根据……”');
        }
        if (text.includes('観点から')) {
            review.push('観点から：表示判断角度，“从……观点来看”');
        }
        if (text.includes('頼らず')) {
            review.push('ず：表示否定连接，“不……”');
        }

        return [...new Set(review)];
    }

    function init() {
        Object.assign(elements, {
            levelSelector: document.getElementById('level-selector'),
            difficultyHint: document.getElementById('difficulty-hint'),
            levelOnboardingLayer: document.getElementById('level-onboarding-layer'),
            levelChoiceButtons: document.querySelectorAll('[data-level-choice]'),
            cameraLayer: document.getElementById('camera-layer'),
            cameraFeed: document.getElementById('camera-feed'),
            closeCameraBtn: document.getElementById('close-camera-btn'),
            captureBtn: document.getElementById('capture-btn'),
            scannerOverlay: document.getElementById('ai-scanning-overlay')
        });

        initLevelOnboarding();
        elements.levelSelector.addEventListener('change', () => {
            setLevel(elements.levelSelector.value, { persist: true, refresh: true });
        });
        updateDifficultyHint();

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

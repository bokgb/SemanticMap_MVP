(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    const elements = {};
    let currentStream = null;
    const LEVEL_STORAGE_KEY = 'semantic-map-selected-level';
    const REPAIR_GUIDE_COUNT_KEY = 'semantic-map-repair-guide-count-v1';
    const MAX_REPAIR_GUIDE_COUNT = 4;

    function updateDifficultyHint() {
        if (!elements.levelSelector || !elements.difficultyHint) return;

        state.currentLevel = elements.levelSelector.value;
        elements.difficultyHint.innerText = SM.i18n?.t?.(`difficulty.${elements.levelSelector.value}`)
            || SM.i18n?.t?.('difficulty.unknown')
            || '';
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
        } else {
            setLevel('N5', { persist: false, refresh: false });
        }

        if (!elements.levelOnboardingLayer) return;

        elements.levelOnboardingLayer.classList.add('hidden');
        SM.ui?.setBagHudHidden?.(false, 'level-onboarding');

        elements.levelChoiceButtons.forEach(button => {
            button.addEventListener('click', () => {
                const level = button.dataset.levelChoice || 'N5';
                setLevel(level, { persist: true, refresh: true });
                SM.ui?.setTutorialCurtain?.(true);
                elements.levelOnboardingLayer.classList.add('hidden');
                SM.ui?.setBagHudHidden?.(false, 'level-onboarding');
            });
        });
    }

    function hasSelectedLevel() {
        return Boolean(localStorage.getItem(LEVEL_STORAGE_KEY));
    }

    function showLevelChoice(onComplete) {
        const isJa = SM.i18n?.getLang?.() === 'ja';
        const choices = [
            { value: 'N5', label: isJa ? 'ライト練習  N5-N4' : '轻量练习  N5-N4' },
            { value: 'N3', label: isJa ? '標準練習  N3-N2' : '标准练习  N3-N2' },
            { value: 'N1', label: isJa ? 'チャレンジ練習  N1+' : '挑战练习  N1+' }
        ].map(choice => ({
            ...choice,
            onSelect: level => {
                setLevel(level, { persist: true, refresh: true });
                SM.ui?.setTutorialCurtain?.(true);
                if (typeof onComplete === 'function') onComplete(level);
            }
        }));

        SM.ui?.showGuideChoice?.(SM.i18n?.t?.('levelChoicePrompt') || '', choices, {
            type: 'info',
            curtain: true
        });
    }

    async function openCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            SM.ui?.showToast(SM.i18n?.t?.('cameraUnsupported'), { type: 'error', duration: 4200 });
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
            SM.ui?.showToast(SM.i18n?.t?.('cameraOpenFailed', { message: err.message }), { type: 'error', duration: 4200 });
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

    function captureFrameAsDataUrl() {
        const video = elements.cameraFeed;
        if (!video || !video.videoWidth || !video.videoHeight) {
            throw new Error(SM.i18n?.t?.('cameraNotReady') || '');
        }

        const maxSide = 768;
        const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataURL = canvas.toDataURL('image/jpeg', 0.68);
        return dataURL;
    }

    function captureFrameAsBase64() {
        return captureFrameAsDataUrl().split(',')[1];
    }

    async function callRealVisionAI() {
        let base64Image = "";
        let photoDataUrl = "";
        try {
            photoDataUrl = captureFrameAsDataUrl();
            base64Image = photoDataUrl.split(',')[1];
        } catch (error) {
            SM.ui?.showToast(SM.i18n?.t?.('captureFailed', { message: error.message }), { type: 'error', duration: 4200 });
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
        普通地点任务请优先判断“把这个名词填进句子后是否通顺、符合现场逻辑”。不要因为 tag 不是目标语义标签就判失败。
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

        【词汇提取绝对原则】：word.text 必须是短的卡牌名，优先 1 个普通名词，不要返回品牌、颜色、用途、材质、型号等长说明。
        例：白板用马克笔请返回「マーカー」或「ペン」，不要返回「ホワイトボードマーカー」。矿泉水请返回「水」，不要返回完整商品名。
        如果短名词足以完成句子，就必须用短名词。

        ${levelInstructions[currentLevel]}

        严格返回 JSON 格式：
        {
            "word": { "text": "日文", "kana": "假名", "zh": "中文" },
            "pos": "名词",
            "tag": "必须从以下选择其一：Food, Nature, Transit, Retail, Health, Item",
            "tagColor": "对应的十六进制颜色",
            "example": { "s": "日文例句", "k": "假名", "z": "中文" },
            "fits_sentence": true/false (普通地点任务必须填写；只要填进目标文型后句子通顺且符合现场逻辑，就填 true),
            "fit_reason": "一句很短的理由",
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
                response_mime_type: "application/json",
                temperature: 0.2,
                maxOutputTokens: 512
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
                SM.ui?.showToast(SM.i18n?.t?.('aiError', {
                    message: data.error.message || SM.i18n?.t?.('backendLog')
                }), { type: 'error', duration: 4200 });
                return null;
            }

            if (!response.ok) {
                throw new Error(SM.i18n?.t?.('apiRejected', {
                    message: data.error?.message || response.status
                }) || `API 拒绝请求: ${data.error?.message || response.status}`);
            }

            const resultTextPart = data?.candidates?.[0]?.content?.parts?.find(part => typeof part.text === 'string');
            if (!resultTextPart) {
                throw new Error(SM.i18n?.t?.('aiNoText') || '');
            }

            let resultText = resultTextPart.text;
            resultText = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim();

            const aiResult = JSON.parse(resultText);
            const normalizedResult = SM.inventory.normalizeAiResult(aiResult);
            if (normalizedResult) {
                normalizedResult.capturePhoto = photoDataUrl;
            }
            return normalizedResult;
        } catch (error) {
            console.error("AI 识别失败:", error);
            SM.ui?.showToast(SM.i18n?.t?.('aiFailed', { message: error.message }), { type: 'error', duration: 4200 });

            const fallbackResult = SM.inventory.normalizeAiResult({
                word: {
                    text: SM.i18n?.t?.('unknownItem') || "",
                    kana: "",
                    zh: SM.i18n?.t?.('recognitionFailed') || ""
                },
                pos: SM.i18n?.t?.('noun') || "",
                tag: "Item",
                tagColor: "#687174",
                example: { s: "", k: "", z: "" }
            });
            if (fallbackResult) {
                fallbackResult.capturePhoto = photoDataUrl;
            }
            return fallbackResult;
        }
    }

    async function handleCapture() {
        elements.cameraLayer.classList.add('flash-effect');
        setTimeout(() => elements.cameraLayer.classList.remove('flash-effect'), 150);

        if (navigator.vibrate) navigator.vibrate(50);

        const originalText = elements.captureBtn.innerText;
        elements.captureBtn.innerText = SM.i18n?.t?.('parsing') || "";
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
            SM.ui?.showToast(SM.i18n?.t?.('flowError', { message: error.message }), { type: 'error', duration: 4200 });
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
            SM.ui?.showToast(SM.i18n?.t?.('scanFirst'), { type: 'warning' });
            return;
        }

        const isCatQuest = activeQuest.type === 'NPC';
        const isTutorialQuest = activeQuest.type === 'TUTORIAL';
        const isCatFoodLike = isCatQuest && isLooseCatFood(aiResult);
        const fitsSentence = aiResult.fits_sentence !== false;
        const isQuestMatch = isTutorialQuest
            ? hasRecognizedTutorialObject(aiResult)
            : isCatQuest
                ? aiResult.tag === activeQuest.requiredTag || isCatFoodLike
                : fitsSentence;

        if (isQuestMatch) {
            if (activeQuest.type === 'NPC') {
                aiResult.tag = 'Food';
                const areaResult = SM.map?.recordCatComplete?.(activeQuest);
                const areaName = SM.map?.getAreaName?.(areaResult?.area) || '';
                if (areaResult?.justPurified) {
                    SM.ui?.showToast(`${SM.i18n?.t?.('catRescue')} +${areaResult.addedPoints}\n${areaName} ${SM.i18n?.t?.('purified')}`, { type: 'success', duration: 3600 });
                } else if (areaResult?.addedPoints) {
                    SM.ui?.showToast(`${SM.i18n?.t?.('catRescue')} +${areaResult.addedPoints}\n${areaName} ${Math.min(areaResult.repairPoints, areaResult.requiredPoints)}/${areaResult.requiredPoints}`, { type: 'success', duration: 3600 });
                } else {
                    SM.ui?.showToast(SM.i18n?.t?.('catFed', { word: aiResult.word.text }), { type: 'success' });
                }
                SM.map?.clearCatEvent?.(activeQuest.marker);
            } else if (activeQuest.type === 'POI' || activeQuest.type === 'TUTORIAL') {
                const finishedSentence = activeQuest.text.replace('[ ? ]', `[ ${aiResult.word.text} ]`);
                aiResult.quest = {
                    level: activeQuest.level,
                    grammar: activeQuest.grammar,
                    review: buildGrammarReview(activeQuest, aiResult.word.text, 'zh'),
                    reviewJa: buildGrammarReview(activeQuest, aiResult.word.text, 'ja'),
                    sentence: finishedSentence,
                    location: activeQuest.spot?.name || '',
                    spotType: activeQuest.spot?.type || '',
                    requiredTag: activeQuest.requiredTag
                };
                aiResult.capture = {
                    id: `capture_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    photo: aiResult.capturePhoto || '',
                    spotId: activeQuest.spot?.id || '',
                    spotName: activeQuest.spot?.name || '',
                    spotType: activeQuest.spot?.type || '',
                    lat: Number(activeQuest.spot?.lat),
                    lng: Number(activeQuest.spot?.lng)
                };
            }

            let repairGuideLines = null;
            SM.inventory.showWordDetailCard(aiResult);
            SM.quests.completeQuest(activeQuest);
            SM.map?.clearCollapseErrorZone?.(activeQuest.marker);
            if (activeQuest.type === 'TUTORIAL') {
                SM.map?.grantExplorerReward?.({ type: activeQuest.rarity || 'N' });
                repairGuideLines = getRepairCompleteGuideLines(activeQuest);
                try {
                    localStorage.setItem('semantic-map-tutorial-pen-complete-v1', '1');
                } catch (error) {
                    console.warn('Failed to save tutorial quest state.', error);
                }
            }
            if (activeQuest.type === 'POI' && SM.map?.recordQuestComplete) {
                const areaResult = SM.map.recordQuestComplete(activeQuest);
                const areaName = SM.map?.getAreaName?.(areaResult?.area) || '';
                repairGuideLines = getRepairCompleteGuideLines(activeQuest, areaResult, areaName);
                if (areaResult?.justPurified) {
                    SM.ui?.showToast(`${SM.i18n?.t?.('areaPurified')}\n${areaName} ${Math.min(areaResult.repairPoints, areaResult.requiredPoints)}/${areaResult.requiredPoints}`, { type: 'success', duration: 3600 });
                } else if (areaResult?.addedPoints) {
                    SM.ui?.showToast(`${SM.i18n?.t?.('areaRepair')} +${areaResult.addedPoints}\n${areaName} ${Math.min(areaResult.repairPoints, areaResult.requiredPoints)}/${areaResult.requiredPoints}`, { type: 'success' });
                } else if (areaResult?.outsideArea) {
                    SM.ui?.showToast(SM.i18n?.t?.('outsidePracticeDone'), { type: 'info', duration: 3200 });
                }
            }
            document.getElementById('quest-layer').classList.add('hidden');
            if (repairGuideLines?.length) {
                SM.ui?.showGuideSequence?.(repairGuideLines, { type: 'success' });
            }
            state.activeQuest = null;
        } else {
            showWrongObjectDialog(activeQuest, aiResult);
            state.activeQuest = null;
        }
    }

    function showWrongObjectDialog(activeQuest, aiResult) {
        if (activeQuest?.type === 'NPC') {
            SM.ui?.showDialog({
                title: SM.i18n?.t?.('wrongTitle'),
                message: SM.i18n?.t?.('wrongCatMessage', { word: aiResult.word.text }),
                buttonText: SM.i18n?.t?.('tryAgain'),
                type: 'warning'
            });
            return;
        }

        SM.ui?.showDialog({
            title: SM.i18n?.t?.('wrongTitle'),
            message: SM.i18n?.t?.('wrongMessage', { word: aiResult.word.text }),
            buttonText: SM.i18n?.t?.('tryAgain'),
            type: 'warning'
        });
    }

    function getRepairGuideCount() {
        try {
            return Number(localStorage.getItem(REPAIR_GUIDE_COUNT_KEY) || '0') || 0;
        } catch (error) {
            return state.repairGuideCount || 0;
        }
    }

    function setRepairGuideCount(count) {
        state.repairGuideCount = count;
        try {
            localStorage.setItem(REPAIR_GUIDE_COUNT_KEY, String(count));
        } catch (error) {
            // localStorage can fail in private mode; in-memory state is enough for this session.
        }
    }

    function takeRepairGuideLines(lines) {
        if (!lines?.length) return null;
        setRepairGuideCount(getRepairGuideCount() + 1);
        return lines;
    }

    function getRepairCompleteGuideLines(activeQuest, areaResult, areaName) {
        const guideCount = getRepairGuideCount();
        if (guideCount >= MAX_REPAIR_GUIDE_COUNT) return null;

        const isJa = SM.state?.currentLang === 'ja';
        const area = areaName || (isJa ? 'このエリア' : '这个区域');

        if (activeQuest?.type === 'TUTORIAL') {
            return takeRepairGuideLines(isJa
                ? [
                    '同期成功。写真が、デジタル世界の空白に応えた。',
                    '覚えておいて。撮影は、あなたとこの世界をつなぐ方法だよ。',
                    '近くでまだ崩壊ノードが明滅している。行こう、次の断裂も修復しよう。'
                ]
                : [
                    '同步成功。照片回应了数字世界的空白。',
                    '记住这种感觉。拍照就是你和这个世界连接的方式。',
                    '旁边还有崩壊ノード在闪烁。去吧，把下一处断裂也修好。'
                ]);
        }

        if (areaResult?.justPurified) {
            return takeRepairGuideLines(isJa
                ? [
                    `やった、${area} の異常コアは沈黙した。`,
                    'この一帯の地図は現実側へ戻った。あなたは今、ひとつのエリアを救ったんだ。',
                    'でもデジタル世界はまだ完全じゃない。近くの崩壊ノードへ進もう、選ばれし者。'
                ]
                : [
                    `太好了，${area} 的异常核心已经沉默。`,
                    '这一带的地图回到了现实侧。你刚刚确实拯救了一个区域。',
                    '不过数字世界还没有完全恢复。附近仍有新的崩壊ノード，继续前进吧，选ばれし者。'
                ]);
        }

        if (areaResult?.addedPoints) {
            const jaVariants = [
                [
                    `ありがとう、選ばれし者。${area} の崩壊波形は押さえ込めた。`,
                    '現実の映像がデジタル世界の断層をつないだ。この場所は、ひとまず救われたよ。',
                    'でも近くにまだ崩壊ノードが広がっている。裂け目が閉じる前に、次も片付けよう。'
                ],
                [
                    `見えた？ ${area} の黒いノイズが、あなたの一枚でほどけた。`,
                    '写真はただの記録じゃない。現実側から送る修復コードなんだ。',
                    '次の崩壊ノードも近い。連鎖する前に、もう一度同期しよう。'
                ],
                [
                    `${area} の地図信号が戻ってきた。いい判断だったよ。`,
                    '崩壊はまだ浅い。今なら、あなたの視界で食い止められる。',
                    '隣の異常反応へ向かって。ここからが本当の調査だ。'
                ]
            ];
            const zhVariants = [
                [
                    `谢谢你，选ばれし者。${area} 的崩坏波形已经被压制。`,
                    '现实的影像接上了数字世界的断层，这片区域暂时得救了。',
                    '但是旁边还有崩壊ノード在扩散。趁裂缝还没合拢，顺势把它也解决吧。'
                ],
                [
                    `看到了吗？${area} 的黑色噪声，被你这一张照片撕开了。`,
                    '拍照不是记录，是从现实侧发出的修复代码。',
                    '下一个崩壊ノード就在附近。趁它还没连锁扩散，再同步一次。'
                ],
                [
                    `${area} 的地图信号回来了。判断不错，修复者。`,
                    '这次崩坏还很浅，现在正是把它压回去的窗口期。',
                    '去旁边的异常反应吧。从这里开始，才是真正的调查。'
                ]
            ];
            const variants = isJa ? jaVariants : zhVariants;
            const variantIndex = Math.max(0, Math.min(guideCount - 1, variants.length - 1));
            return takeRepairGuideLines(variants[variantIndex]);
        }

        return null;
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

    function hasRecognizedTutorialObject(aiResult) {
        const wordText = String(aiResult?.word?.text || '').trim();
        const wordZh = String(aiResult?.word?.zh || '').trim();
        const combined = `${wordText} ${wordZh}`.toLowerCase();
        if (!wordText) return false;

        const invalidWords = [
            'unknown',
            'unknown item',
            'recognition failed',
            '不明',
            '未知',
            '识别失败',
            '認識失敗',
            '不明な物体'
        ];

        return !invalidWords.some(word => combined.includes(word.toLowerCase()));
    }

    function buildGrammarReview(quest, wordText, lang = SM.i18n?.getLang?.() || 'zh') {
        if (!quest) return [];

        const text = quest.text || '';
        const review = [];
        const isJa = lang === 'ja';

        if (quest.grammar) {
            review.push(isJa ? `文型：${quest.grammar}` : `文型：${quest.grammar}`);
        }
        if (text.includes('を')) {
            review.push(isJa ? `を：「${wordText}」を動作の対象として示す` : `を：把「${wordText}」标记为动作对象`);
        }
        if (text.includes('に')) {
            review.push(isJa ? 'に：目標、到達点、存在場所を示す' : 'に：表示目标、到达点或存在位置');
        }
        if (text.includes('で')) {
            review.push(isJa ? 'で：動作が行われる場所や手段を示す' : 'で：表示动作发生的场所或手段');
        }
        if (text.includes('は')) {
            review.push(isJa ? 'は：主題を提示し、その性質や役割を説明する' : 'は：提示主题，说明这个名词的性质或作用');
        }
        if (text.includes('が')) {
            review.push(isJa ? 'が：主語、存在物、強調される情報を示す' : 'が：标记主语、存在物或被强调的信息');
        }
        if (text.includes('ために')) {
            review.push(isJa ? 'ために：目的を示す' : 'ために：表示目的，“为了……”');
        }
        if (text.includes('てから')) {
            review.push(isJa ? 'てから：動作の順序を示す' : 'てから：表示动作顺序，“做完之后……”');
        }
        if (text.includes('ながら')) {
            review.push(isJa ? 'ながら：二つの動作が同時に行われることを示す' : 'ながら：表示两个动作同时进行');
        }
        if (text.includes('ように')) {
            review.push(isJa ? 'ように：目的、注意、回避を示す' : 'ように：表示目的、提醒或避免某种情况');
        }
        if (text.includes('まで')) {
            review.push(isJa ? 'まで：ある時点や出来事までの継続を示す' : 'まで：表示持续到某个时间点或事件发生');
        }
        if (text.includes('ば')) {
            review.push(isJa ? 'ば：条件を示す' : 'ば：表示条件，“如果……”');
        }
        if (text.includes('かどうか')) {
            review.push(isJa ? 'かどうか：ある事柄が成立するかどうかを示す' : 'かどうか：表示“是否……”');
        }
        if (text.includes('として')) {
            review.push(isJa ? 'として：立場、用途、役割を示す' : 'として：表示身份、用途或立场，“作为……”');
        }
        if (text.includes('うえで')) {
            review.push(isJa ? 'うえで：ある行為や判断の前提・場面を示す' : 'うえで：表示“在……方面 / 为了……时”');
        }
        if (text.includes('において')) {
            review.push(isJa ? 'において：範囲や場面を示す' : 'において：表示范围或场合，“在……中”');
        }
        if (text.includes('を通して')) {
            review.push(isJa ? 'を通して：媒介や経験の経路を示す' : 'を通して：表示媒介或经验路径，“通过……”');
        }
        if (text.includes('に応じて')) {
            review.push(isJa ? 'に応じて：状況に合わせて変わることを示す' : 'に応じて：表示根据情况变化，“根据……”');
        }
        if (text.includes('観点から')) {
            review.push(isJa ? '観点から：判断の視点を示す' : '観点から：表示判断角度，“从……观点来看”');
        }
        if (text.includes('頼らず')) {
            review.push(isJa ? 'ず：否定の接続を示す' : 'ず：表示否定连接，“不……”');
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
        updateDifficultyHint,
        hasSelectedLevel,
        showLevelChoice
    };
})();

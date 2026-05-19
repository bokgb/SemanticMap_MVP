// 初始化地图，加入视距限制和 UI 隐藏
const DEV_MODE = new URLSearchParams(window.location.search).get('dev') === '1'
    || localStorage.getItem('semantic-map-dev-mode') === '1';
const DEFAULT_CENTER = [34.6937, 135.5023];
let currentLang = 'zh';
let activeQuest = null;
let lastPlayerPosition = { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };

let map = L.map('map', {
    zoomControl: false,  
    minZoom: 16,         
    maxZoom: 18,         
    zoomSnap: 0.5        
}).setView(DEFAULT_CENTER, 17); 

// 【新增】用来记住每个地点已经生成的稀有度和任务，防止地图刷新时变异
const QUEST_CACHE_STORAGE_KEY = 'semantic-map-quest-cache-v1';
const questCache = {};
const COOLDOWN_TIME = 1000 * 60 * 60 * 2;

function getSpotKey(spot) {
    return spot.id ? spot.id : `${spot.lat.toFixed(5)}_${spot.lng.toFixed(5)}`;
}

function createCompletedMarkerIcon() {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: #555; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; opacity: 0.6;">✅</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

function loadQuestCache() {
    try {
        const rawCache = localStorage.getItem(QUEST_CACHE_STORAGE_KEY);
        if (!rawCache) return;

        const parsedCache = JSON.parse(rawCache);
        if (parsedCache && typeof parsedCache === 'object') {
            Object.assign(questCache, parsedCache);
        }
    } catch (error) {
        console.warn('读取任务缓存失败，继续使用内存缓存。', error);
    }
}

function saveQuestCache() {
    try {
        localStorage.setItem(QUEST_CACHE_STORAGE_KEY, JSON.stringify(questCache));
    } catch (error) {
        console.warn('保存任务缓存失败，仅保留当前页面内缓存。', error);
    }
}

loadQuestCache();

// 挂载 OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

let playerMarker = L.marker(DEFAULT_CENTER).addTo(map);
let statusText = document.getElementById('status-text');
let allSpots = []; // 存放从 JSON 洗出来的所有地标
let dynamicMarkersLayer = L.layerGroup().addTo(map); // 专门用来放动态标记的图层

// 【新增】：标志位，确保猫咪只生成一次
let catSpawned = false;

// 【新增】任务稀有度与句型模板库
// 修复后的任务模板库
const QUEST_TEMPLATES = {
    convenience: [
        { rarity: 'N', weight: 0.7, text: "[ ? ] を 買う", req: "Food", reward: 1 },
        { rarity: 'R', weight: 0.2, text: "[ 冷たい ] [ ? ] を 買う", req: "Food", reward: 2 }, // 拍冷饮
        { rarity: 'SR', weight: 0.1, text: "[ ? ] を 温める", req: "Food", reward: 3 } // 拍便当
    ],
    park: [
        { rarity: 'N', weight: 0.7, text: "[ ? ] を 見る", req: "Nature", reward: 1 },
        { rarity: 'R', weight: 0.2, text: "[ 静かな ] [ ? ] で 休む", req: "Nature", reward: 2 }, // 拍长椅
        { rarity: 'SR', weight: 0.1, text: "[ 赤い ] [ ? ] を 見つける", req: "Nature", reward: 3 } // 拍红花
    ],
    station: [
        { rarity: 'N', weight: 0.7, text: "[ ? ] に 乗る", req: "Transit", reward: 1 },
        { rarity: 'R', weight: 0.3, text: "[ ? ] を 買う", req: "Transit", reward: 2 } // 拍车票/西瓜卡
    ],
    pharmacy: [
        { rarity: 'N', weight: 0.7, text: "[ ? ] を 探す", req: "Health", reward: 1 },
        { rarity: 'R', weight: 0.3, text: "[ 痛い ] から [ ? ] を 飲む", req: "Health", reward: 2 }
    ],
    // 【新增】：流浪猫专属 SSR 任务
    npc_cat: [
        { rarity: 'SSR', weight: 1.0, text: "猫 に [ ? ] を あげる", req: "Food", reward: 3 }
    ]
};

// 稀有度颜色配置（新增 SSR 猛男粉色）
const RARITY_CONFIG = {
    'N':  { color: '#9e9e9e', label: '普通', scale: 1.0 },
    'R':  { color: '#3f51b5', label: '稀有', scale: 1.2 },
    'SR': { color: '#ff9800', label: '超稀有', scale: 1.5 },
    'SSR': { color: '#e91e63', label: '极光稀有', scale: 1.8 } // 猫咪专属大小和颜色
};

// 获取 GPS 位置
if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            lastPlayerPosition = { lat, lng };

            statusText.innerText = `坐标更新成功：\n纬度 ${lat.toFixed(4)}\n经度 ${lng.toFixed(4)}`;
            map.setView([lat, lng], 16); 
            playerMarker.setLatLng([lat, lng]);
            // 【新增】：GPS 定位成功，自动生成猫咪（只生成一次）
            if (DEV_MODE && !catSpawned) {
                catSpawned = true;
                spawnTestCat();
            }


            // 【新增】：每次真实的脚步移动，才触发一次雷达扫描！
            updateVisibleSpots(lat, lng);


        },
        (error) => {
            console.warn("定位获取失败，使用默认演示位置:", error);
            statusText.innerText = "GPS 定位失败，已切换到关西演示位置";
            map.setView(DEFAULT_CENTER, 16);
            playerMarker.setLatLng(DEFAULT_CENTER);
            updateVisibleSpots(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
        },
        { enableHighAccuracy: true, maximumAge: 0 }
    );
} else {
    statusText.innerText = "你的设备不支持 GPS，已切换到关西演示位置";
    updateVisibleSpots(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
}

// --- 取景器与相机逻辑 ---
const scanBtn = document.getElementById('scan-btn');
const levelSelector = document.getElementById('level-selector');
const difficultyHint = document.getElementById('difficulty-hint');
const cameraLayer = document.getElementById('camera-layer');
const cameraFeed = document.getElementById('camera-feed');
const closeCameraBtn = document.getElementById('close-camera-btn');
const captureBtn = document.getElementById('capture-btn');

let currentStream = null;

function updateDifficultyHint() {
    if (!levelSelector || !difficultyHint) return;

    const hintMap = {
        N5: '当前难度：N5 - 新手',
        N3: '当前难度：N3 - 进阶',
        N1: '当前难度：N1 - 专家'
    };

    difficultyHint.innerText = hintMap[levelSelector.value] || '当前难度：未知';
    difficultyHint.dataset.level = levelSelector.value;
}

if (levelSelector) {
    levelSelector.addEventListener('change', updateDifficultyHint);
    updateDifficultyHint();
}

scanBtn.addEventListener('click', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("当前浏览器不支持摄像头调用，请使用 HTTPS 或 localhost 环境。");
        return;
    }

    cameraLayer.style.display = 'flex';
    captureBtn.disabled = true;
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        cameraFeed.srcObject = currentStream;
        await cameraFeed.play();
        captureBtn.disabled = false;
    } catch (err) {
        cameraLayer.style.display = 'none';
        activeQuest = null;
        alert("无法调用摄像头\n错误信息: " + err.message);
    }
});

closeCameraBtn.addEventListener('click', () => {
    cameraLayer.style.display = 'none'; 
    captureBtn.disabled = false;
    closeCameraBtn.disabled = false;
    if (currentStream) currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
    cameraFeed.srcObject = null;
});

// ==========================================
// 🧠 真实的 AI 视觉识别引擎 (Gemini API 示例)
// ==========================================



// 1. 负责把摄像头当前画面截取为 Base64 编码的图片
function captureFrameAsBase64() {
    const video = document.getElementById('camera-feed');
    if (!video || !video.videoWidth || !video.videoHeight) {
        throw new Error("摄像头画面尚未准备好，请稍等一秒再拍。");
    }
    // 创建一个隐形的画布
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // 把视频的当前帧画到画布上
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 导出为 JPEG 格式的 Base64 字符串（去掉开头的数据头）
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    return dataURL.split(',')[1]; 
}

// 2. 核心大招：调用真实的 AI 接口
async function callRealVisionAI() {
    let base64Image = "";
    try {
        base64Image = captureFrameAsBase64();
    } catch (error) {
        alert(`无法拍摄当前画面：${error.message}`);
        return null;
    }
    
    // 【核心新增 1】：获取玩家当前选择的难度
    const currentLevel = levelSelector?.value || 'N5';
    
    // 【修改点 1】：把指令焦点全部转移到“例句生成”上
    const levelInstructions = {
        'N5': "【例句要求】：使用 JLPT N5-N4 级别的极简基础语法（如 です/ます、～を食べる）。句子要短，非常直白，汉字必须标注假名。",
        'N3': "【例句要求】：使用 JLPT N3-N2 级别的进阶日常语法（如 被动、使役、～てしまう、～かもしれない）。句子要像当地人日常交流，包含适度的细节或情感描写。",
        'N1': "【例句要求】：使用 JLPT N1 级别的高级书面语法或专业表达（如 ～ざるを得ない、～にほかならない、四字熟语）。句子要结构复杂，带有强烈的议论、说明或文学色彩。"
    };

    // 【修改点 2】：给物品命名加上“常识紧箍咒” 并在高稀有度任务时要求额外掉落字段
    const rewardPrompt = (activeQuest && activeQuest.rarity && activeQuest.rarity !== 'N')
        ? `【奖励模式】：由于这是${activeQuest.rarity}级任务，除了主单词外，请额外提供2个与其相关的形容词或动词，放入字段 "extra_words" 中。每个元素包含 {"text","kana","zh","pos"}。`
        : "";
    // 【新增】：小猫喂食任务的安全判定规则
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

    const url = '/api/gemini';
    
    // Gemini REST API 的图片字段使用 snake_case。
    const requestBody = {
        contents: [{
            parts: [
                { text: promptText },
                { inline_data: { mime_type: "image/jpeg", data: base64Image } }
            ]
        }],
        generationConfig: {
            response_mime_type: "application/json",
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // 【新增的防崩溃拦截】
        if (data.error) {
            alert("🚨 AI 识别出错: " + (data.error.message || "请检查后端日志"));
            return null; // 终止执行，防止页面卡死
        }
        
        // 【新增排错】：拦截 API 本身的报错（如 Key 错误、格式错）
        if (!response.ok) {
            throw new Error(`API 拒绝请求: ${data.error?.message || response.status}`);
        }
        
        const resultTextPart = data?.candidates?.[0]?.content?.parts?.find(part => typeof part.text === 'string');
        if (!resultTextPart) {
            throw new Error("AI 没有返回可解析的文本结果。");
        }

        let resultText = resultTextPart.text;
        
        // 【核心修复】：暴力清除大模型可能返回的 Markdown 代码块标记！
        resultText = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        
        const aiResult = JSON.parse(resultText);
        return normalizeAiResult(aiResult);
        
    } catch (error) {
        console.error("AI 识别失败:", error);
        
        // 【核心排错工具】：直接在手机屏幕上把最真实的死因弹出来！
        alert(`🚨 系统排错：\n识别失败了！\n真实原因：${error.message}`);
        
        return normalizeAiResult({
            word: { text: "未知物品（エラー）", kana: "", zh: "识别失败" },
            pos: "名词",
            tag: "Item",
            tagColor: "#607D8B",
            example: { s: "", k: "", z: "" }
        });
    }
}

function completeActiveQuest(quest) {
    if (!quest || !quest.spot) return;

    questCache[getSpotKey(quest.spot)] = {
        status: 'completed',
        completedAt: Date.now()
    };
    saveQuestCache();

    if (quest.marker) {
        quest.marker.setIcon(createCompletedMarkerIcon());
        quest.marker.off('click');
    }
}

function queueExtraWordRewards(aiResult) {
    if (!aiResult || !Array.isArray(aiResult.extra_words) || aiResult.extra_words.length === 0) return;

    aiResult.extra_words.forEach((extra) => {
        const extraData = normalizeAiResult({
            word: { text: extra.text, kana: extra.kana, zh: extra.zh },
            pos: extra.pos || '名词',
            tag: aiResult.tag,
            tagColor: aiResult.tagColor,
            example: { s: "关联奖励单词", z: "奖励词汇" }
        });

        if (extraData) {
            rewardQueue.push(extraData);
        }
    });
}

// 监听“提取属性”按钮 (核心逻辑修改)
captureBtn.addEventListener('click', async () => {
    // 1. 白屏闪光反馈，稍微延长一点时间，增加“拍到了”的实感
    cameraLayer.classList.add('flash-effect');
    setTimeout(() => cameraLayer.classList.remove('flash-effect'), 150);

    // 2. 震动反馈 (如果是手机端且支持)
    if (navigator.vibrate) navigator.vibrate(50); 

    const originalText = captureBtn.innerText;
    captureBtn.innerText = "解析中...";
    captureBtn.disabled = true;
    closeCameraBtn.disabled = true; // 防止识别中途关掉相机

    // 3. 冻结摄像头画面，让玩家感觉画面定格了
    if (cameraFeed && typeof cameraFeed.pause === 'function') {
        cameraFeed.pause();
    }

    // 4. 显示极简的转圈遮罩
    const scannerOverlay = document.getElementById('ai-scanning-overlay');
    if (scannerOverlay) scannerOverlay.classList.remove('hidden');

    let aiResult = null;
    try {
        aiResult = await callRealVisionAI();
    } catch (error) {
        console.error("AI 识别流程异常:", error);
        alert(`🚨 识别流程异常：${error.message}`);
    } finally {
        // 6. 恢复所有状态
        if (cameraFeed && typeof cameraFeed.play === 'function' && cameraFeed.srcObject) {
            cameraFeed.play().catch(() => {});
        }
        if (scannerOverlay) scannerOverlay.classList.add('hidden');
        
        captureBtn.innerText = originalText;
        captureBtn.disabled = false;
        closeCameraBtn.disabled = false;
        
        closeCameraBtn.click(); // 识别完自动关掉相机层
    }

    if (!aiResult || !aiResult.word) {
        activeQuest = null;
        return;
    }

    // 【融合点 4】：判断拍照后的去向
    if (activeQuest) {
        if (aiResult.tag === activeQuest.requiredTag) {
            
            // 🟢 AI 判定标签正确：任务成功分岔
            if (activeQuest.type === 'NPC') {
                // 【新增核心】：AI 兽医的死亡拦截！
                if (aiResult.is_safe === false) {
                    alert(`❌ 喂食失败！AI 兽医紧急警告：\n${aiResult.danger_reason}`);
                    activeQuest = null;
                    return; // 中断，不给奖励
                }
                alert(`🐱 喵~！\n流浪猫开心地吃下了【${aiResult.word.text}】！\n成功组合：猫 に [ ${aiResult.word.text} ] を あげる`);
            } else if (activeQuest.type === 'POI') {
                // 动态替换掉 [ ? ] 显示给玩家看
                const finishedSentence = activeQuest.text.replace('[ ? ]', `[ ${aiResult.word.text} ]`);
                alert(`🎉 任务完成！\n成功组合：${finishedSentence}\n区域已净化！`);
            }

            queueExtraWordRewards(aiResult);

            // 先弹出主单词卡片
            showWordDetailCard(aiResult);

            completeActiveQuest(activeQuest);

            // 关闭任务面板
            document.getElementById('quest-layer').classList.add('hidden');

            activeQuest = null; // 任务清空
        } else {
            // 🔴 AI 判定标签错误：任务失败分岔
            if (activeQuest.type === 'NPC') {
                alert(`😾 喵？\n流浪猫闻了闻【${aiResult.word.text}】，嫌弃地走开了。\n（提示：你需要拍【Food】类的物品！）`);
            } else {
                alert(`❌ 语境不符！\n你拍到了【${aiResult.word.text}】，但这东西不能“吃”哦。`);
            }
            activeQuest = null; 
        }
    } else {
        // 如果没任务（自由探索拍照），弹出单词详情卡片
        showWordDetailCard(aiResult);
    }
});

// --- 新增：便利店任务相关的交互逻辑 ---
document.getElementById('btn-close-quest').addEventListener('click', () => {
    activeQuest = null;
    document.getElementById('quest-layer').classList.add('hidden');
});

document.getElementById('btn-start-scan').addEventListener('click', () => {
    // 【关键修复 1】：内鬼代码已被删掉，保留原汁原味的任务数据！
    document.getElementById('quest-layer').classList.add('hidden');
    scanBtn.click(); // 自动帮你点开相机！
});

// --- 背包与 UI 逻辑 ---
let playerInventory = []; 
const bagBtn = document.getElementById('bag-btn');
const closeBagBtn = document.getElementById('close-bag-btn');
const inventoryLayer = document.getElementById('inventory-layer');
const bagBadge = document.getElementById('bag-badge');
let collectedWordsCount = 0;

bagBtn.addEventListener('click', () => {
    inventoryLayer.classList.add('open');
    bagBadge.style.display = 'none'; 
});

closeBagBtn.addEventListener('click', () => {
    inventoryLayer.classList.remove('open');
});


// --- 自由组合任务逻辑 ---
const comboLayer = document.getElementById('combo-layer');
const slotAdj = document.getElementById('slot-adj'); // 新增
const slotNoun = document.getElementById('slot-noun');
const slotVerb = document.getElementById('slot-verb');
const btnSubmit = document.getElementById('btn-submit-combo');
let currentAdj = null; // 新增
let currentNoun = null;
let currentVerb = null;

window.currentComboTag = null;
window.currentComboSpot = null;

// UI 面板的折叠/展开逻辑
const uiLayer = document.getElementById('ui-layer');
const uiToggleBtn = document.getElementById('ui-toggle-btn');
if (uiToggleBtn && uiLayer) {
    // 从 localStorage 读取上次状态
    const collapsed = localStorage.getItem('uiLayerCollapsed') === '1';
    if (collapsed) uiLayer.classList.add('collapsed');
    uiToggleBtn.innerText = collapsed ? '▼' : '▲';

    uiToggleBtn.addEventListener('click', () => {
        const isCollapsed = uiLayer.classList.toggle('collapsed');
        // 切换按钮箭头方向
        uiToggleBtn.innerText = isCollapsed ? '▼' : '▲';
        localStorage.setItem('uiLayerCollapsed', isCollapsed ? '1' : '0');
    });
}

function pickWeightedTemplate(templates) {
    const rand = Math.random();
    let selectedTemplate = templates[0];
    let cumulativeWeight = 0;

    for (const template of templates) {
        cumulativeWeight += template.weight;
        if (rand < cumulativeWeight) {
            selectedTemplate = template;
            break;
        }
    }

    return selectedTemplate;
}

function buildQuestDataForSpot(spot, template) {
    const rarity = template.rarity;
    const config = RARITY_CONFIG[rarity] || RARITY_CONFIG['N'];

    return {
        rarity: rarity,
        text: template.text,
        config: config,
        requiredTag: spot.questTag,
        rewardCount: template.reward || 1
    };
}

function getQuestStateForSpot(spot) {
    const spotKey = getSpotKey(spot);
    const cache = questCache[spotKey];

    if (cache && cache.status === 'completed') {
        const timePassed = Date.now() - cache.completedAt;

        if (timePassed < COOLDOWN_TIME) {
            return { status: 'completed' };
        }

        delete questCache[spotKey];
        saveQuestCache();
    } else if (cache) {
        return { status: 'active', questData: cache };
    }

    const templates = QUEST_TEMPLATES[spot.type] || QUEST_TEMPLATES['convenience'];
    const questData = buildQuestDataForSpot(spot, pickWeightedTemplate(templates));
    questCache[spotKey] = questData;
    saveQuestCache();

    return { status: 'active', questData };
}

function createCompletedQuestMarker(spot) {
    const completedMarker = L.marker([spot.lat, spot.lng], { icon: createCompletedMarkerIcon() });
    completedMarker.spotData = spot;
    return completedMarker;
}

// 创建 POI Marker 时就决定稀有度和模板，便于玩家一眼识别
function createPoiMarker(spot) {
    const questState = getQuestStateForSpot(spot);
    if (questState.status === 'completed') {
        return createCompletedQuestMarker(spot);
    }

    const markerQuestData = questState.questData;

    // ==========================================
    // 下面继续用 markerQuestData 来画你的图标
    // ==========================================
    const config = markerQuestData.config || RARITY_CONFIG[markerQuestData.rarity] || RARITY_CONFIG['N'];
    const size = spot.type === 'npc_cat' ? 36 : Math.round(30 * (config.scale || 1));

    let iconHtml = "";
    if (spot.type === 'npc_cat') {
        iconHtml = `<div style="font-size: 28px; text-align: center; line-height: ${size}px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">🐱</div>`;
    } else {
        iconHtml = `<div style="
            background-color: ${config.color}; 
            width: 100%; height: 100%; 
            border-radius: 50%; 
            border: 2px solid white;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: bold; font-size: 10px;
            box-shadow: 0 0 10px ${config.color};">
            ${markerQuestData.rarity}
        </div>`;
    }

    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: iconHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });

    // 3. 创建 Marker 并将任务信息“绑定”到这个 Marker 对象上
    const marker = L.marker([spot.lat, spot.lng], { icon: customIcon });
    marker.spotData = spot;
    marker.questData = markerQuestData;

    // 4. 点击事件：直接读取已经定好的数据
    marker.on('click', () => {
        if (spot.type === 'park') {
            activeQuest = null;
            document.getElementById('task-desc').innerText = `区域异常：此公园需要【${spot.questTag}】相关的词汇组合来净化！`;
            window.currentComboTag = spot.questTag;
            window.currentComboSpot = spot;
            openComboPanel();
            return;
        }

        openQuestUI(marker.questData, spot, marker);
    });

    return marker;
}

function openQuestUI(data, spot, marker) {
    const questLayer = document.getElementById('quest-layer');
    const questTitle = questLayer.querySelector('.quest-content h3');
    const preview = questLayer.querySelector('.sentence-preview');

    // 设置界面颜色和文字
    questTitle.innerText = `${data.rarity}级任务：环境语义修复`;
    questTitle.style.color = data.config.color;

    // 渲染带插槽的句子
    preview.innerHTML = data.text.replace('[ ? ]', '<span class="slot-box">?</span>');

    // 记录当前活动任务（在 openQuestUI 内部）
    activeQuest = {
        type: spot.type === 'npc_cat' ? 'NPC' : 'POI', // 【核心修复】：区分是 NPC 还是普通地点
        rarity: data.rarity,
        text: data.text,
        requiredTag: data.requiredTag,
        rewardCount: data.rewardCount,
        spot: spot,
        marker: marker
    };

    document.querySelector('.location-tag').innerText = `${spot.emoji} ${spot.name}`;
    questLayer.classList.remove('hidden');
}

function openComboPanel() {
    comboLayer.classList.remove('hidden');
    renderComboWords(); 
}

document.getElementById('btn-close-combo').addEventListener('click', () => {
    comboLayer.classList.add('hidden');
    resetSlots();
    window.currentComboTag = null;
    window.currentComboSpot = null;
});

function renderComboWords() {
    const list = document.getElementById('combo-word-list');
    if (!list || !slotAdj || !slotNoun || !slotVerb) return;

    list.innerHTML = ''; 
    playerInventory.forEach((wordData) => {
        if (!wordData || !wordData.word || !wordData.word.text) return;

        const btn = document.createElement('div');
        btn.className = 'combo-word-item';
        btn.style.borderColor = wordData.tagColor; 
        
        // 【关键修复 3】：从 wordData.word 升级为 wordData.word.text
        btn.innerText = `${wordData.word.text} [${wordData.pos}]`;
        btn.addEventListener('click', () => {
            if (wordData.pos === '形容词' && !currentAdj) {
                // 【新增】：处理形容词的填入
                currentAdj = wordData;
                slotAdj.innerText = wordData.word.text;
                slotAdj.classList.add('filled');
                btn.classList.add('used');
            } else if (wordData.pos === '名词' && !currentNoun) {
                currentNoun = wordData;
                slotNoun.innerText = wordData.word.text; // 这里也要改
                slotNoun.classList.add('filled');
                btn.classList.add('used');
            } else if (wordData.pos === '动词' && !currentVerb) {
                currentVerb = wordData;
                slotVerb.innerText = wordData.word.text; // 这里也要改
                slotVerb.classList.add('filled');
                btn.classList.add('used');
            }
            checkComboReady();
        });
        list.appendChild(btn);
    });
}

function checkComboReady() {
    // 必须三个槽都填满才能激活提交按钮！
    if (btnSubmit) {
        btnSubmit.disabled = !(currentAdj && currentNoun && currentVerb);
    }
}

function resetSlots() {
    currentAdj = null; currentNoun = null; currentVerb = null;
    if(slotAdj) { slotAdj.innerText = '形容词'; slotAdj.classList.remove('filled'); }
    if(slotNoun) { slotNoun.innerText = '点击下方名词填入'; slotNoun.classList.remove('filled'); }
    if(slotVerb) { slotVerb.innerText = '点击下方动词填入'; slotVerb.classList.remove('filled'); }
    if(btnSubmit) btnSubmit.disabled = true;
}

// --- 升级版：Combo 结算逻辑 ---
btnSubmit.addEventListener('click', () => {
    // 只要有任何一个词的 Tag 匹配当前公园的需求（Nature）就算验证通过
    if (currentAdj.tag === window.currentComboTag || currentNoun.tag === window.currentComboTag || currentVerb.tag === window.currentComboTag) {
        // 【核心修改】：弹出拼接好的完美句子
        alert(`🎉 Combo 成功！你构筑了绝妙的句子：\n【 ${currentAdj.word.text} ${currentNoun.word.text} を ${currentVerb.word.text} 】`);
        comboLayer.classList.add('hidden');
        resetSlots();

        // 【关键修复 3】：从雷达的总数据库中彻底超度这个公园！
        if (window.currentComboSpot) {
            const spotIndex = allSpots.findIndex(s => s.lat === window.currentComboSpot.lat && s.lng === window.currentComboSpot.lng);
            if (spotIndex > -1) {
                allSpots.splice(spotIndex, 1); 
            }
        }

        if (window.currentComboSpot) {
            questCache[getSpotKey(window.currentComboSpot)] = {
                status: 'completed',
                completedAt: Date.now()
            };
            saveQuestCache();
        }
        
        // 💥 给公园的图标也加上炫酷的爆炸特效并消除！
        let actualMarkerOnMap = null;
        dynamicMarkersLayer.eachLayer(layer => {
            if (layer.spotData && window.currentComboSpot && layer.spotData.lat === window.currentComboSpot.lat && layer.spotData.lng === window.currentComboSpot.lng) {
                actualMarkerOnMap = layer;
            }
        });

        if (actualMarkerOnMap) {
            const iconElement = actualMarkerOnMap._icon;
            if (iconElement) {
                iconElement.classList.add('marker-destroy-fx');
                setTimeout(() => {
                    dynamicMarkersLayer.removeLayer(actualMarkerOnMap);
                }, 600);
            } else {
                dynamicMarkersLayer.removeLayer(actualMarkerOnMap);
            }
        }
        window.currentComboSpot = null;
        window.currentComboTag = null;
    } else {
        alert(`语境不匹配！\n提示：该区域需要【${window.currentComboTag}】相关的词汇。`);
        comboLayer.classList.add('hidden');
        resetSlots();
    }
});

// --- 核心注音渲染器 ---
function normalizeAiResult(result) {
    if (!result || !result.word || !result.word.text) return null;

    return {
        ...result,
        word: {
            text: String(result.word.text || ''),
            kana: String(result.word.kana || ''),
            zh: String(result.word.zh || '')
        },
        pos: result.pos || '名词',
        tag: result.tag || 'Item',
        tagColor: sanitizeColor(result.tagColor),
        example: result.example || { s: '', k: '', z: '' },
        extra_words: Array.isArray(result.extra_words) ? result.extra_words : []
    };
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function sanitizeColor(value, fallback = '#607D8B') {
    const color = String(value ?? '').trim();
    return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color) ? color : fallback;
}

function renderRubyWord(wordObj) {
    if (!wordObj || !wordObj.text) return "???";
    const text = escapeHtml(wordObj.text);
    const kana = escapeHtml(wordObj.kana);
    const zh = escapeHtml(wordObj.zh);

    // 如果没有假名，或者文本和假名一样（外来语），就不显示上方注音
    if (!wordObj.kana || wordObj.text === wordObj.kana) {
        return `<span>${text}</span> <span style="font-size:12px; color:#888;">(${zh})</span>`;
    }
    return `<ruby>${text}<rt>${kana}</rt></ruby> <span style="font-size:12px; color:#888;">(${zh})</span>`;
}

// 修复背包渲染逻辑
function addWordToInventory(data) {
    playerInventory.push(data);
    const list = document.getElementById('word-list');
    const block = document.createElement('div');
    block.className = 'word-block';
    const tagColor = sanitizeColor(data.tagColor);
    block.style.borderLeftColor = tagColor;
    // 使用新的渲染器！
    block.innerHTML = `
        <div class="word-title">${renderRubyWord(data.word)}</div>
        <div class="word-pos">[ ${escapeHtml(data.pos)} ]</div>
        <div class="word-tag" style="background-color: ${tagColor}">${escapeHtml(data.tag)}</div>
    `;
    list.prepend(block);

    collectedWordsCount++;
    if (!inventoryLayer.classList.contains('open')) {
        bagBadge.style.display = 'block';
        bagBadge.innerText = collectedWordsCount;
    }
}

// ==========================================
// 🃏 战利品展示系统 (Loot Card)
// ==========================================
let pendingWord = null; 
const rewardQueue = [];

function showNextQueuedReward() {
    const nextReward = rewardQueue.shift();
    if (nextReward) {
        showWordDetailCard(nextReward);
    }
}

function showWordDetailCard(aiData) {
    if (!aiData) return;

    const cardLayer = document.getElementById('word-card-layer');
    if (cardLayer && !cardLayer.classList.contains('hidden')) {
        rewardQueue.push(aiData);
        return;
    }

    pendingWord = aiData;
    
    // 渲染巨大的带注音的主单词
    document.getElementById('loot-word-main').innerHTML = renderRubyWord(aiData.word);
    
    // 渲染例句（如果 AI 返回了例句）
    if(aiData.example) {
        document.getElementById('loot-example-text').innerText = aiData.example.s;
        document.getElementById('loot-example-zh').innerText = aiData.example.z;
    } else {
        document.getElementById('loot-example-text').innerText = "没有找到合适的例句。";
        document.getElementById('loot-example-zh').innerText = "";
    }
    
    // 弹出卡片
    document.getElementById('word-card-layer').classList.remove('hidden');
}

// 绑定“存入背包”按钮的点击事件
document.getElementById('btn-collect-word').addEventListener('click', () => {
    document.getElementById('word-card-layer').classList.add('hidden');
    if (pendingWord) {
        addWordToInventory(pendingWord); // 真正存入背包
        pendingWord = null;
        alert("收录成功！右上角背包查看。");
    }
    showNextQueuedReward();
});

function toggleLanguage() {
    // 1. 切换状态
    currentLang = currentLang === 'zh' ? 'ja' : 'zh';
    
    // 2. 更改切换按钮自身文字
    const langBtn = document.getElementById('lang-toggle-btn');
    if(langBtn) {
        langBtn.innerText = currentLang === 'zh' ? '🇯🇵 日本語に切替 (Switch to JP)' : '🇨🇳 切回中文 (Switch to CN)';
    }

    // 3. 扫描所有带有 data-zh 和 data-ja 的元素并替换内部文本
    const translatableElements = document.querySelectorAll('[data-zh][data-ja]');
    translatableElements.forEach(el => {
        el.innerText = el.getAttribute(`data-${currentLang}`);
    });
    
    // 4. 处理带图标的特殊按钮 (背包)
    const bagBtnText = document.getElementById('bag-btn-text');
    if(bagBtnText) {
        bagBtnText.innerText = currentLang === 'zh' ? '背包' : 'リュック';
    }

    // (可选体验优化) 提示老师已切换
    // alert(currentLang === 'ja' ? '日本語モードに切り替えました！' : '已切回中文模式！');
}


// 🌍 OSM 数据驱动与动态视距渲染系统 (Viewport Culling)
// ==========================================

// 客户端只需要直接读取干净的数据！没有任何复杂的清洗逻辑！
async function loadOSMData() {
    try {
        // 直接读取你洗好的纯净版数据
        const response = await fetch('spotsData.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error("spotsData.json 格式不是数组");
        }

        allSpots = data; 
        
        console.log(`✅ 成功加载了 ${allSpots.length} 个烘焙好的地标！`);
        updateVisibleSpots(lastPlayerPosition.lat, lastPlayerPosition.lng);
    } catch (error) {
        console.error("加载数据失败", error);
        statusText.innerText = "地标数据加载失败，请检查 spotsData.json";
    }
}

// 核心雷达算法：广域搜索 + 多样性强制保底
function updateVisibleSpots(playerLat, playerLng) {
    if (allSpots.length === 0 || playerLat == null || playerLng == null) return;

    const playerLocation = L.latLng(playerLat, playerLng);
    dynamicMarkersLayer.clearLayers(); 

    // 【关键修改 1】：把搜索半径从 250 扩大到 1000 米！先广撒网
    let nearbySpots = allSpots
        .map(spot => ({ ...spot, distance: playerLocation.distanceTo([spot.lat, spot.lng]) }))
        .filter(spot => spot.distance < 1000) 
        .sort((a, b) => a.distance - b.distance);

    let selectedSpots = [];      
    let foundTypes = new Set();  

    // 第二步：【多样性强制保底】
    // 哪怕公园在 800 米外，只要它是最近的公园，也把它拉进来！
    for (let spot of nearbySpots) {
        if (!foundTypes.has(spot.questTag)) {
            selectedSpots.push(spot);
            foundTypes.add(spot.questTag);
        }
    }

    // 第三步：【名额填充】
    // 种类凑齐后，把身边最近的便利店塞进来，直到凑满 10 个
    for (let spot of nearbySpots) {
        if (selectedSpots.length >= 10) break; 
        
        if (!selectedSpots.includes(spot)) {
            // 【关键修改 2】：填充的时候，不希望显示太远的重复点，所以加个距离限制
            // 比如只填充身边 300 米内的重复种类（也就是就近的便利店）
            if (spot.distance < 300) {
                selectedSpots.push(spot);
            }
        }
    }

    // 第四步：渲染到地图上（现在在出生时就决定稀有度）
    selectedSpots.forEach(spot => {
        const marker = createPoiMarker(spot);
        if (marker) {
            dynamicMarkersLayer.addLayer(marker);
        }
    });
    
    console.log(`👀 雷达扫描：生成 ${selectedSpots.length} 个任务点 (包含了 ${foundTypes.size} 种不同的类型)`);
}

// 启动引擎！
loadOSMData();

// 修复初始化测试数据 (匹配最新的嵌套 JSON 格式)
function initTestData() {
    const testWords = [
        { word: { text: "電車", kana: "でんしゃ", zh: "电车" }, pos: "名词", tag: "Transit", tagColor: "#9E9E9E" }, 
        { word: { text: "乗る", kana: "のる", zh: "骑/乘" }, pos: "动词", tag: "Transit", tagColor: "#9E9E9E" },
        // 【新增】：公园关卡测试数据
        { word: { text: "赤い", kana: "あかい", zh: "红色的" }, pos: "形容词", tag: "Nature", tagColor: "#4CAF50" }, 
        { word: { text: "花", kana: "はな", zh: "花" }, pos: "名词", tag: "Nature", tagColor: "#4CAF50" }, 
        { word: { text: "見つける", kana: "みつける", zh: "发现" }, pos: "动词", tag: "Nature", tagColor: "#4CAF50" }
    ];
    testWords.forEach(wordData => addWordToInventory(wordData));
}
if (DEV_MODE) {
    setTimeout(initTestData, 500);
}

// 🔮 关卡设计师后门：在玩家身边强行召唤一只流浪猫（极致静默版）
function spawnTestCat() {
    if (!playerMarker) return; // 如果还没定位成功，静默退出
    
    // 获取玩家位置并做微小偏移
    const playerPos = playerMarker.getLatLng();
    const catLat = playerPos.lat + 0.0002;
    const catLng = playerPos.lng + 0.0002;
    const spotKey = `cat_${Date.now()}`; // 唯一 key

    // 确保这里的类型是 npc_cat
    const spotData = {
        lat: catLat,
        lng: catLng,
        type: 'npc_cat', 
        id: spotKey,
        name: "流浪猫",
        emoji: "🐱",
        questTag: "Food"
    };

    // 抽取小猫的 SSR 任务模板
    const templates = QUEST_TEMPLATES['npc_cat'];
    const selectedTemplate = templates[0];
    const config = RARITY_CONFIG[selectedTemplate.rarity];

    const markerQuestData = {
        rarity: selectedTemplate.rarity,
        text: selectedTemplate.text,
        requiredTag: selectedTemplate.req,
        rewardCount: selectedTemplate.reward,
        config: config
    };

    // 写入缓存锁定
    questCache[spotKey] = markerQuestData;
    saveQuestCache();

    // 绘制纯 🐱 图标
    const catIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="font-size: 32px; text-align: center; animation: pulse 1.5s infinite; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.4)); cursor: pointer;">🐱</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });

    let marker = L.marker([catLat, catLng], { icon: catIcon }).addTo(map);
    marker.questData = markerQuestData;

    // 点击事件处理
    marker.on('click', () => {
        openQuestUI(marker.questData, spotData, marker);
    });

    // 完事！没有任何弹窗，没有任何文字闪烁。深藏功与名。
}

// 清除缓存函数（供手机用户快速清理）
function clearQuestCacheAll() {
    localStorage.removeItem(QUEST_CACHE_STORAGE_KEY);
    Object.keys(questCache).forEach(key => delete questCache[key]);
    alert(currentLang === 'ja' ? "キャッシュをクリアしました。ページを再読み込みしてください。" : "缓存已清除，请刷新页面");
    location.reload();
}

document.getElementById('clear-cache-btn').addEventListener('click', clearQuestCacheAll);

// 游戏启动 3 秒后，必定在你身边刷出一只猫

// 🗺️ 关卡设计师数据注入 (Level Design)
// ==========================================




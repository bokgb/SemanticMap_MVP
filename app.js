// 初始化地图，加入视距限制和 UI 隐藏
let map = L.map('map', {
    zoomControl: false,  
    minZoom: 16,         
    maxZoom: 18,         
    zoomSnap: 0.5        
}).setView([35.6895, 139.6917], 17); 

// 挂载 OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

let playerMarker = L.marker([35.6895, 139.6917]).addTo(map);
let statusText = document.getElementById('status-text');

// 获取 GPS 位置
if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            statusText.innerText = `坐标更新成功：\n纬度 ${lat.toFixed(4)}\n经度 ${lng.toFixed(4)}`;
            map.setView([lat, lng], 16); 
            playerMarker.setLatLng([lat, lng]);

            // 【新增】：每次真实的脚步移动，才触发一次雷达扫描！
            updateVisibleSpots(lat, lng);


        },
        (error) => {
            console.error("定位获取失败:", error);
            statusText.innerText = "GPS 定位失败，请检查权限或换用 HTTPS";
        },
        { enableHighAccuracy: true, maximumAge: 0 }
    );
} else {
    statusText.innerText = "你的设备不支持 GPS";
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
    cameraLayer.style.display = 'flex'; 
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        cameraFeed.srcObject = currentStream;
    } catch (err) {
        alert("无法调用摄像头\n错误信息: " + err.message);
    }
});

closeCameraBtn.addEventListener('click', () => {
    cameraLayer.style.display = 'none'; 
    if (currentStream) currentStream.getTracks().forEach(track => track.stop());
});

// ==========================================
// 🧠 真实的 AI 视觉识别引擎 (Gemini API 示例)
// ==========================================



// 1. 负责把摄像头当前画面截取为 Base64 编码的图片
function captureFrameAsBase64() {
    const video = document.getElementById('camera-feed');
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
    const base64Image = captureFrameAsBase64();
    
    // 【核心新增 1】：获取玩家当前选择的难度
    const currentLevel = document.getElementById('level-selector').value;
    
    // 【修改点 1】：把指令焦点全部转移到“例句生成”上
    const levelInstructions = {
        'N5': "【例句要求】：使用 JLPT N5-N4 级别的极简基础语法（如 です/ます、～を食べる）。句子要短，非常直白，汉字必须标注假名。",
        'N3': "【例句要求】：使用 JLPT N3-N2 级别的进阶日常语法（如 被动、使役、～てしまう、～かもしれない）。句子要像当地人日常交流，包含适度的细节或情感描写。",
        'N1': "【例句要求】：使用 JLPT N1 级别的高级书面语法或专业表达（如 ～ざるを得ない、～にほかならない、四字熟语）。句子要结构复杂，带有强烈的议论、说明或文学色彩。"
    };

    // 【修改点 2】：给物品命名加上“常识紧箍咒”
    const promptText = `
    你是一个 LBS 语言学习游戏的物体识别引擎。
    请识别图片中最主要的物品。
    
    【词汇提取绝对原则】：无论当前是什么难度，提取的物品名称 (word.text) 必须是现代日语中**最自然、最常用、最接地气**的说法！（例如：看到香蕉必须返回「バナナ」，绝对禁止返回生僻汉字「甘蕉」；看到水杯返回「コップ」或「グラス」）。

    ${levelInstructions[currentLevel]}
    
    你必须严格根据上述要求来生成。并且严格返回一段 JSON 格式的数据，绝对不要包含任何 Markdown 符号、反引号或其他文字。
    JSON 的格式必须完全遵守以下结构：
    {
        "word": {
            "text": "日文标准写法（含汉字或片假名）",
            "kana": "对应的平假名读音（纯假名的外来语原样返回）",
            "zh": "中文翻译"
        },
        "pos": "名词 或 动词",
        "tag": "必须从以下选择其一：Food, Nature, Transit, Retail, Health, Item",
        "tagColor": "对应的十六进制颜色",
        "example": {
            "s": "日文例句（必须严格遵守当前的难度【例句要求】生成）",
            "k": "该例句的全假名注音（用于参考）",
            "z": "该例句的中文翻译"
        }
    }
    `;

    const url = '/api/gemini';
    
    // 【修复点】：注意下面必须是 inlineData 和 mimeType ！
    const requestBody = {
        contents: [{
            parts: [
                { text: promptText },
                { inlineData: { mimeType: "image/jpeg", data: base64Image } }
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
        
        let resultText = data.candidates[0].content.parts[0].text;
        
        // 【核心修复】：暴力清除大模型可能返回的 Markdown 代码块标记！
        resultText = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        
        const aiResult = JSON.parse(resultText);
        return aiResult;
        
    } catch (error) {
        console.error("AI 识别失败:", error);
        
        // 【核心排错工具】：直接在手机屏幕上把最真实的死因弹出来！
        alert(`🚨 系统排错：\n识别失败了！\n真实原因：${error.message}`);
        
        return { word: "未知物品（エラー）", pos: "名词", tag: "Item", tagColor: "#607D8B" };
    }
}

// 【融合点 3】：全局变量，用来记住玩家现在是不是带着“便利店任务”在拍照
let activeQuest = null; 

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

    // 5. 等待真实 AI 识别
    const aiResult = await callRealVisionAI();

    // 6. 恢复所有状态
    if (cameraFeed && typeof cameraFeed.play === 'function') {
        cameraFeed.play();
    }
    if (scannerOverlay) scannerOverlay.classList.add('hidden');
    
    captureBtn.innerText = originalText;
    captureBtn.disabled = false;
    closeCameraBtn.disabled = false;
    
    closeCameraBtn.click(); // 识别完自动关掉相机层

    // 【融合点 4】：判断拍照后的去向
    if (activeQuest) {
        if (aiResult.tag === activeQuest.requiredTag) {
            
            // 🟢 AI 判定标签正确：任务成功分岔
            if (activeQuest.type === 'POI') {
                alert(`🎉 任务完成！\n成功填入：【${aiResult.word.text}】 を たべる\n便利店区域已净化！`);
            } else if (activeQuest.type === 'NPC') {
                alert(`🐱 喵~！\n流浪猫开心地吃下了【${aiResult.word.text}】！\n作为报答，它让你摸了摸头。`);
                // NPC 给玩家的额外奖励：立刻弹出单词卡！
                setTimeout(() => showWordDetailCard(aiResult), 500); 
            }

            // 💥 通用销毁逻辑（全图搜捕，精准制导）
            const destroyedMarker = activeQuest.marker;
            const spotIndex = allSpots.findIndex(s => s.lat === activeQuest.spot.lat && s.lng === activeQuest.spot.lng);
            if (spotIndex > -1) {
                allSpots.splice(spotIndex, 1); 
            }

            let actualMarkerOnMap = null;
            dynamicMarkersLayer.eachLayer(layer => {
                if (layer.spotData && layer.spotData.lat === activeQuest.spot.lat && layer.spotData.lng === activeQuest.spot.lng) {
                    actualMarkerOnMap = layer;
                }
            });

            if (actualMarkerOnMap) {
                const iconElement = actualMarkerOnMap._icon; 
                if (iconElement) {
                    iconElement.classList.add('marker-destroy-fx');
                    setTimeout(() => dynamicMarkersLayer.removeLayer(actualMarkerOnMap), 600);
                } else {
                    dynamicMarkersLayer.removeLayer(actualMarkerOnMap);
                }
            }

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
    document.getElementById('quest-layer').classList.add('hidden');
});

document.getElementById('btn-start-scan').addEventListener('click', () => {
    // 【关键修复 1】：内鬼代码已被删掉，保留原汁原味的任务数据！
    document.getElementById('quest-layer').classList.add('hidden');
    scanBtn.click(); // 自动帮你点开相机！
});

function spawnStoreQuest(lat, lng, storeName) {
    const storeIcon = L.divIcon({
        // 【核心修改】：把 Emoji 用一个 div 包起来，作为会动的内壳
        html: '<div class="store-emoji">🏪</div>', 
        // 【核心修改】：把原来的类名改成外壳类名
        className: 'store-icon-container', 
        iconSize: [50, 50], 
        iconAnchor: [25, 25]
    });
    
    // 精准定位
    const storeMarker = L.marker([lat, lng], { icon: storeIcon }).addTo(map);
        
    storeMarker.on('click', () => {
        // 动态修改 HTML 里的店名 UI
        document.querySelector('.location-tag').innerText = `📍 ${storeName}`;
        document.getElementById('quest-layer').classList.remove('hidden');
    });
}
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


// --- 旧版 ⚠️ 自由组合任务逻辑 ---
let taskLocation = null;
const comboLayer = document.getElementById('combo-layer');
const slotAdj = document.getElementById('slot-adj'); // 新增
const slotNoun = document.getElementById('slot-noun');
const slotVerb = document.getElementById('slot-verb');
const btnSubmit = document.getElementById('btn-submit-combo');
let currentAdj = null; // 新增
let currentNoun = null;
let currentVerb = null;

// --- 升级版：自由探索生成与多目标追踪 ---
let currentActiveMarker = null; // 记录当前玩家点击的是哪个任务图标
window.currentComboTag = null;
window.currentComboSpot = null;

function spawnTaskMarker(lat, lng) {
    const customIcon = L.divIcon({
        html: '<div class="icon-pulse">⚠️</div>', 
        className: 'task-icon-container', 
        iconSize: [60, 60],     
        iconAnchor: [30, 30]    
    });
    // 去掉偏移量，精准生成
    let marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    
    marker.on('click', () => {
        currentActiveMarker = marker; // 记住现在挑战的是这个坐标的点
        openComboPanel();
    });
}

function openComboPanel() {
    comboLayer.classList.remove('hidden');
    renderComboWords(); 
}

document.getElementById('btn-close-combo').addEventListener('click', () => {
    comboLayer.classList.add('hidden');
    resetSlots();
});

function renderComboWords() {
    const list = document.getElementById('combo-word-list');
    list.innerHTML = ''; 
    playerInventory.forEach((wordData) => {
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
    if (currentAdj && currentNoun && currentVerb) btnSubmit.disabled = false;
}

function resetSlots() {
    currentAdj = null; currentNoun = null; currentVerb = null;
    if(slotAdj) { slotAdj.innerText = '形容词'; slotAdj.classList.remove('filled'); }
    slotNoun.innerText = '点击下方名词填入'; slotNoun.classList.remove('filled');
    slotVerb.innerText = '点击下方动词填入'; slotVerb.classList.remove('filled');
    btnSubmit.disabled = true;
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
        currentActiveMarker = null; 
        window.currentComboSpot = null;
    } else {
        alert(`语境不匹配！\n提示：该区域需要【${window.currentComboTag}】相关的词汇。`);
        comboLayer.classList.add('hidden');
        resetSlots();
    }
});

// --- 核心注音渲染器 ---
function renderRubyWord(wordObj) {
    if (!wordObj || !wordObj.text) return "???";
    // 如果没有假名，或者文本和假名一样（外来语），就不显示上方注音
    if (!wordObj.kana || wordObj.text === wordObj.kana) {
        return `<span>${wordObj.text}</span> <span style="font-size:12px; color:#888;">(${wordObj.zh})</span>`;
    }
    return `<ruby>${wordObj.text}<rt>${wordObj.kana}</rt></ruby> <span style="font-size:12px; color:#888;">(${wordObj.zh})</span>`;
}

// 修复背包渲染逻辑
function addWordToInventory(data) {
    playerInventory.push(data);
    const list = document.getElementById('word-list');
    const block = document.createElement('div');
    block.className = 'word-block';
    block.style.borderLeftColor = data.tagColor;
    // 使用新的渲染器！
    block.innerHTML = `
        <div class="word-title">${renderRubyWord(data.word)}</div>
        <div class="word-pos">[ ${data.pos} ]</div>
        <div class="word-tag" style="background-color: ${data.tagColor}">${data.tag}</div>
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

function showWordDetailCard(aiData) {
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
    addWordToInventory(pendingWord); // 真正存入背包
    alert("收录成功！右上角背包查看。");
});


// 🌍 OSM 数据驱动与动态视距渲染系统 (Viewport Culling)
// ==========================================

let allSpots = []; // 存放从 JSON 洗出来的所有地标
let dynamicMarkersLayer = L.layerGroup().addTo(map); // 专门用来放动态标记的图层
// 客户端只需要直接读取干净的数据！没有任何复杂的清洗逻辑！
async function loadOSMData() {
    try {
        // 直接读取你洗好的纯净版数据
        const response = await fetch('spotsData.json');
        allSpots = await response.json(); 
        
        console.log(`✅ 成功加载了 ${allSpots.length} 个烘焙好的地标！`);
    } catch (error) {
        console.error("加载数据失败", error);
    }
}

// 2. 动态生成任务地标 (情境驱动分配版)
function spawnDynamicQuest(spot) {
    const icon = L.divIcon({
        html: `<div class="store-emoji">${spot.emoji}</div>`, 
        className: 'store-icon-container', 
        iconSize: [50, 50], 
        iconAnchor: [25, 25]
    });
    
    const marker = L.marker([spot.lat, spot.lng], { icon: icon });
    marker.spotData = spot; 
        
    marker.on('click', () => {
        if (spot.type === 'convenience' || spot.type === 'pharmacy' || spot.type === 'station') {
            // 🏪 【地标拍照任务】
            document.querySelector('.location-tag').innerText = `${spot.emoji} ${spot.name}`;
            
            // 恢复便利店的默认文案
            document.querySelector('.quest-content h3').innerText = "环境语义缺失！";
            document.querySelector('.quest-content p').innerText = "请通过拍照补充下述句子的空缺部分：";
            document.querySelector('.sentence-preview').innerHTML = `<span class="slot-box" id="quest-slot">?</span><span class="fixed-text">を たべる</span>`;
            
            activeQuest = { type: 'POI', requiredTag: spot.questTag, spot: spot, marker: marker }; 
            document.getElementById('quest-layer').classList.remove('hidden');
            
        } else if (spot.type === 'park') {
            // 🌲 【公园 Combo 任务】
            document.getElementById('task-desc').innerText = `区域异常：此公园需要【${spot.questTag}】相关的词汇组合来净化！`;
            activeQuest = null; 
            currentActiveMarker = marker; 
            window.currentComboTag = spot.questTag; 
            window.currentComboSpot = spot; 
            openComboPanel(); 
            
        } else if (spot.type === 'npc_cat') {
            // 🐱 【新增：流浪猫 NPC 委托】
            document.querySelector('.location-tag').innerText = `${spot.emoji} ${spot.name}`;
            
            // 动态替换为流浪猫的专属文案
            document.querySelector('.quest-content h3').innerText = "它看起来很饿...";
            document.querySelector('.quest-content p').innerText = "请通过拍照投喂带有【食物 (Food)】标签的物品：";
            document.querySelector('.sentence-preview').innerHTML = `<span class="slot-box" id="quest-slot">?</span><span class="fixed-text">を あげる (给)</span>`;
            
            // 标记这个任务类型为 NPC！
            activeQuest = { type: 'NPC', requiredTag: spot.questTag, spot: spot, marker: marker }; 
            document.getElementById('quest-layer').classList.remove('hidden');
        }
    });
    
    return marker;
}

// 3. 核心雷达算法：广域搜索 + 多样性强制保底
function updateVisibleSpots(playerLat, playerLng) {
    if (allSpots.length === 0 || !playerLat || !playerLng) return;

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

    // 第四步：渲染到地图上
    selectedSpots.forEach(spot => {
        const marker = spawnDynamicQuest(spot);
        dynamicMarkersLayer.addLayer(marker);
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
setTimeout(initTestData, 500);

// 🔮 关卡设计师后门：在玩家身边强行召唤一只流浪猫
function spawnTestCat() {
    if (!playerMarker) return;
    
    // 获取玩家当前大概位置，在经纬度上偏移 0.0003（大约 30 米左右的地方）
    const catSpot = {
        id: "cat_001",
        name: "饥饿的流浪猫",
        type: "npc_cat",    // 对应我们前面写的逻辑
        emoji: "🐱",
        questTag: "Food",   // 要求玩家拍食物
        lat: playerMarker.getLatLng().lat + 0.0003, 
        lng: playerMarker.getLatLng().lng + 0.0003  
    };
    
    // 塞进总数据库，并强制雷达扫描一次！
    allSpots.push(catSpot);
    updateVisibleSpots(playerMarker.getLatLng().lat, playerMarker.getLatLng().lng);
    console.log("🐱 隐藏事件：流浪猫已在附近生成！");
}

// 游戏启动 3 秒后，必定在你身边刷出一只猫
setTimeout(spawnTestCat, 3000);

// 🗺️ 关卡设计师数据注入 (Level Design)
// ==========================================




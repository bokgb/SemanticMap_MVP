(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    const QUEST_CACHE_STORAGE_KEY = 'semantic-map-quest-cache-v2';
    const COOLDOWN_TIME = 1000 * 60 * 60 * 2;
    const questCache = {};

    const QUEST_TEMPLATES = {
        N5: {
            convenience: [
                { rarity: 'N', weight: 0.4, text: "コンビニで [ ? ] を買います。", req: "Food", grammar: "場所で N を Vます", instruction: "便利店里可以买到的食物或饮料。", reward: 1 },
                { rarity: 'N', weight: 0.3, text: "これは [ ? ] です。", req: "Food", grammar: "これは N です", instruction: "便利店里常见的食品、饮料或商品。", reward: 1 },
                { rarity: 'R', weight: 0.3, text: "[ ? ] を飲みます。", req: "Food", grammar: "N を Vます", instruction: "可以喝的东西，例如水、咖啡、茶。", reward: 1 }
            ],
            park: [
                { rarity: 'N', weight: 0.4, text: "公園に [ ? ] があります。", req: "Nature", grammar: "場所に N があります", instruction: "公园里存在的自然物或设施。", reward: 1 },
                { rarity: 'N', weight: 0.3, text: "公園で [ ? ] を見ます。", req: "Nature", grammar: "場所で N を Vます", instruction: "公园里能看见的自然物。", reward: 1 },
                { rarity: 'R', weight: 0.3, text: "[ ? ] はきれいです。", req: "Nature", grammar: "N は 形容詞です", instruction: "公园里漂亮、明显的自然物。", reward: 1 }
            ],
            station: [
                { rarity: 'N', weight: 0.4, text: "駅で [ ? ] を買います。", req: "Transit", grammar: "場所で N を Vます", instruction: "车站里可以买到或使用的交通相关物品。", reward: 1 },
                { rarity: 'N', weight: 0.3, text: "[ ? ] に乗ります。", req: "Transit", grammar: "N に Vます", instruction: "可以乘坐的交通工具。", reward: 1 },
                { rarity: 'R', weight: 0.3, text: "[ ? ] を見ます。", req: "Transit", grammar: "N を Vます", instruction: "车站里需要查看的标识、出口、站牌或时刻表。", reward: 1 }
            ],
            pharmacy: [
                { rarity: 'N', weight: 0.4, text: "薬局で [ ? ] を買います。", req: "Health", grammar: "場所で N を Vます", instruction: "药妆店里可以买到的健康相关物品。", reward: 1 },
                { rarity: 'N', weight: 0.3, text: "[ ? ] を使います。", req: "Health", grammar: "N を Vます", instruction: "可以使用的健康、卫生用品。", reward: 1 },
                { rarity: 'R', weight: 0.3, text: "これは [ ? ] です。", req: "Health", grammar: "これは N です", instruction: "药妆店里常见的药品或卫生用品。", reward: 1 }
            ]
        },
        N3: {
            convenience: [
                { rarity: 'R', weight: 0.35, text: "昼ごはんのために、[ ? ] を買いました。", req: "Food", grammar: "N のために", instruction: "适合作为午饭或补给的便利店食品。", reward: 1 },
                { rarity: 'R', weight: 0.35, text: "[ ? ] を温めてもらえますか。", req: "Food", grammar: "Vてもらえますか", instruction: "可以请店员加热的食品。", reward: 1 },
                { rarity: 'SR', weight: 0.3, text: "[ ? ] を買ってから、学校へ行きます。", req: "Food", grammar: "Vてから", instruction: "上学前可以买的食物或饮料。", reward: 1 }
            ],
            park: [
                { rarity: 'R', weight: 0.35, text: "[ ? ] を見ていると、気持ちが落ち着きます。", req: "Nature", grammar: "Vていると", instruction: "看着会让人放松的自然物。", reward: 1 },
                { rarity: 'R', weight: 0.35, text: "[ ? ] の近くで休むことにしました。", req: "Nature", grammar: "N の近くで", instruction: "公园里适合靠近休息的自然物或设施。", reward: 1 },
                { rarity: 'SR', weight: 0.3, text: "[ ? ] を見ながら、散歩します。", req: "Nature", grammar: "Vながら", instruction: "散步时可以看的自然物。", reward: 1 }
            ],
            station: [
                { rarity: 'R', weight: 0.35, text: "[ ? ] に乗る前に、時刻表を確認します。", req: "Transit", grammar: "Vる前に", instruction: "乘坐前需要关注的交通工具。", reward: 1 },
                { rarity: 'R', weight: 0.35, text: "[ ? ] をなくさないようにしてください。", req: "Transit", grammar: "Vないように", instruction: "车站里不能弄丢的重要交通物品。", reward: 1 },
                { rarity: 'SR', weight: 0.3, text: "[ ? ] が来るまで、ホームで待ちます。", req: "Transit", grammar: "Vるまで", instruction: "会到站、可以等待的交通工具。", reward: 1 }
            ],
            pharmacy: [
                { rarity: 'R', weight: 0.35, text: "風邪をひいたので、[ ? ] を買いました。", req: "Health", grammar: "ので", instruction: "感冒或身体不适时会买的东西。", reward: 1 },
                { rarity: 'R', weight: 0.35, text: "[ ? ] を使えば、少し楽になります。", req: "Health", grammar: "Vば", instruction: "使用后能缓解不适的健康用品。", reward: 1 },
                { rarity: 'SR', weight: 0.3, text: "[ ? ] が必要かどうか、店員に聞きます。", req: "Health", grammar: "かどうか", instruction: "不确定是否需要、可以询问店员的药品或用品。", reward: 1 }
            ]
        },
        N1: {
            convenience: [
                { rarity: 'SR', weight: 0.34, text: "時間が限られている場合、[ ? ] は手軽な食事として有用だ。", req: "Food", grammar: "N として", instruction: "能作为便捷食物的便利店商品。", reward: 1 },
                { rarity: 'SR', weight: 0.33, text: "災害時に備えるうえで、[ ? ] は欠かせない。", req: "Food", grammar: "Vるうえで", instruction: "灾害准备或日常储备中有用的食品饮料。", reward: 1 },
                { rarity: 'SR', weight: 0.33, text: "健康面を考慮すると、[ ? ] ばかりに頼るべきではない。", req: "Food", grammar: "N ばかりに頼るべきではない", instruction: "可以吃喝但不应过度依赖的便利店食品。", reward: 1 }
            ],
            park: [
                { rarity: 'SR', weight: 0.34, text: "都市生活において、[ ? ] のような自然環境は精神的な安定に寄与する。", req: "Nature", grammar: "N において", instruction: "代表自然环境、能让人放松的事物。", reward: 1 },
                { rarity: 'SR', weight: 0.33, text: "景観を維持するうえで、[ ? ] の管理は欠かせない。", req: "Nature", grammar: "Vるうえで", instruction: "公园景观维护中重要的自然物或设施。", reward: 1 },
                { rarity: 'SR', weight: 0.33, text: "[ ? ] を通して、季節の移り変わりを感じることができる。", req: "Nature", grammar: "N を通して", instruction: "能体现季节变化的自然物。", reward: 1 }
            ],
            station: [
                { rarity: 'SR', weight: 0.34, text: "円滑に移動するためには、[ ? ] の確認が不可欠だ。", req: "Transit", grammar: "N が不可欠だ", instruction: "顺利移动前需要确认的交通信息或标识。", reward: 1 },
                { rarity: 'SR', weight: 0.33, text: "混雑時において、[ ? ] の利用には注意が必要だ。", req: "Transit", grammar: "N において", instruction: "拥挤时需要注意使用的交通设施或工具。", reward: 1 },
                { rarity: 'SR', weight: 0.33, text: "公共交通機関を利用するうえで、[ ? ] は重要な手がかりとなる。", req: "Transit", grammar: "Vるうえで", instruction: "使用公共交通时重要的线索、标识或物品。", reward: 1 }
            ],
            pharmacy: [
                { rarity: 'SR', weight: 0.34, text: "症状に応じて、[ ? ] を適切に選択する必要がある。", req: "Health", grammar: "N に応じて", instruction: "需要根据症状选择的药品或健康用品。", reward: 1 },
                { rarity: 'SR', weight: 0.33, text: "衛生管理の観点から、[ ? ] の使用は有効だ。", req: "Health", grammar: "N の観点から", instruction: "从卫生管理角度有用的用品。", reward: 1 },
                { rarity: 'SR', weight: 0.33, text: "自己判断のみに頼らず、[ ? ] の説明を確認すべきだ。", req: "Health", grammar: "N のみに頼らず", instruction: "购买前应该确认说明的药品或健康用品。", reward: 1 }
            ]
        },
        npc_cat: [
            { rarity: 'SSR', weight: 1.0, text: "猫 に [ ? ] を あげる", req: "Food", grammar: "N に N をあげる", instruction: "猫可以安全食用的食物。", reward: 1 }
        ]
    };

    const RARITY_CONFIG = {
        N: { color: '#9e9e9e', label: '普通', scale: 1.0 },
        R: { color: '#3f51b5', label: '稀有', scale: 1.2 },
        SR: { color: '#ff9800', label: '超稀有', scale: 1.5 },
        SSR: { color: '#e91e63', label: '极光稀有', scale: 1.8 }
    };

    function getCurrentLevel() {
        return state.currentLevel || document.getElementById('level-selector')?.value || 'N5';
    }

    function getSpotKey(spot) {
        const baseKey = spot.id ? spot.id : `${spot.lat.toFixed(5)}_${spot.lng.toFixed(5)}`;
        return `${getCurrentLevel()}_${baseKey}`;
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

    function createCompletedMarkerIcon() {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: #555; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; opacity: 0.6;">✅</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
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
        const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.N;

        return {
            rarity,
            text: template.text,
            grammar: template.grammar || '',
            instruction: template.instruction || '',
            level: getCurrentLevel(),
            config,
            requiredTag: template.req || spot.questTag,
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

        const levelTemplates = QUEST_TEMPLATES[getCurrentLevel()] || QUEST_TEMPLATES.N5;
        const templates = levelTemplates[spot.type] || levelTemplates.convenience;
        const questData = buildQuestDataForSpot(spot, pickWeightedTemplate(templates));
        questCache[spotKey] = questData;
        saveQuestCache();

        return { status: 'active', questData };
    }

    function completeQuest(quest) {
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

    function completeSpot(spot) {
        if (!spot) return;

        questCache[getSpotKey(spot)] = {
            status: 'completed',
            completedAt: Date.now()
        };
        saveQuestCache();
    }

    function clearQuestCacheAll() {
        localStorage.removeItem(QUEST_CACHE_STORAGE_KEY);
        Object.keys(questCache).forEach(key => delete questCache[key]);
        const currentLang = state.currentLang || 'zh';
        alert(currentLang === 'ja'
            ? "キャッシュをクリアしました。ページを再読み込みしてください。"
            : "缓存已清除，请刷新页面");
        location.reload();
    }

    function buildCatQuestData() {
        const selectedTemplate = QUEST_TEMPLATES.npc_cat[0];
        const config = RARITY_CONFIG[selectedTemplate.rarity];

        return {
            rarity: selectedTemplate.rarity,
            text: selectedTemplate.text,
            requiredTag: selectedTemplate.req,
            rewardCount: selectedTemplate.reward,
            config
        };
    }

    function init() {
        loadQuestCache();
    }

    SM.quests = {
        QUEST_TEMPLATES,
        RARITY_CONFIG,
        questCache,
        init,
        saveQuestCache,
        getSpotKey,
        getQuestStateForSpot,
        createCompletedMarkerIcon,
        completeQuest,
        completeSpot,
        clearQuestCacheAll,
        buildCatQuestData
    };
})();

(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    const QUEST_CACHE_STORAGE_KEY = 'semantic-map-quest-cache-v1';
    const COOLDOWN_TIME = 1000 * 60 * 60 * 2;
    const questCache = {};

    const QUEST_TEMPLATES = {
        convenience: [
            { rarity: 'N', weight: 0.7, text: "[ ? ] を 買う", req: "Food", reward: 1 },
            { rarity: 'R', weight: 0.2, text: "[ 冷たい ] [ ? ] を 買う", req: "Food", reward: 2 },
            { rarity: 'SR', weight: 0.1, text: "[ ? ] を 温める", req: "Food", reward: 3 }
        ],
        park: [
            { rarity: 'N', weight: 0.7, text: "[ ? ] を 見る", req: "Nature", reward: 1 },
            { rarity: 'R', weight: 0.2, text: "[ 静かな ] [ ? ] で 休む", req: "Nature", reward: 2 },
            { rarity: 'SR', weight: 0.1, text: "[ 赤い ] [ ? ] を 見つける", req: "Nature", reward: 3 }
        ],
        station: [
            { rarity: 'N', weight: 0.7, text: "[ ? ] に 乗る", req: "Transit", reward: 1 },
            { rarity: 'R', weight: 0.3, text: "[ ? ] を 買う", req: "Transit", reward: 2 }
        ],
        pharmacy: [
            { rarity: 'N', weight: 0.7, text: "[ ? ] を 探す", req: "Health", reward: 1 },
            { rarity: 'R', weight: 0.3, text: "[ 痛い ] から [ ? ] を 飲む", req: "Health", reward: 2 }
        ],
        npc_cat: [
            { rarity: 'SSR', weight: 1.0, text: "猫 に [ ? ] を あげる", req: "Food", reward: 3 }
        ]
    };

    const RARITY_CONFIG = {
        N: { color: '#9e9e9e', label: '普通', scale: 1.0 },
        R: { color: '#3f51b5', label: '稀有', scale: 1.2 },
        SR: { color: '#ff9800', label: '超稀有', scale: 1.5 },
        SSR: { color: '#e91e63', label: '极光稀有', scale: 1.8 }
    };

    function getSpotKey(spot) {
        return spot.id ? spot.id : `${spot.lat.toFixed(5)}_${spot.lng.toFixed(5)}`;
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
            config,
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

        const templates = QUEST_TEMPLATES[spot.type] || QUEST_TEMPLATES.convenience;
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

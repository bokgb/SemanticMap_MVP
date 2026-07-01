(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    const DEFAULT_CENTER = [34.81036015042446, 135.5610787988949];
    const DEFAULT_DEMO_AREA_ID = 'ritsumeikan_oic';
    const EXPLORER_PROGRESS_STORAGE_KEY = 'semantic-map-explorer-progress-v1';
    const CHAPTER_PROGRESS_STORAGE_KEY = 'semantic-map-chapter-progress-v1';
    const CONVENIENCE_TASK_SWITCH_HINT_KEY = 'semantic-map-convenience-task-switch-hint-seen-v1';
    const EXPLORER_LEVELS = [
        { level: 1, xp: 0, scanRadius: 180, unlockRadius: 60, maxVisible: 4, distantHints: 2 },
        { level: 2, xp: 50, scanRadius: 240, unlockRadius: 70, maxVisible: 5, distantHints: 2 },
        { level: 3, xp: 120, scanRadius: 300, unlockRadius: 80, maxVisible: 6, distantHints: 3 },
        { level: 4, xp: 220, scanRadius: 380, unlockRadius: 90, maxVisible: 7, distantHints: 3 },
        { level: 5, xp: 360, scanRadius: 480, unlockRadius: 100, maxVisible: 8, distantHints: 4 }
    ];
    const QUEST_REWARDS = {
        N: { xp: 10, coins: 5 },
        R: { xp: 20, coins: 10 },
        SR: { xp: 40, coins: 20 },
        SSR: { xp: 60, coins: 30 },
        npc: { xp: 30, coins: 15 }
    };
    const MAX_SPOTS_PER_TAG = 2;
    const MAX_DISTANT_SIGNALS = 4;
    const MIN_DISTANT_SIGNAL_ANGLE_DEGREES = 32;
    const MAX_DISTANT_SIGNAL_DISTANCE_METERS = 1200;
    const MIN_ANY_SPOT_DISTANCE_METERS = 135;
    const MIN_SAME_TAG_DISTANCE_METERS = 180;
    const MAP_BOUNDS_RADIUS_METERS = 1200;
    const SCAN_START_RADIUS_METERS = 100;
        const CHAPTER_SPOT_TYPES = {
        convenience: new Set(['convenience']),
        station: new Set(['station'])
    };
    const CONVENIENCE_DUNGEON_REQUIRED_CARDS = 3;
    const TUTORIAL_PEN_SPOT_ID = 'tutorial_pen_practice';
    const TUTORIAL_PEN_COMPLETE_KEY = 'semantic-map-tutorial-pen-complete-v1';
    const TUTORIAL_PEN_SEEN_KEY = 'semantic-map-tutorial-pen-seen-v1';
    const TUTORIAL_PEN_OFFSET_METERS = 26;
    const DEFAULT_ZOOM = 17;
    const FOCUS_ZOOM = 17;
    const CAPTURE_PHOTO_ZOOM = 16;
    const AREA_PROGRESS_STORAGE_KEY = 'semantic-map-area-progress-v3';
    const RARITY_REPAIR_POINTS = {
        N: 1,
        R: 2,
        SR: 4,
        SSR: 6
    };
    const CAT_REPAIR_POINTS = 5;
    const CAT_SPAWN_DELAY_MS = {
        devMin: 4000,
        devMax: 9000,
        min: 45000,
        max: 90000
    };
    const CAT_NEARBY_AREA_RADIUS_METERS = 900;
    const GAME_AREAS = [
        // 修复区按“步行可达的语义场景”组织，而不是行政区。
        {
            id: 'ritsumeikan_oic',
            name: {
                zh: '立命馆 OIC 修复区',
                ja: '立命館OIC修復エリア'
            },
            center: [34.81036015042446, 135.5610787988949],
            radius: 420,
            zoom: 16,
            requiredPoints: 8,
            description: {
                zh: '立命馆大学大阪茨木校区与周边生活设施',
                ja: '立命館大学大阪いばらきキャンパスと周辺生活施設'
            }
        },
        {
            id: 'ibarakishi_station_west',
            name: {
                zh: '茨木站修复区',
                ja: '茨木駅修復エリア'
            },
            center: [34.81525, 135.56220],
            radius: 360,
            zoom: 17,
            requiredPoints: 8,
            description: {
                zh: 'JR 茨木站周边、车站设施与通勤动线',
                ja: 'JR茨木駅周辺、駅施設と通勤動線'
            }
        },
        {
            id: 'aeon_ibaraki',
            name: {
                zh: 'AEON 茨木生活修复区',
                ja: 'イオン茨木生活修復エリア'
            },
            center: [34.81255, 135.55845],
            radius: 300,
            zoom: 17.5,
            requiredPoints: 8,
            description: {
                zh: 'AEON MALL 茨木、商店与日常消费场景',
                ja: 'イオンモール茨木、店と日常の買い物場面'
            }
        },
        {
            id: 'minami_ibaraki_station',
            name: {
                zh: '南茨木站修复区',
                ja: '南茨木駅修復エリア'
            },
            center: [34.80255, 135.56535],
            radius: 360,
            zoom: 17,
            requiredPoints: 8,
            description: {
                zh: '阪急与大阪单轨南茨木站周边',
                ja: '阪急・大阪モノレール南茨木駅周辺'
            }
        },
        {
            id: 'tenroku',
            name: {
                zh: '天六商店街修复区',
                ja: '天六商店街修復エリア'
            },
            center: [34.7106, 135.5108],
            radius: 480,
            requiredPoints: 8,
            description: {
                zh: '天神橋筋六丁目周边',
                ja: '天神橋筋六丁目周辺'
            }
        },
        {
            id: 'ogimachi_park',
            name: {
                zh: '扇町公园修复区',
                ja: '扇町公園修復エリア'
            },
            center: [34.70413, 135.50915],
            radius: 430,
            requiredPoints: 6,
            description: {
                zh: '扇町公园与周边生活设施',
                ja: '扇町公園と周辺生活施設'
            }
        },
        {
            id: 'nakazakicho',
            name: {
                zh: '中崎町路地修复区',
                ja: '中崎町路地修復エリア'
            },
            center: [34.7068, 135.5051],
            radius: 430,
            requiredPoints: 7,
            description: {
                zh: '中崎町站、巷道与小店周边',
                ja: '中崎町駅、路地、小店舗周辺'
            }
        },
        {
            id: 'umeda',
            name: {
                zh: '梅田地下街修复区',
                ja: '梅田地下街修復エリア'
            },
            center: [34.7025, 135.4959],
            radius: 560,
            requiredPoints: 12,
            description: {
                zh: '大阪站、梅田商业与交通节点',
                ja: '大阪駅、梅田商業地、交通結節点'
            }
        },
        {
            id: 'minamimorimachi',
            name: {
                zh: '南森町生活修复区',
                ja: '南森町生活修復エリア'
            },
            center: [34.6977, 135.5115],
            radius: 460,
            requiredPoints: 8,
            description: {
                zh: '南森町、大阪天满宫与生活街区',
                ja: '南森町、大阪天満宮、生活街区'
            }
        },
        {
            id: 'kyoto_station',
            name: {
                zh: '京都站交通修复区',
                ja: '京都駅交通修復エリア'
            },
            center: [34.9858, 135.7588],
            radius: 540,
            requiredPoints: 10,
            description: {
                zh: '京都站与八条口周边',
                ja: '京都駅と八条口周辺'
            }
        },
        {
            id: 'nishiki_market',
            name: {
                zh: '锦市场商店街修复区',
                ja: '錦市場商店街修復エリア'
            },
            center: [35.0050, 135.7648],
            radius: 500,
            requiredPoints: 8,
            description: {
                zh: '锦市场、四条与商业街周边',
                ja: '錦市場、四条、商店街周辺'
            }
        },
        {
            id: 'gion',
            name: {
                zh: '祇园街路修复区',
                ja: '祇園街路修復エリア'
            },
            center: [35.0037, 135.7750],
            radius: 480,
            requiredPoints: 7,
            description: {
                zh: '祇园四条与花见小路周边',
                ja: '祇園四条と花見小路周辺'
            }
        },
        {
            id: 'fushimi_inari',
            name: {
                zh: '伏见稻荷修复区',
                ja: '伏見稲荷修復エリア'
            },
            center: [34.9671, 135.7727],
            radius: 560,
            requiredPoints: 6,
            description: {
                zh: '伏见稻荷、稻荷站与参道周边',
                ja: '伏見稲荷、稲荷駅、参道周辺'
            }
        },
        {
            id: 'nijo_castle',
            name: {
                zh: '二条城周边修复区',
                ja: '二条城周辺修復エリア'
            },
            center: [35.0142, 135.7480],
            radius: 560,
            requiredPoints: 6,
            description: {
                zh: '二条城、二条站与周边街区',
                ja: '二条城、二条駅、周辺街区'
            }
        }
    ];
    const OIC_DEMO_AREA_IDS = new Set([
        'ritsumeikan_oic',
        'ibarakishi_station_west',
        'aeon_ibaraki',
        'minami_ibaraki_station'
    ]);
    const AREA_URL_PARAMS = ['area', 'testArea', 'demoArea'];
    let map = null;
    let playerMarker = null;
    let dynamicMarkersLayer = null;
    let capturedWordLayer = null;
    let capturedWordMarkersById = new Map();
    let radarLayer = null;
    let fogCanvas = null;
    let fogContext = null;
    let fogAnimationTimer = null;
    let areaLayer = null;
    let areaProgress = {};
    let explorerProgress = { xp: 0, coins: 0, discoveredSpotKeys: [] };
    let chapterProgress = createDefaultChapterProgress();
    let activeDungeon = null;
    let allSpots = [];
    let catSpawnTimer = null;
    let activeCatMarker = null;
    let statusText = null;
    let hasCenteredOnPlayer = false;

    function escapeAttribute(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function tr(key, params = {}) {
        return SM.i18n?.t?.(key, params) || key;
    }

    function loadExplorerProgress() {
        try {
            const rawProgress = localStorage.getItem(EXPLORER_PROGRESS_STORAGE_KEY);
            const parsed = rawProgress ? JSON.parse(rawProgress) : {};
            explorerProgress = {
                xp: Number(parsed?.xp || 0),
                coins: Number(parsed?.coins || 0),
                discoveredSpotKeys: Array.isArray(parsed?.discoveredSpotKeys) ? parsed.discoveredSpotKeys : []
            };
        } catch (error) {
            console.warn('读取探索进度失败，使用空进度。', error);
            explorerProgress = { xp: 0, coins: 0, discoveredSpotKeys: [] };
        }
        state.explorerProgress = explorerProgress;
    }

    function saveExplorerProgress() {
        try {
            localStorage.setItem(EXPLORER_PROGRESS_STORAGE_KEY, JSON.stringify(explorerProgress));
        } catch (error) {
            console.warn('保存探索进度失败。', error);
        }
    }

    function getExplorerConfig() {
        const xp = Number(explorerProgress.xp || 0);
        let config = EXPLORER_LEVELS[0];
        for (const levelConfig of EXPLORER_LEVELS) {
            if (xp >= levelConfig.xp) {
                config = levelConfig;
            }
        }
        return config;
    }

    function getNextExplorerConfig() {
        const currentLevel = getExplorerConfig().level;
        return EXPLORER_LEVELS.find(levelConfig => levelConfig.level > currentLevel) || null;
    }

    function createDefaultChapterProgress() {
        return {
            currentChapter: 'convenience',
            convenienceCompletedSpotKeys: [],
            convenienceDungeonUnlocked: false,
            convenienceDungeonPrompted: false,
            chapterStartPrompted: false,
            convenienceDungeonCleared: false
        };
    }

    function getQuestSpotProgressKey(cardOrSpot) {
        const capture = cardOrSpot?.capture;
        const quest = cardOrSpot?.quest;
        const spot = cardOrSpot?.spot || cardOrSpot;
        return capture?.spotId
            || spot?.id
            || `${capture?.lat ?? spot?.lat ?? ''}_${capture?.lng ?? spot?.lng ?? ''}_${quest?.spotType || spot?.type || ''}`;
    }

    function getBaseSpotId(spot) {
        return spot?.id || `${spot?.lat ?? ''}_${spot?.lng ?? ''}_${spot?.type || ''}`;
    }

    function isConvenienceMultiQuestSpot(spot) {
        return spot?.type === 'convenience'
            && chapterProgress.currentChapter === 'convenience'
            && !chapterProgress.convenienceDungeonUnlocked
            && !chapterProgress.convenienceDungeonCleared;
    }

    function getConvenienceTaskId(spot, index) {
        return `${getBaseSpotId(spot)}__convenience_task_${index + 1}`;
    }

    function createConvenienceTaskSpot(spot, index) {
        return {
            ...spot,
            id: getConvenienceTaskId(spot, index),
            parentSpotId: getBaseSpotId(spot),
            chapterTaskIndex: index,
            chapterTaskTotal: CONVENIENCE_DUNGEON_REQUIRED_CARDS
        };
    }

    function getConvenienceTaskChoices(spot) {
        return Array.from({ length: CONVENIENCE_DUNGEON_REQUIRED_CARDS }, (_, index) => {
            const taskSpot = createConvenienceTaskSpot(spot, index);
            const questState = SM.quests.getQuestStateForSpot(taskSpot);
            return {
                index,
                spot: taskSpot,
                status: questState.status,
                questData: questState.questData ? {
                    ...questState.questData,
                    chapterTaskIndex: index,
                    chapterTaskTotal: CONVENIENCE_DUNGEON_REQUIRED_CARDS,
                    parentSpotId: getBaseSpotId(spot)
                } : null
            };
        });
    }

    function getConvenienceSpotCompletedCount(spot) {
        return getConvenienceTaskChoices(spot)
            .filter(choice => choice.status === 'completed' || chapterProgress.convenienceCompletedSpotKeys.includes(choice.spot.id))
            .length;
    }

    function loadChapterProgress() {
        try {
            const parsed = JSON.parse(localStorage.getItem(CHAPTER_PROGRESS_STORAGE_KEY) || '{}');
            chapterProgress = { ...createDefaultChapterProgress(), ...(parsed || {}) };
            chapterProgress.convenienceCompletedSpotKeys = Array.isArray(chapterProgress.convenienceCompletedSpotKeys)
                ? chapterProgress.convenienceCompletedSpotKeys
                : [];
        } catch (error) {
            chapterProgress = createDefaultChapterProgress();
        }

        const convenienceCards = SM.inventory?.getCards?.()
            ?.filter(card => card?.quest?.spotType === 'convenience') || [];
        convenienceCards.forEach(card => {
            const key = getQuestSpotProgressKey(card);
            if (key && !chapterProgress.convenienceCompletedSpotKeys.includes(key)) {
                chapterProgress.convenienceCompletedSpotKeys.push(key);
            }
        });
        if (chapterProgress.convenienceCompletedSpotKeys.length >= CONVENIENCE_DUNGEON_REQUIRED_CARDS) {
            chapterProgress.convenienceDungeonUnlocked = true;
        }
        if (chapterProgress.convenienceDungeonCleared) {
            chapterProgress.currentChapter = 'station';
        }
        saveChapterProgress();
        state.chapterProgress = chapterProgress;
    }

    function saveChapterProgress() {
        state.chapterProgress = chapterProgress;
        try {
            localStorage.setItem(CHAPTER_PROGRESS_STORAGE_KEY, JSON.stringify(chapterProgress));
        } catch (error) {
            console.warn('Failed to save chapter progress.', error);
        }
    }

    function getUnlockedSpotTypes() {
        return CHAPTER_SPOT_TYPES[chapterProgress.currentChapter] || CHAPTER_SPOT_TYPES.convenience;
    }

    function getLangForChapterCopy() {
        return SM.i18n?.getLang?.() || state.currentLang || 'ja';
    }

    function getChapterCopy() {
        const isJa = getLangForChapterCopy() === 'ja';
        const ja = {
            dungeonButton: '\u8a00\u8449\u30c0\u30f3\u30b8\u30e7\u30f3',
            unlockedLines: [
                '\u30b3\u30f3\u30d3\u30cb\u306e\u5358\u8a9e\u30c7\u30fc\u30bf\u304c3\u3064\u96c6\u307e\u308a\u307e\u3057\u305f\u3002',
                '\u8a00\u8449\u30c0\u30f3\u30b8\u30e7\u30f3\u3067\u30c7\u30fc\u30bf\u3092\u6574\u7406\u3057\u307e\u3057\u3087\u3046\u3002\u30af\u30ea\u30a2\u3059\u308b\u3068\u3001\u99c5\u30a8\u30ea\u30a2\u3078\u306e\u30a2\u30af\u30bb\u30b9\u304c\u958b\u304d\u307e\u3059\u3002'
            ],
            challenge: '\u6311\u6226\u3059\u308b',
            dungeonTitle: '\u30b3\u30f3\u30d3\u30cb\u306e\u8a00\u8449\u30c0\u30f3\u30b8\u30e7\u30f3',
            dungeonKicker: 'SPECIAL REVIEW',
            dungeonIntro: '\u96c6\u3081\u305f\u30b3\u30f3\u30d3\u30cb\u8a9e\u5f59\u3067\u3001\u5d29\u58ca\u3057\u305f\u610f\u5473\u30c7\u30fc\u30bf\u3092\u518d\u69cb\u6210\u3057\u307e\u3059\u3002',
            questionPrefix: '\u610f\u5473\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044',
            clearTitle: '\u30b3\u30f3\u30d3\u30cb\u306e\u8a00\u8449\u30c0\u30f3\u30b8\u30e7\u30f3 CLEAR!',
            clearLines: [
                '\u30b3\u30f3\u30d3\u30cb\u30a8\u30ea\u30a2\u306e\u610f\u5473\u30c7\u30fc\u30bf\u3001\u5b89\u5b9a\u3057\u307e\u3057\u305f\u3002',
                '\u99c5\u30a8\u30ea\u30a2\u3078\u306e\u30a2\u30af\u30bb\u30b9\u3092\u958b\u653e\u3057\u307e\u3059\u3002\u6b21\u306e\u5d29\u58ca\u30ce\u30fc\u30c9\u3078\u5411\u304b\u3044\u307e\u3057\u3087\u3046\u3002'
            ],
            close: '\u9589\u3058\u308b',
            next: '\u6b21\u3078',
            start: '\u958b\u59cb',
            clear: '\u89e3\u653e\u3059\u308b',
            objectiveKicker: '\u7b2c1\u7ae0',
            convenienceObjectiveTitle: '\u30b3\u30f3\u30d3\u30cb\u30a8\u30ea\u30a2',
            convenienceObjectiveBody: '\u8fd1\u304f\u306e\u30b3\u30f3\u30d3\u30cb\u3067\u5d29\u58ca\u53cd\u5fdc\u3002\u5d29\u58ca\u30ce\u30fc\u30c9\u3092\u4fee\u5fa9\u3057\u3066\u3001\u8a9e\u5f59\u30ab\u30fc\u30c9\u30923\u679a\u96c6\u3081\u307e\u3057\u3087\u3046\u3002',
            dungeonObjectiveTitle: '\u8a00\u8449\u30c0\u30f3\u30b8\u30e7\u30f3\u89e3\u653e',
            dungeonObjectiveBody: '\u30b3\u30f3\u30d3\u30cb\u8a9e\u5f59\u304c\u96c6\u307e\u308a\u307e\u3057\u305f\u3002\u8a00\u8449\u30c0\u30f3\u30b8\u30e7\u30f3\u3067\u6574\u7406\u3059\u308b\u3068\u3001\u99c5\u30a8\u30ea\u30a2\u304c\u958b\u304d\u307e\u3059\u3002',
            stationObjectiveTitle: '\u99c5\u30a8\u30ea\u30a2\u89e3\u653e',
            stationObjectiveBody: '\u6b21\u306f\u99c5\u5468\u8fba\u306e\u5d29\u58ca\u30ce\u30fc\u30c9\u3092\u63a2\u3057\u307e\u3057\u3087\u3046\u3002\u4ea4\u901a\u306e\u8a9e\u5f59\u30c7\u30fc\u30bf\u3092\u56de\u53ce\u3057\u307e\u3059\u3002',
            cardProgress: '\u30b3\u30f3\u30d3\u30cb\u8a9e\u5f59\u30ab\u30fc\u30c9 {count}/{required}',
            stationProgress: '\u99c5\u30a8\u30ea\u30a2\u63a2\u7d22\u4e2d',
            chapterStartLines: [
                '\u5468\u56f2\u3092\u78ba\u8a8d\u3057\u307e\u3057\u305f\u3002\u8fd1\u304f\u306e\u30b3\u30f3\u30d3\u30cb\u3067\u5d29\u58ca\u53cd\u5fdc\u304c\u51fa\u3066\u3044\u307e\u3059\u3002',
                '\u307e\u305a\u306f\u30b3\u30f3\u30d3\u30cb\u306e\u5d29\u58ca\u30ce\u30fc\u30c9\u3092\u4fee\u5fa9\u3057\u3066\u3001\u8a9e\u5f59\u30ab\u30fc\u30c9\u30923\u679a\u96c6\u3081\u307e\u3057\u3087\u3046\u3002'
            ]
        };
        if (isJa) return ja;
        return {
            ...ja,
            objectiveKicker: '第 1 章',
            convenienceObjectiveTitle: '便利店区域',
            convenienceObjectiveBody: '你周围的便利店好像发生了崩坏反应。去附近的崩壊ノード看看，收集 3 张便利店词卡。',
            dungeonObjectiveTitle: '言葉ダンジョン已解锁',
            dungeonObjectiveBody: '便利店词汇已经收集完成。进入言葉ダンジョン整理数据后，就能解锁车站区域。',
            stationObjectiveTitle: '车站区域已解锁',
            stationObjectiveBody: '接下来去车站附近调查崩壊ノード，回收交通场景的词汇数据。',
            cardProgress: '便利店词卡 {count}/{required}',
            stationProgress: '车站区域探索中',
            chapterStartLines: [
                '我确认了周围信号。附近的便利店好像发生了崩坏反应。',
                '先去便利店的崩壊ノード看看，收集 3 张便利店词卡吧。'
            ]
        };
    }
    function updatePlayerProgressDisplay() {
        const levelLabel = document.getElementById('player-level-label');
        const coinsLabel = document.getElementById('player-coins-label');
        const expLabel = document.getElementById('player-exp-label');
        const expFill = document.getElementById('player-exp-fill');
        if (!levelLabel || !coinsLabel || !expLabel || !expFill) return;

        const config = getExplorerConfig();
        const nextConfig = getNextExplorerConfig();
        const xp = Number(explorerProgress.xp || 0);
        const coins = Number(explorerProgress.coins || 0);
        const currentLevelXp = config.xp;
        const nextLevelXp = nextConfig?.xp ?? currentLevelXp;
        const levelSpan = Math.max(1, nextLevelXp - currentLevelXp);
        const progress = nextConfig ? Math.max(0, Math.min(1, (xp - currentLevelXp) / levelSpan)) : 1;

        levelLabel.innerText = `Lv.${config.level}`;
        coinsLabel.innerText = `${coins} ${tr('coinsLabel')}`;
        expLabel.innerText = nextConfig
            ? `EXP ${xp - currentLevelXp}/${levelSpan}`
            : tr('maxLevelLabel');
        expFill.style.width = `${Math.round(progress * 100)}%`;
    }

    function addExplorerReward({ xp = 0, coins = 0, showToast = false } = {}) {
        const beforeLevel = getExplorerConfig().level;
        explorerProgress.xp = Number(explorerProgress.xp || 0) + Number(xp || 0);
        explorerProgress.coins = Number(explorerProgress.coins || 0) + Number(coins || 0);
        const afterConfig = getExplorerConfig();
        saveExplorerProgress();
        updatePlayerProgressDisplay();
        updateRadarDisplay();
        drawFog();

        if (showToast && (xp || coins)) {
            SM.ui?.showRewardPopup?.(tr('questRewardToast', {
                xp: Number(xp || 0),
                coins: Number(coins || 0)
            }), { xp: Number(xp || 0), coins: Number(coins || 0) });
        }

        if (afterConfig.level > beforeLevel) {
            SM.ui?.showGuideMessage?.(tr('mimiLevelTip', {
                level: afterConfig.level,
                radius: afterConfig.scanRadius
            }), { type: 'success', duration: 3400 });
        }
    }

    function addExplorerXp(points = 1) {
        addExplorerReward({ xp: points, coins: 0 });
    }

    function grantExplorerReward(reward = {}) {
        const normalizedReward = typeof reward === 'string'
            ? QUEST_REWARDS[reward]
            : reward.type
                ? QUEST_REWARDS[reward.type]
                : reward;
        addExplorerReward({
            xp: Number(normalizedReward?.xp || 0),
            coins: Number(normalizedReward?.coins || 0),
            showToast: true
        });
    }

    function getQuestReward(rarity) {
        return QUEST_REWARDS[rarity] || QUEST_REWARDS.N;
    }

    function getSpotDiscoveryKey(spot) {
        if (!spot) return '';
        return spot.id || `${spot.type}_${spot.name}_${Number(spot.lat).toFixed(5)}_${Number(spot.lng).toFixed(5)}`;
    }

    function markSpotDiscovered(spot) {
        const key = getSpotDiscoveryKey(spot);
        if (!key || explorerProgress.discoveredSpotKeys.includes(key)) return false;
        explorerProgress.discoveredSpotKeys.push(key);
        saveExplorerProgress();
        return true;
    }

    function getLangValue(value) {
        if (!value || typeof value !== 'object') return value || '';
        const lang = SM.i18n?.getLang?.() || state.currentLang || 'zh';
        return value[lang] || value.zh || value.ja || '';
    }

    function getAreaName(area) {
        return getLangValue(area?.name);
    }

    function createCompletedQuestMarker(spot) {
        const completedMarker = L.marker([spot.lat, spot.lng], { icon: SM.quests.createCompletedMarkerIcon() });
        completedMarker.spotData = spot;
        return completedMarker;
    }

    function getCaptureId(card) {
        return card?.capture?.id || `${card?.capture?.lat}_${card?.capture?.lng}_${card?.word?.text || ''}`;
    }

    function getCapturedWordCards() {
        return SM.inventory?.getCards?.()
            ?.filter(card => Number.isFinite(Number(card?.capture?.lat)) && Number.isFinite(Number(card?.capture?.lng)))
            || [];
    }

    function getSafeCapturePhoto(card) {
        const photo = String(card?.capture?.photo || '');
        return photo.startsWith('data:image/') ? photo : '';
    }

    function renderCapturePopup(card) {
        const escapeHtml = SM.inventory?.escapeHtml || escapeAttribute;
        const word = SM.inventory?.renderRubyWord?.(card.word) || escapeHtml(card?.word?.text || '');
        const photo = getSafeCapturePhoto(card);
        const place = card?.capture?.spotName || card?.quest?.location || '';
        const sentence = card?.quest?.sentence || '';
        return `
            <div class="capture-popup">
                ${photo ? `<img class="capture-popup-photo" src="${escapeHtml(photo)}" alt="">` : ''}
                <div class="capture-popup-word">${word}</div>
                ${place ? `<div class="capture-popup-place">${escapeHtml(place)}</div>` : ''}
                ${sentence ? `<div class="capture-popup-sentence">${escapeHtml(sentence)}</div>` : ''}
            </div>
        `;
    }

    function createCapturedWordMarker(card) {
        const escapeHtml = SM.inventory?.escapeHtml || escapeAttribute;
        const photo = getSafeCapturePhoto(card);
        const wordText = card?.word?.text || '?';
        const icon = L.divIcon({
            className: 'custom-marker captured-word-marker',
            html: `
                <div class="captured-word-pin">
                    ${photo
                        ? `<img src="${escapeHtml(photo)}" alt="">`
                        : `<span>${escapeHtml(wordText).slice(0, 1)}</span>`}
                </div>
            `,
            iconSize: [52, 58],
            iconAnchor: [26, 50],
            popupAnchor: [0, -48]
        });
        const marker = L.marker([Number(card.capture.lat), Number(card.capture.lng)], {
            icon,
            zIndexOffset: 240
        });
        marker.captureCard = card;
        marker.bindPopup(renderCapturePopup(card), {
            className: 'capture-popup-shell',
            maxWidth: 220,
            closeButton: true
        });
        return marker;
    }

    function renderCapturedWordMarkers() {
        if (!capturedWordLayer || !map) return;

        capturedWordLayer.clearLayers();
        capturedWordMarkersById = new Map();
        if (map.getZoom() < CAPTURE_PHOTO_ZOOM) return;

        getCapturedWordCards().forEach(card => {
            const marker = createCapturedWordMarker(card);
            capturedWordMarkersById.set(getCaptureId(card), marker);
            capturedWordLayer.addLayer(marker);
        });
    }

    function addCapturedWordCard(card) {
        if (!card?.capture) return;
        renderCapturedWordMarkers();
    }

    function focusOnCapture(card) {
        if (!map || !card?.capture) return;
        const lat = Number(card.capture.lat);
        const lng = Number(card.capture.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const targetZoom = Math.max(map.getZoom(), CAPTURE_PHOTO_ZOOM);
        map.setView([lat, lng], targetZoom, { animate: true });
        window.setTimeout(() => {
            renderCapturedWordMarkers();
            const marker = capturedWordMarkersById.get(getCaptureId(card));
            marker?.openPopup();
        }, 360);
    }

    function getRequestedDemoArea() {
        if (!state.devMode) return null;

        const params = new URLSearchParams(window.location.search);
        const areaId = AREA_URL_PARAMS
            .map(key => params.get(key))
            .find(Boolean);

        if (!areaId) return null;
        return GAME_AREAS.find(area => area.id === areaId) || null;
    }

    function getRequestedDemoHeading() {
        if (!state.devMode) return null;
        const params = new URLSearchParams(window.location.search);
        return normalizeHeading(params.get('heading') ?? params.get('demoHeading'));
    }

    function getDefaultCenterConfig() {
        const requestedArea = getRequestedDemoArea();
        if (requestedArea) {
            return {
                center: [...requestedArea.center],
                area: requestedArea,
                forcedDemo: true,
                zoom: requestedArea.zoom || DEFAULT_ZOOM,
                heading: getRequestedDemoHeading()
            };
        }

        const defaultDemoArea = state.devMode ? getAreaById(DEFAULT_DEMO_AREA_ID) : null;
        if (defaultDemoArea) {
            return {
                center: [...defaultDemoArea.center],
                area: defaultDemoArea,
                forcedDemo: true,
                zoom: defaultDemoArea.zoom || DEFAULT_ZOOM,
                heading: getRequestedDemoHeading()
            };
        }

        return {
            center: [...DEFAULT_CENTER],
            area: null,
            forcedDemo: false,
            zoom: DEFAULT_ZOOM,
            heading: getRequestedDemoHeading()
        };
    }

    function setDemoPosition(message) {
        const center = state.defaultCenter || DEFAULT_CENTER;
        statusText.innerText = message;
        setPlayerPosition(center[0], center[1], 'demo', state.defaultHeading);
        updateMapBounds(center[0], center[1]);
        map.setView(center, state.defaultZoom || DEFAULT_ZOOM);
        scheduleRandomCatSpawn();
        updateVisibleSpots(center[0], center[1]);
    }

    function normalizeHeading(value) {
        const heading = Number(value);
        if (!Number.isFinite(heading) || heading < 0) return null;
        return ((heading % 360) + 360) % 360;
    }

    function inferHeadingFromMovement(previousPosition, lat, lng) {
        if (!previousPosition || previousPosition.source !== 'gps') return null;
        const distance = L.latLng(previousPosition.lat, previousPosition.lng).distanceTo([lat, lng]);
        if (distance < 4) return null;
        return getBearingDegrees(previousPosition.lat, previousPosition.lng, lat, lng);
    }

    function createPlayerMarkerIcon(source = 'gps', heading = null) {
        const demoClass = source === 'gps' ? '' : ' demo';
        const normalizedHeading = normalizeHeading(heading);
        const headingClass = normalizedHeading == null ? '' : ' has-heading';
        const headingArrow = normalizedHeading == null
            ? ''
            : `<span class="player-heading-arrow" style="transform: translate(-50%, -50%) rotate(${normalizedHeading.toFixed(1)}deg);"></span>`;
        return L.divIcon({
            className: 'player-position-marker',
            html: `<div class="player-location-dot${demoClass}${headingClass}">${headingArrow}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
    }

    function initFogCanvas() {
        fogCanvas = document.getElementById('fog-canvas');
        if (!fogCanvas) {
            fogCanvas = document.createElement('canvas');
            fogCanvas.id = 'fog-canvas';
            fogCanvas.setAttribute('aria-hidden', 'true');
            document.body.appendChild(fogCanvas);
        }
        fogContext = fogCanvas.getContext('2d');
        window.addEventListener('resize', drawFog);
        map.on('move zoom resize', drawFog);
        if (!fogAnimationTimer) {
            fogAnimationTimer = window.setInterval(drawFog, 900);
        }
        drawFog();
    }

    function metersToPixels(meters, latLng) {
        if (!map || !latLng) return meters;

        const lat = latLng.lat ?? latLng[0];
        const lng = latLng.lng ?? latLng[1];
        const lngOffset = meters / (111320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
        const pointA = map.latLngToContainerPoint([lat, lng]);
        const pointB = map.latLngToContainerPoint([lat, lng + lngOffset]);
        return Math.max(1, Math.abs(pointB.x - pointA.x));
    }

    function clearFogCircle(point, radius, feather = 24) {
        if (!fogContext || !point) return;

        const gradient = fogContext.createRadialGradient(
            point.x,
            point.y,
            Math.max(1, radius - feather),
            point.x,
            point.y,
            radius
        );
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        fogContext.fillStyle = gradient;
        fogContext.beginPath();
        fogContext.arc(point.x, point.y, radius, 0, Math.PI * 2);
        fogContext.fill();
    }

    function drawScanGrid(width, height) {
        if (!fogContext) return;

        fogContext.save();
        fogContext.globalAlpha = 0.28;
        fogContext.strokeStyle = 'rgba(77, 215, 196, 0.11)';
        fogContext.lineWidth = 1;

        const gridSize = 36;
        const phase = Math.floor(Date.now() / 90) % gridSize;
        for (let x = -phase; x < width; x += gridSize) {
            fogContext.beginPath();
            fogContext.moveTo(x, 0);
            fogContext.lineTo(x, height);
            fogContext.stroke();
        }
        for (let y = phase; y < height; y += gridSize) {
            fogContext.beginPath();
            fogContext.moveTo(0, y);
            fogContext.lineTo(width, y);
            fogContext.stroke();
        }

        fogContext.restore();
    }

    function drawScanVignette(width, height) {
        if (!fogContext) return;

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.hypot(width, height) * 0.62;
        const gradient = fogContext.createRadialGradient(centerX, centerY, radius * 0.18, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.66, 'rgba(0,0,0,0.12)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.5)');

        fogContext.fillStyle = gradient;
        fogContext.fillRect(0, 0, width, height);
    }

    function drawVisionGlow(point, radius) {
        if (!fogContext || !point) return;

        fogContext.save();
        fogContext.globalCompositeOperation = 'lighter';
        const glow = fogContext.createRadialGradient(point.x, point.y, Math.max(1, radius * 0.72), point.x, point.y, radius * 1.08);
        glow.addColorStop(0, 'rgba(42, 230, 205, 0)');
        glow.addColorStop(0.72, 'rgba(42, 230, 205, 0.14)');
        glow.addColorStop(1, 'rgba(42, 230, 205, 0)');
        fogContext.fillStyle = glow;
        fogContext.beginPath();
        fogContext.arc(point.x, point.y, radius * 1.08, 0, Math.PI * 2);
        fogContext.fill();

        fogContext.strokeStyle = 'rgba(103, 255, 231, 0.28)';
        fogContext.lineWidth = 2;
        fogContext.setLineDash([10, 12]);
        fogContext.beginPath();
        fogContext.arc(point.x, point.y, radius, 0, Math.PI * 2);
        fogContext.stroke();
        fogContext.restore();
    }

    function drawFog() {
        if (!fogCanvas || !fogContext || !map) return;

        const width = window.innerWidth || document.documentElement.clientWidth;
        const height = window.innerHeight || document.documentElement.clientHeight;
        const pixelRatio = window.devicePixelRatio || 1;
        const canvasWidth = Math.round(width * pixelRatio);
        const canvasHeight = Math.round(height * pixelRatio);

        if (fogCanvas.width !== canvasWidth || fogCanvas.height !== canvasHeight) {
            fogCanvas.width = canvasWidth;
            fogCanvas.height = canvasHeight;
            fogCanvas.style.width = `${width}px`;
            fogCanvas.style.height = `${height}px`;
        }

        fogContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        fogContext.clearRect(0, 0, width, height);
        fogContext.fillStyle = 'rgba(5, 16, 18, 0.66)';
        fogContext.fillRect(0, 0, width, height);
        drawScanGrid(width, height);
        drawScanVignette(width, height);

        fogContext.save();
        fogContext.globalCompositeOperation = 'destination-out';

        let visionPoint = null;
        let visionRadius = 0;
        if (state.lastPlayerPosition) {
            const config = getExplorerConfig();
            const latLng = { lat: state.lastPlayerPosition.lat, lng: state.lastPlayerPosition.lng };
            const point = map.latLngToContainerPoint([latLng.lat, latLng.lng]);
            const radius = metersToPixels(config.scanRadius, latLng);
            visionPoint = point;
            visionRadius = radius;
            clearFogCircle(point, radius, 34);
        }

        fogContext.restore();
        if (visionPoint && visionRadius) {
            drawVisionGlow(visionPoint, visionRadius);
        }
    }

    function setPlayerPosition(lat, lng, source = 'gps', heading = null) {
        const previousPosition = state.lastPlayerPosition;
        const reportedHeading = normalizeHeading(heading);
        const movementHeading = reportedHeading == null
            ? inferHeadingFromMovement(previousPosition, lat, lng)
            : null;
        const playerHeading = reportedHeading != null
            ? reportedHeading
            : source === 'gps'
                ? movementHeading ?? state.playerHeading ?? null
                : null;

        state.playerHeading = playerHeading;
        state.lastPlayerPosition = { lat, lng, source, heading: playerHeading };

        if (!playerMarker) {
            playerMarker = L.marker([lat, lng], {
                icon: createPlayerMarkerIcon(source, playerHeading),
                keyboard: false,
                interactive: false,
                zIndexOffset: 1000
            }).addTo(map);
            updateRadarDisplay();
            drawFog();
            return;
        }

        playerMarker.setLatLng([lat, lng]);
        playerMarker.setIcon(createPlayerMarkerIcon(source, playerHeading));
        updateRadarDisplay();
        drawFog();
    }

    function updateRadarDisplay() {
        if (!map || !state.lastPlayerPosition) return;

        const config = getExplorerConfig();
        const center = [state.lastPlayerPosition.lat, state.lastPlayerPosition.lng];
        if (!radarLayer) {
            radarLayer = L.layerGroup().addTo(map);
        }

        radarLayer.clearLayers();

    }

    function loadAreaProgress() {
        try {
            const rawProgress = localStorage.getItem(AREA_PROGRESS_STORAGE_KEY);
            areaProgress = rawProgress ? JSON.parse(rawProgress) || {} : {};
        } catch (error) {
            console.warn('读取区域进度失败，使用空进度。', error);
            areaProgress = {};
        }
    }

    function saveAreaProgress() {
        try {
            localStorage.setItem(AREA_PROGRESS_STORAGE_KEY, JSON.stringify(areaProgress));
        } catch (error) {
            console.warn('保存区域进度失败。', error);
        }
    }

    function getContainingAreas(spot) {
        if (!spot) return [];

        return GAME_AREAS
            .map(area => {
                const distance = L.latLng(area.center).distanceTo([spot.lat, spot.lng]);
                return {
                    area,
                    distance,
                    radiusRatio: distance / area.radius
                };
            })
            .filter(item => item.distance <= item.area.radius)
            .sort((a, b) => a.radiusRatio - b.radiusRatio || a.distance - b.distance)
            .map(item => item.area);
    }

    function getSpotArea(spot) {
        return getContainingAreas(spot)[0] || null;
    }

    function getAreaById(areaId) {
        if (!areaId) return null;
        return GAME_AREAS.find(area => area.id === areaId) || null;
    }

    function getNearestArea(lat, lng, maxDistance = CAT_NEARBY_AREA_RADIUS_METERS) {
        if (lat == null || lng == null) return null;

        let nearest = null;
        let nearestDistance = Infinity;
        GAME_AREAS.forEach(area => {
            const distance = L.latLng(area.center).distanceTo([lat, lng]);
            if (distance < nearestDistance) {
                nearest = area;
                nearestDistance = distance;
            }
        });

        return nearestDistance <= maxDistance ? nearest : null;
    }

    function getAreaRecord(area) {
        const record = areaProgress[area.id] || {};
        areaProgress[area.id] = {
            completedSpotKeys: Array.isArray(record.completedSpotKeys) ? record.completedSpotKeys : [],
            repairPoints: Number(record.repairPoints || 0),
            completedRewards: record.completedRewards && typeof record.completedRewards === 'object' ? record.completedRewards : {},
            purified: Boolean(record.purified)
        };
        return areaProgress[area.id];
    }

    function getAreaRepairPoints(area) {
        return getAreaRecord(area).repairPoints;
    }

    function getRepairPointsForRarity(rarity) {
        return RARITY_REPAIR_POINTS[rarity] || RARITY_REPAIR_POINTS.N;
    }

    function updateAreaDisplay() {
        if (!areaLayer) return;

        areaLayer.eachLayer(layer => {
            const area = layer.areaData;
            if (!area || !layer.getTooltip) return;

            const points = getAreaRepairPoints(area);
            const record = getAreaRecord(area);
            const areaName = getAreaName(area);
            const label = record.purified
                ? tr('areaComplete', { area: areaName })
                : tr('areaProgress', {
                    area: areaName,
                    points: Math.min(points, area.requiredPoints),
                    required: area.requiredPoints
                });
            layer.setStyle?.({
                color: record.purified ? '#0f766e' : '#b7791f',
                fillColor: record.purified ? '#d7e8e4' : '#f6e7c8',
                fillOpacity: record.purified ? 0.08 : 0.025
            });
            layer.bindTooltip(label, {
                permanent: true,
                direction: 'top',
                className: 'area-label',
                interactive: false,
                offset: [0, -28],
                opacity: 0.9
            });
        });
    }

    function initAreas() {
        loadAreaProgress();
        areaLayer = L.layerGroup().addTo(map);

        const visibleAreas = state.forcedDemoArea?.id === 'ritsumeikan_oic'
            ? GAME_AREAS.filter(area => OIC_DEMO_AREA_IDS.has(area.id))
            : state.forcedDemoArea ? [state.forcedDemoArea] : GAME_AREAS;
        visibleAreas.forEach(area => {
            const circle = L.circle(area.center, {
                radius: area.radius,
                color: '#b7791f',
                weight: 1,
                fillColor: '#f6e7c8',
                fillOpacity: 0.025,
                dashArray: '14 12',
                interactive: false,
                pane: 'areaPane',
                className: 'repair-area-circle'
            });
            circle.areaData = area;
            areaLayer.addLayer(circle);
        });

        updateAreaDisplay();
    }

    function applyAreaRepair(area, questOrSpot, earnedPoints, rewardKey) {
        if (!area || !SM.quests) return null;

        const rarity = questOrSpot?.rarity || questOrSpot?.questData?.rarity || 'N';
        const record = getAreaRecord(area);
        const spot = questOrSpot?.spot || questOrSpot;
        const spotKey = rewardKey || SM.quests.getSpotKey(spot);
        const previousPoints = record.completedRewards[spotKey] || 0;
        let addedPoints = 0;

        if (!previousPoints) {
            record.completedSpotKeys.push(spotKey);
            record.completedRewards[spotKey] = earnedPoints;
            record.repairPoints += earnedPoints;
            addedPoints = earnedPoints;
        }

        const wasPurified = record.purified;
        if (record.repairPoints >= area.requiredPoints) {
            record.purified = true;
        }

        saveAreaProgress();
        updateAreaDisplay();

        return {
            area,
            rarity,
            addedPoints,
            earnedPoints,
            repairPoints: record.repairPoints,
            requiredPoints: area.requiredPoints,
            purified: record.purified,
            justPurified: record.purified && !wasPurified
        };
    }

    function recordQuestComplete(questOrSpot) {
        const spot = questOrSpot?.spot || questOrSpot;
        const rarity = questOrSpot?.rarity || questOrSpot?.questData?.rarity || 'N';
        const questReward = getQuestReward(rarity);
        const area = getSpotArea(spot);
        if (!area || !SM.quests) {
            addExplorerReward({ ...questReward, showToast: true });
            return {
                area: null,
                rarity,
                xp: questReward.xp,
                coins: questReward.coins,
                addedPoints: 0,
                earnedPoints: 0,
                outsideArea: true
            };
        }

        const earnedPoints = getRepairPointsForRarity(rarity);
        const result = applyAreaRepair(area, questOrSpot, earnedPoints);
        if (result?.addedPoints) {
            addExplorerReward({ ...questReward, showToast: true });
        }
        return result;
    }

    function recordCatComplete(questOrSpot) {
        const spot = questOrSpot?.spot || questOrSpot;
        const area = getAreaById(spot?.areaId)
            || getSpotArea(spot)
            || getSpotArea(state.lastPlayerPosition)
            || getNearestArea(spot?.lat ?? state.lastPlayerPosition?.lat, spot?.lng ?? state.lastPlayerPosition?.lng);

        if (!area) {
            return {
                area: null,
                rarity: questOrSpot?.rarity || 'SSR',
                addedPoints: 0,
                earnedPoints: 0,
                outsideArea: true,
                isCat: true
            };
        }

        const rewardKey = `cat_help_${spot?.id || Date.now()}`;
        const result = {
            ...applyAreaRepair(area, questOrSpot, CAT_REPAIR_POINTS, rewardKey),
            isCat: true
        };
        if (result?.addedPoints) {
            addExplorerReward({ ...QUEST_REWARDS.npc, showToast: true });
        }
        return result;
    }

    function createSignalMarker(spot, config) {
        const icon = L.divIcon({
            className: 'custom-marker signal-marker',
            html: `<div class="signal-dot" data-spot-type="${escapeAttribute(spot.type)}" data-spot-name="${escapeAttribute(spot.name)}">?</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        const marker = L.marker([spot.lat, spot.lng], { icon });
        marker.spotData = spot;
        marker.on('click', () => {});
        return marker;
    }

    function createDistantSignalMarker(playerLat, playerLng, targetSpot, config) {
        const icon = L.divIcon({
            className: 'custom-marker distant-signal-marker',
            html: `<div class="distant-signal-dot" data-spot-type="${escapeAttribute(targetSpot.type)}" data-spot-name="${escapeAttribute(targetSpot.name)}">?</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        const marker = L.marker([targetSpot.lat, targetSpot.lng], {
            icon,
            opacity: 1,
            zIndexOffset: -20
        });
        marker.spotData = targetSpot;
        marker.on('click', () => {});
        return marker;
    }

    function getBearingDegrees(fromLat, fromLng, toLat, toLng) {
        return (Math.atan2(toLng - fromLng, toLat - fromLat) * 180 / Math.PI + 360) % 360;
    }

    function getAngleDistanceDegrees(angleA, angleB) {
        const diff = Math.abs(angleA - angleB) % 360;
        return Math.min(diff, 360 - diff);
    }

    function getDirectionLabel(fromLat, fromLng, toLat, toLng) {
        const degrees = getBearingDegrees(fromLat, fromLng, toLat, toLng);
        const lang = SM.i18n?.getLang?.() || 'zh';
        const labels = lang === 'ja'
            ? ['北', '北東', '東', '南東', '南', '南西', '西', '北西']
            : ['北边', '东北边', '东边', '东南边', '南边', '西南边', '西边', '西北边'];
        return labels[Math.round(degrees / 45) % 8];
    }

    function getDistantSpotsOutsideScan(playerLat, playerLng, config, limit = MAX_DISTANT_SIGNALS) {
        const playerLocation = L.latLng(playerLat, playerLng);
        const selected = [];
        const selectedAngles = [];

        const candidates = allSpots
            .filter(isSpotVisibleInCurrentChapter)
            .map(spot => ({
                ...spot,
                distance: playerLocation.distanceTo([spot.lat, spot.lng]),
                discoveryKey: getSpotDiscoveryKey(spot)
            }))
            .filter(spot => {
                return spot.distance >= config.scanRadius
                    && spot.distance <= MAX_DISTANT_SIGNAL_DISTANCE_METERS
                    && spot.discoveryKey;
            })
            .sort((a, b) => a.distance - b.distance);
        const candidatesByKey = new Map(candidates.map(spot => [spot.discoveryKey, spot]));
        const lockedKeys = Array.isArray(state.lockedDistantSignalKeys) ? state.lockedDistantSignalKeys : [];

        function addCandidate(spot, { enforceAngle = true } = {}) {
            if (!spot || selected.length >= limit) return false;
            if (selected.some(selectedSpot => selectedSpot.discoveryKey === spot.discoveryKey)) return false;
            const angle = getBearingDegrees(playerLat, playerLng, spot.lat, spot.lng);
            const isFarEnough = !enforceAngle || selectedAngles.every(existingAngle => {
                return getAngleDistanceDegrees(angle, existingAngle) >= MIN_DISTANT_SIGNAL_ANGLE_DEGREES;
            });
            if (!isFarEnough) return false;

            selected.push(spot);
            selectedAngles.push(angle);
            return true;
        }

        lockedKeys.forEach(key => {
            addCandidate(candidatesByKey.get(key), { enforceAngle: false });
        });

        for (const spot of candidates) {
            if (selected.length >= limit) break;
            addCandidate(spot, { enforceAngle: true });
        }

        if (selected.length === 0 && candidates[0]) {
            selected.push(candidates[0]);
        }

        state.lockedDistantSignalKeys = selected.map(spot => spot.discoveryKey).filter(Boolean);
        return selected;
    }

    function hasCompletedTutorialPenQuest() {
        try {
            return localStorage.getItem(TUTORIAL_PEN_COMPLETE_KEY) === '1';
        } catch (error) {
            return false;
        }
    }

    function formatChapterText(template, params = {}) {
        return String(template || '').replace(/\{(\w+)\}/g, (_, key) => params[key] ?? '');
    }

    function getChapterObjectiveState() {
        if (!hasCompletedTutorialPenQuest()) return null;
        const c = getChapterCopy();
        const completedCount = Math.min(chapterProgress.convenienceCompletedSpotKeys.length, CONVENIENCE_DUNGEON_REQUIRED_CARDS);

        if (chapterProgress.convenienceDungeonCleared || chapterProgress.currentChapter === 'station') {
            return {
                kicker: c.objectiveKicker,
                title: c.stationObjectiveTitle,
                body: c.stationObjectiveBody,
                progress: c.stationProgress,
                action: ''
            };
        }

        if (chapterProgress.convenienceDungeonUnlocked) {
            return {
                kicker: c.objectiveKicker,
                title: c.dungeonObjectiveTitle,
                body: c.dungeonObjectiveBody,
                progress: formatChapterText(c.cardProgress, { count: CONVENIENCE_DUNGEON_REQUIRED_CARDS, required: CONVENIENCE_DUNGEON_REQUIRED_CARDS }),
                action: c.dungeonButton
            };
        }

        return {
            kicker: c.objectiveKicker,
            title: c.convenienceObjectiveTitle,
            body: c.convenienceObjectiveBody,
            progress: formatChapterText(c.cardProgress, { count: completedCount, required: CONVENIENCE_DUNGEON_REQUIRED_CARDS }),
            action: ''
        };
    }

    function getChapterObjectiveHud() {
        let hud = document.getElementById('chapter-objective-hud');
        if (hud) return hud;

        hud = document.createElement('button');
        hud.id = 'chapter-objective-hud';
        hud.type = 'button';
        hud.hidden = true;
        hud.innerHTML = `
            <span class="chapter-objective-kicker"></span>
            <span class="chapter-objective-title"></span>
            <span class="chapter-objective-body"></span>
            <span class="chapter-objective-progress"></span>
        `;
        hud.addEventListener('click', () => {
            if (chapterProgress.convenienceDungeonUnlocked && !chapterProgress.convenienceDungeonCleared) {
                openConvenienceDungeon();
            } else if (state.lastPlayerPosition) {
                focusOnPlayer();
            }
        });
        document.body.appendChild(hud);
        return hud;
    }

    function updateChapterObjectiveHud() {
        const hud = getChapterObjectiveHud();
        const objective = getChapterObjectiveState();
        hud.hidden = !objective;
        if (!objective) return;

        hud.querySelector('.chapter-objective-kicker').textContent = objective.kicker;
        hud.querySelector('.chapter-objective-title').textContent = objective.title;
        hud.querySelector('.chapter-objective-body').textContent = objective.body;
        hud.querySelector('.chapter-objective-progress').textContent = objective.action || objective.progress;
        hud.classList.toggle('actionable', Boolean(objective.action));
    }

    function maybePromptChapterStart() {
        if (!hasCompletedTutorialPenQuest()) return;
        if (chapterProgress.chapterStartPrompted || chapterProgress.convenienceDungeonUnlocked || chapterProgress.convenienceDungeonCleared) return;
        chapterProgress.chapterStartPrompted = true;
        saveChapterProgress();
        updateChapterObjectiveHud();
        const c = getChapterCopy();
        SM.ui?.showGuideSequence?.(c.chapterStartLines, { type: 'info' });
    }
    function getConvenienceDungeonCards() {
        const cards = SM.inventory?.getCards?.() || [];
        const seen = new Set();
        return cards.filter(card => card?.quest?.spotType === 'convenience' && card?.word?.text).filter(card => {
            const key = getQuestSpotProgressKey(card) || card.word.text;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, CONVENIENCE_DUNGEON_REQUIRED_CARDS);
    }

    function updateChapterDungeonButton() {
        const button = getChapterDungeonButton();
        const shouldShow = chapterProgress.convenienceDungeonUnlocked && !chapterProgress.convenienceDungeonCleared;
        button.hidden = !shouldShow;
        if (shouldShow) {
            button.textContent = getChapterCopy().dungeonButton;
        }
    }

    function getChapterDungeonButton() {
        let button = document.getElementById('chapter-dungeon-btn');
        if (button) return button;

        button = document.createElement('button');
        button.id = 'chapter-dungeon-btn';
        button.type = 'button';
        button.hidden = true;
        button.addEventListener('click', openConvenienceDungeon);
        document.body.appendChild(button);
        return button;
    }

    function maybePromptConvenienceDungeon() {
        if (!chapterProgress.convenienceDungeonUnlocked || chapterProgress.convenienceDungeonCleared) return;
        updateChapterDungeonButton();
        updateChapterObjectiveHud();
        if (chapterProgress.convenienceDungeonPrompted) return;

        chapterProgress.convenienceDungeonPrompted = true;
        saveChapterProgress();
        const c = getChapterCopy();
        SM.ui?.showGuideSequence?.(c.unlockedLines, {
            type: 'success',
            finalButtonLabel: c.challenge,
            onComplete: openConvenienceDungeon
        });
    }

    function onWordCardCollected(card) {
        if (card?.quest?.spotType !== 'convenience' || chapterProgress.convenienceDungeonCleared) return;

        const key = getQuestSpotProgressKey(card);
        if (key && !chapterProgress.convenienceCompletedSpotKeys.includes(key)) {
            chapterProgress.convenienceCompletedSpotKeys.push(key);
        }
        if (chapterProgress.convenienceCompletedSpotKeys.length >= CONVENIENCE_DUNGEON_REQUIRED_CARDS) {
            chapterProgress.convenienceDungeonUnlocked = true;
            if (state.lastPlayerPosition) {
                updateVisibleSpots(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng);
            }
        }
        saveChapterProgress();
        updateChapterObjectiveHud();
        maybePromptChapterStart();
        maybePromptConvenienceDungeon();
    }

    function getChapterDungeonLayer() {
        let layer = document.getElementById('chapter-dungeon-layer');
        if (layer) return layer;

        layer = document.createElement('div');
        layer.id = 'chapter-dungeon-layer';
        layer.className = 'hidden';
        layer.innerHTML = `
            <div class="chapter-dungeon-panel" role="dialog" aria-modal="true">
                <div class="chapter-dungeon-top">
                    <div>
                        <div class="chapter-dungeon-kicker"></div>
                        <h2 class="chapter-dungeon-title"></h2>
                    </div>
                    <button type="button" class="chapter-dungeon-close">×</button>
                </div>
                <div class="chapter-dungeon-body"></div>
                <div class="chapter-dungeon-options"></div>
                <button type="button" class="chapter-dungeon-main"></button>
            </div>
        `;
        document.body.appendChild(layer);
        layer.querySelector('.chapter-dungeon-close')?.addEventListener('click', closeChapterDungeon);
        layer.querySelector('.chapter-dungeon-main')?.addEventListener('click', () => {
            if (!activeDungeon) return;
            if (activeDungeon.status === 'intro') {
                activeDungeon.status = 'question';
                activeDungeon.index = 0;
                renderChapterDungeon();
                return;
            }
            if (activeDungeon.status === 'answered') {
                activeDungeon.index += 1;
                activeDungeon.status = activeDungeon.index >= activeDungeon.questions.length ? 'clear' : 'question';
                renderChapterDungeon();
                return;
            }
            if (activeDungeon.status === 'clear') {
                completeConvenienceDungeon();
            }
        });
        return layer;
    }

    function closeChapterDungeon() {
        document.getElementById('chapter-dungeon-layer')?.classList.add('hidden');
        activeDungeon = null;
    }

    function buildDungeonQuestions(cards) {
        const fallbackMeanings = ['water', 'bread', 'rice ball', 'ticket', 'station', 'tree'];
        const meanings = cards.map(card => card.word?.zh || card.word?.kana || card.word?.text).filter(Boolean);
        return cards.slice(0, CONVENIENCE_DUNGEON_REQUIRED_CARDS).map(card => {
            const answer = card.word?.zh || card.word?.kana || card.word?.text;
            const pool = [...meanings, ...fallbackMeanings].filter(item => item && item !== answer);
            const options = [answer];
            for (const item of pool) {
                if (options.length >= 3) break;
                if (!options.includes(item)) options.push(item);
            }
            while (options.length < 3) options.push('?');
            return {
                prompt: `「${card.word.text}」`,
                answer,
                options: options.sort(() => Math.random() - 0.5)
            };
        });
    }

    function openConvenienceDungeon() {
        if (!chapterProgress.convenienceDungeonUnlocked || chapterProgress.convenienceDungeonCleared) return;
        const cards = getConvenienceDungeonCards();
        if (cards.length < CONVENIENCE_DUNGEON_REQUIRED_CARDS) {
            SM.ui?.showToast?.('便利店词卡还不够。先完成 3 个便利店任务。', { type: 'warning', duration: 3200 });
            return;
        }

        activeDungeon = {
            status: 'intro',
            index: 0,
            questions: buildDungeonQuestions(cards),
            correct: 0
        };
        getChapterDungeonLayer().classList.remove('hidden');
        renderChapterDungeon();
    }

    function renderChapterDungeon() {
        if (!activeDungeon) return;
        const c = getChapterCopy();
        const layer = getChapterDungeonLayer();
        const kicker = layer.querySelector('.chapter-dungeon-kicker');
        const title = layer.querySelector('.chapter-dungeon-title');
        const body = layer.querySelector('.chapter-dungeon-body');
        const options = layer.querySelector('.chapter-dungeon-options');
        const main = layer.querySelector('.chapter-dungeon-main');

        if (kicker) kicker.textContent = c.dungeonKicker;
        if (title) title.textContent = c.dungeonTitle;
        if (options) options.innerHTML = '';

        if (activeDungeon.status === 'intro') {
            if (body) body.innerHTML = `<p>${escapeAttribute(c.dungeonIntro)}</p>`;
            if (main) {
                main.hidden = false;
                main.textContent = c.start;
            }
            return;
        }

        if (activeDungeon.status === 'question' || activeDungeon.status === 'answered') {
            const question = activeDungeon.questions[activeDungeon.index];
            if (body) {
                body.innerHTML = `<div class="chapter-dungeon-progress">${activeDungeon.index + 1}/${activeDungeon.questions.length}</div><p>${escapeAttribute(c.questionPrefix)}</p><div class="chapter-dungeon-word">${escapeAttribute(question.prompt)}</div>`;
            }
            if (options) {
                question.options.forEach(option => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'chapter-dungeon-option';
                    button.textContent = option;
                    button.disabled = activeDungeon.status === 'answered';
                    if (activeDungeon.status === 'answered') {
                        button.classList.toggle('correct', option === question.answer);
                        button.classList.toggle('wrong', option === activeDungeon.selected && option !== question.answer);
                    }
                    button.addEventListener('click', () => answerDungeonQuestion(option));
                    options.appendChild(button);
                });
            }
            if (main) {
                main.hidden = activeDungeon.status !== 'answered';
                main.textContent = c.next;
            }
            return;
        }

        if (activeDungeon.status === 'clear') {
            if (body) body.innerHTML = `<div class="chapter-dungeon-clear">${escapeAttribute(c.clearTitle)}</div><p>EXP +30 / Coin +20</p>`;
            if (main) {
                main.hidden = false;
                main.textContent = c.clear;
            }
        }
    }

    function answerDungeonQuestion(option) {
        if (!activeDungeon || activeDungeon.status !== 'question') return;
        const question = activeDungeon.questions[activeDungeon.index];
        activeDungeon.selected = option;
        if (option === question.answer) activeDungeon.correct += 1;
        activeDungeon.status = 'answered';
        renderChapterDungeon();
    }

    function completeConvenienceDungeon() {
        closeChapterDungeon();
        chapterProgress.convenienceDungeonCleared = true;
        chapterProgress.currentChapter = 'station';
        saveChapterProgress();
        updateChapterDungeonButton();
        updateChapterObjectiveHud();
        grantExplorerReward({ xp: 30, coins: 20, showToast: true });
        if (state.lastPlayerPosition) {
            updateVisibleSpots(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng);
        }
        const c = getChapterCopy();
        SM.ui?.showGuideSequence?.(c.clearLines, { type: 'success' });
    }
    function isSpotVisibleInCurrentChapter(spot) {
        if (!spot) return false;
        if (spot.type === 'tutorial_pen') return true;
        if (!hasCompletedTutorialPenQuest()) return false;
        if (spot.type === 'convenience' && chapterProgress.convenienceDungeonUnlocked && !chapterProgress.convenienceDungeonCleared) return false;
        return getUnlockedSpotTypes().has(spot.type);
    }

    function areNpcEventsUnlocked() {
        return chapterProgress.convenienceDungeonCleared;
    }

    function hasSeenTutorialPenQuest() {
        try {
            return localStorage.getItem(TUTORIAL_PEN_SEEN_KEY) === '1';
        } catch (error) {
            return false;
        }
    }

    function markTutorialPenSeen() {
        state.tutorialPenActiveThisSession = true;
        try {
            localStorage.setItem(TUTORIAL_PEN_SEEN_KEY, '1');
        } catch (error) {
            console.warn('Failed to save tutorial pen seen state.', error);
        }
    }

    function getOffsetPosition(lat, lng, northMeters, eastMeters) {
        const latOffset = northMeters / 111320;
        const lngScale = Math.max(0.2, Math.cos(lat * Math.PI / 180));
        const lngOffset = eastMeters / (111320 * lngScale);
        return { lat: lat + latOffset, lng: lng + lngOffset };
    }

    function getTutorialPenSpot(playerLat, playerLng) {
        if (hasCompletedTutorialPenQuest()) return null;
        if (hasSeenTutorialPenQuest() && !state.tutorialPenActiveThisSession) return null;

        const position = getOffsetPosition(playerLat, playerLng, TUTORIAL_PEN_OFFSET_METERS, TUTORIAL_PEN_OFFSET_METERS * 0.45);
        return {
            id: TUTORIAL_PEN_SPOT_ID,
            lat: position.lat,
            lng: position.lng,
            distance: L.latLng(playerLat, playerLng).distanceTo([position.lat, position.lng]),
            type: 'tutorial_pen',
            questTag: 'Item',
            emoji: '!',
            name: tr('tutorialPracticeSpotName'),
            questData: {
                rarity: 'N',
                text: '[ ? ] を持っています。',
                grammar: 'N を持っています',
                instruction: tr('tutorialPracticeInstruction'),
                level: state.currentLevel || 'N5',
                requiredTag: 'Item',
                rewardCount: 1,
                config: {
                    color: '#0f766e',
                    label: 'Practice',
                    scale: 1
                }
            }
        };
    }

    function getCollapseZonePixelDiameter(spot, radiusMeters) {
        if (!map) return 96;
        const lngScale = Math.max(0.2, Math.cos(spot.lat * Math.PI / 180));
        const edgeLng = spot.lng + radiusMeters / (111320 * lngScale);
        const centerPoint = map.latLngToLayerPoint([spot.lat, spot.lng]);
        const edgePoint = map.latLngToLayerPoint([spot.lat, edgeLng]);
        return Math.max(42, Math.min(560, Math.round(centerPoint.distanceTo(edgePoint) * 2)));
    }

    function createCollapseErrorZoneHtml(spot, isTutorialMarker = false) {
        const zoneRadius = isTutorialMarker ? Math.max(70, TUTORIAL_PEN_OFFSET_METERS * 1.7) : SCAN_START_RADIUS_METERS;
        const pixelDiameter = getCollapseZonePixelDiameter(spot, zoneRadius);
        const clipId = `collapse-zone-${Math.random().toString(36).slice(2)}`;
        return `
            <div class="collapse-error-child" aria-hidden="true" style="--collapse-zone-size: ${pixelDiameter}px;" data-collapse-radius="${zoneRadius}">
                <svg class="collapse-error-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <clipPath id="${clipId}">
                    <circle cx="50" cy="50" r="48"></circle>
                </clipPath>
                <radialGradient id="${clipId}-fade" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="rgba(0,0,0,1)"></stop>
                    <stop offset="58%" stop-color="rgba(8,9,12,0.98)"></stop>
                    <stop offset="78%" stop-color="rgba(225,29,72,0.92)"></stop>
                    <stop offset="100%" stop-color="rgba(0,0,0,0)"></stop>
                </radialGradient>
            </defs>
            <circle class="collapse-error-svg-base" cx="50" cy="50" r="48"></circle>
            <g class="collapse-error-svg-noise" clip-path="url(#${clipId})">
                <rect x="0" y="0" width="100" height="100" fill="url(#${clipId}-fade)"></rect>
                <rect class="collapse-error-svg-scan scan-a" x="-10" y="15" width="120" height="5"></rect>
                <rect class="collapse-error-svg-scan scan-b" x="-10" y="35" width="120" height="8"></rect>
                <rect class="collapse-error-svg-scan scan-c" x="-10" y="57" width="120" height="4"></rect>
                <rect class="collapse-error-svg-scan scan-d" x="-10" y="76" width="120" height="7"></rect>
                <rect class="collapse-error-svg-band band-a" x="0" y="24" width="100" height="9"></rect>
                <rect class="collapse-error-svg-band band-b" x="0" y="47" width="100" height="11"></rect>
                <rect class="collapse-error-svg-band band-c" x="0" y="67" width="100" height="8"></rect>
            </g>
            <circle class="collapse-error-svg-edge" cx="50" cy="50" r="48"></circle>
                </svg>
            </div>
        `;
    }

    function updateCollapseZoneSize(marker) {
        if (!marker?.spotData || !marker._icon) return;
        const zoneElement = marker._icon.querySelector('.collapse-error-child');
        if (!zoneElement) return;
        const radius = Number(zoneElement.dataset.collapseRadius) || SCAN_START_RADIUS_METERS;
        zoneElement.style.setProperty('--collapse-zone-size', `${getCollapseZonePixelDiameter(marker.spotData, radius)}px`);
    }

    function updateCollapseZoneSizes() {
        if (!dynamicMarkersLayer) return;
        dynamicMarkersLayer.eachLayer(layer => updateCollapseZoneSize(layer));
    }

    function clearCollapseErrorZone(marker) {
        const zoneElement = marker?._icon?.querySelector?.('.collapse-error-child');
        if (!zoneElement) return;

        zoneElement.classList.add('collapse-error-zone-repaired');
        window.setTimeout(() => zoneElement.remove(), 520);
        marker.collapseErrorZone = null;
    }

    function createPoiMarker(spot) {
        const questState = SM.quests.getQuestStateForSpot(spot);
        if (questState.status === 'completed') {
            return createCompletedQuestMarker(spot);
        }

        if (isConvenienceMultiQuestSpot(spot) && getConvenienceSpotCompletedCount(spot) >= CONVENIENCE_DUNGEON_REQUIRED_CARDS) {
            return createCompletedQuestMarker(spot);
        }

        const markerQuestData = questState.questData;
        const explorerConfig = getExplorerConfig();
        const distanceToPlayer = Number(spot.distance ?? (
            state.lastPlayerPosition
                ? L.latLng(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng).distanceTo([spot.lat, spot.lng])
                : Infinity
        ));
        const isInteractable = distanceToPlayer <= explorerConfig.scanRadius;
        const config = markerQuestData.config
            || SM.quests.RARITY_CONFIG[markerQuestData.rarity]
            || SM.quests.RARITY_CONFIG.N;
        const isTutorialMarker = spot.type === 'tutorial_pen';
        const size = spot.type === 'npc_cat' ? 36 : isTutorialMarker ? 34 : 30;
        const spotTypeAttr = escapeAttribute(spot.type);
        const spotNameAttr = escapeAttribute(spot.name);
        const isSrMarker = markerQuestData.rarity === 'SR';
        const markerBackground = isTutorialMarker
            ? 'radial-gradient(circle at 32% 24%, #d1fff7 0%, #21b7a2 38%, #0f766e 100%)'
            : isSrMarker
            ? 'radial-gradient(circle at 30% 24%, #fff8b8 0%, #f6d84a 34%, #d69a14 72%, #9c6507 100%)'
            : 'radial-gradient(circle at 34% 28%, #ffb3b3 0%, #dc2626 32%, #7f1d1d 66%, #16070a 100%)';
        const markerBorder = isTutorialMarker ? '2px solid #e6fffb' : isSrMarker ? '2px solid #fff4b0' : '2px solid rgba(255,255,255,0.92)';
        const markerShadow = isTutorialMarker
            ? '0 0 0 3px rgba(255,255,255,0.7), 0 0 18px rgba(15,118,110,0.88), 0 4px 14px rgba(8,75,68,0.28)'
            : isSrMarker
            ? '0 0 0 3px rgba(255,255,255,0.7), 0 0 18px rgba(246,199,68,0.95), 0 4px 14px rgba(120,80,0,0.32)'
            : '0 0 0 3px rgba(255,255,255,0.42), 0 0 14px rgba(225,29,72,0.72), 0 4px 14px rgba(0,0,0,0.34)';
        const markerTextShadow = isSrMarker || isTutorialMarker ? '0 1px 3px rgba(0,0,0,0.35)' : 'none';
        const markerOpacity = isInteractable ? '1' : '0.62';
        const collapseZoneHtml = spot.type !== 'npc_cat' ? createCollapseErrorZoneHtml(spot, isTutorialMarker) : '';
        const sparkleHtml = isSrMarker
            ? '<span style="position:absolute; top:3px; right:5px; font-size:10px; line-height:1; color:#fff8b8; text-shadow:0 0 5px rgba(255,255,255,0.9);">✦</span>'
            : '';

        let iconHtml = "";
        if (spot.type === 'npc_cat') {
            iconHtml = `<div data-spot-type="${spotTypeAttr}" data-spot-name="${spotNameAttr}" style="font-size: 28px; text-align: center; line-height: ${size}px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">🐱</div>`;
        } else {
            iconHtml = `<div class="collapse-marker-shell" data-spot-type="${spotTypeAttr}" data-spot-name="${spotNameAttr}">
                ${collapseZoneHtml}
                <div class="${isTutorialMarker ? 'tutorial-pen-core' : 'quest-marker-core'}" style="
                position: relative;
                background: ${markerBackground};
                width: 100%; height: 100%;
                border-radius: 50%;
                border: ${markerBorder};
                display: flex; align-items: center; justify-content: center;
                color: white; font-weight: bold; font-size: 10px;
                text-shadow: ${markerTextShadow};
                box-shadow: ${markerShadow};
                opacity: ${markerOpacity};">
                <span style="position: relative; z-index: 1;">${isTutorialMarker ? '!' : markerQuestData.rarity}</span>
                ${sparkleHtml}
                </div>
            </div>`;
        }

        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: iconHtml,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });

        const marker = L.marker([spot.lat, spot.lng], { icon: customIcon });
        marker.spotData = spot;
        marker.questData = markerQuestData;
        if (spot.type !== 'npc_cat') {
            marker.collapseErrorZone = true;
            marker.on('add', () => updateCollapseZoneSize(marker));
        }

        marker.on('click', () => {
            if (!isInteractable) {
                return;
            }
            openQuestUI(marker.questData, spot, marker);
        });

        return marker;
    }

    function escapeQuestChoiceText(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function openConvenienceTaskChoice(spot, marker) {
        const questLayer = document.getElementById('quest-layer');
        const questTitle = questLayer.querySelector('.quest-content h3');
        const repairPointsChip = questLayer.querySelector('#quest-repair-points');
        const preview = questLayer.querySelector('.sentence-preview');
        const startScanButton = document.getElementById('btn-start-scan');
        const choices = getConvenienceTaskChoices(spot);
        const isJa = getLangForChapterCopy() === 'ja';
        let activeIndex = Math.max(0, choices.findIndex(choice => {
            return choice.status !== 'completed' && !chapterProgress.convenienceCompletedSpotKeys.includes(choice.spot.id);
        }));
        let hint = questLayer.querySelector('.quest-tutorial-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.className = 'quest-tutorial-hint';
            preview.insertAdjacentElement('afterend', hint);
        }

        function hasSeenTaskSwitchHint() {
            try {
                return localStorage.getItem(CONVENIENCE_TASK_SWITCH_HINT_KEY) === '1';
            } catch (error) {
                return Boolean(state.convenienceTaskSwitchHintSeen);
            }
        }

        function markTaskSwitchHintSeen() {
            state.convenienceTaskSwitchHintSeen = true;
            try {
                localStorage.setItem(CONVENIENCE_TASK_SWITCH_HINT_KEY, '1');
            } catch (error) {
                // In-memory state is enough if localStorage is unavailable.
            }
            updateHint();
        }

        function updateHint() {
            if (!hint) return;
            hint.hidden = hasSeenTaskSwitchHint();
            hint.innerText = isJa ? '\u5de6\u53f3\u306b\u5207\u66ff' : '\u5de6\u53f3\u5207\u6362\u4efb\u52a1';
        }

        function isChoiceDone(choice) {
            return choice.status === 'completed' || chapterProgress.convenienceCompletedSpotKeys.includes(choice.spot.id);
        }

        function updateHeader() {
            const completedCount = choices.filter(isChoiceDone).length;
            questTitle.innerText = isJa ? '\u30b3\u30f3\u30d3\u30cb\u306e\u5d29\u58ca\u30ce\u30fc\u30c9' : '\u4fbf\u5229\u5e97\u7684\u5d29\u574f\u8282\u70b9';
            questTitle.style.color = 'var(--accent-dark)';
            if (repairPointsChip) {
                repairPointsChip.hidden = false;
                repairPointsChip.classList.remove('outside', 'special');
                repairPointsChip.innerText = isJa
                    ? `\u4fee\u5fa9 ${completedCount}/${CONVENIENCE_DUNGEON_REQUIRED_CARDS}`
                    : `\u4fee\u590d ${completedCount}/${CONVENIENCE_DUNGEON_REQUIRED_CARDS}`;
            }
        }

        function switchTask(nextIndex, { markSeen = false } = {}) {
            activeIndex = (nextIndex + choices.length) % choices.length;
            if (markSeen) markTaskSwitchHintSeen();
            renderSentenceCarousel();
        }

        function bindSwipeSwitch() {
            const card = preview.querySelector('.convenience-sentence-preview');
            if (!card) return;
            let startX = 0;
            let startY = 0;
            let tracking = false;

            card.addEventListener('touchstart', event => {
                const touch = event.touches?.[0];
                if (!touch) return;
                startX = touch.clientX;
                startY = touch.clientY;
                tracking = true;
            }, { passive: true });

            card.addEventListener('touchend', event => {
                if (!tracking) return;
                tracking = false;
                const touch = event.changedTouches?.[0];
                if (!touch) return;
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
                event.preventDefault();
                switchTask(activeIndex + (dx < 0 ? 1 : -1), { markSeen: true });
            }, { passive: false });
        }

        function renderSentenceCarousel() {
            const choice = choices[activeIndex] || choices[0];
            const done = isChoiceDone(choice);
            const sentenceParts = escapeQuestChoiceText(choice?.questData?.text || '[ ? ]').split('[ ? ]');
            const beforeText = sentenceParts[0] || '';
            const afterText = sentenceParts.slice(1).join('[ ? ]') || '';
            const slotHtml = done
                ? '<span class="completed-slot">\u4fee\u5fa9\u6e08\u307f</span>'
                : '<button class="slot-box camera-slot convenience-camera-slot" type="button"><span class="slot-camera-icon" aria-hidden="true"></span><span class="slot-camera-label">\u5199\u771f</span></button>';
            const sentenceLayout = `
                <div class="sentence-fill-layout sentence-inline-layout">
                    ${beforeText ? `<span class="sentence-text sentence-before">${beforeText}</span>` : ''}
                    ${slotHtml}
                    ${afterText ? `<span class="sentence-text sentence-after">${afterText}</span>` : ''}
                </div>
            `;

            preview.innerHTML = `
                <div class="convenience-sentence-carousel">
                    <div class="convenience-sentence-preview${done ? ' completed' : ''}">${sentenceLayout}</div>
                    <div class="convenience-sentence-dots" aria-label="sentence choices">
                        ${choices.map((item, index) => {
                            const itemDone = isChoiceDone(item);
                            return `<button type="button" class="sentence-dot${index === activeIndex ? ' active' : ''}${itemDone ? ' completed' : ''}" data-task-index="${index}" aria-label="${index + 1}">${itemDone ? '\u2713' : ''}</button>`;
                        }).join('')}
                    </div>
                </div>
            `;

            preview.querySelector('.convenience-camera-slot')?.addEventListener('click', event => {
                event.preventDefault();
                if (!choice?.questData) return;
                openQuestUI(choice.questData, choice.spot, marker);
            });

            preview.querySelectorAll('.sentence-dot').forEach(button => {
                button.addEventListener('click', () => {
                    switchTask(Number(button.dataset.taskIndex || 0), { markSeen: true });
                });
            });

            bindSwipeSwitch();
        }

        updateHeader();
        renderSentenceCarousel();
        updateHint();

        if (startScanButton) startScanButton.hidden = true;
        document.querySelector('.location-tag').innerText = spot.name || (isJa ? '\u30b3\u30f3\u30d3\u30cb' : '\u4fbf\u5229\u5e97');
        state.activeQuest = null;

        SM.ui?.setBagHudHidden?.(true, 'quest-panel');
        questLayer.classList.remove('hidden');
        SM.ui?.hideGuideMessage?.();
    }
    function openQuestUI(data, spot, marker) {
        if (isConvenienceMultiQuestSpot(spot) && !Number.isInteger(data?.chapterTaskIndex)) {
            openConvenienceTaskChoice(spot, marker);
            return;
        }
        const questLayer = document.getElementById('quest-layer');
        const questTitle = questLayer.querySelector('.quest-content h3');
        const repairPointsChip = questLayer.querySelector('#quest-repair-points');
        const preview = questLayer.querySelector('.sentence-preview');
        const startScanButton = document.getElementById('btn-start-scan');
        const repairPoints = getRepairPointsForRarity(data.rarity);
        const isCatQuest = spot.type === 'npc_cat';
        const isTutorialQuest = spot.type === 'tutorial_pen';
        const targetArea = isCatQuest
            ? getAreaById(spot.areaId) || getSpotArea(spot) || getSpotArea(state.lastPlayerPosition) || getNearestArea(spot.lat, spot.lng)
            : isTutorialQuest
                ? null
            : getSpotArea(spot);

        questTitle.innerText = isTutorialQuest ? tr('tutorialQuestTitle') : tr('questTitle', { rarity: data.rarity });
        questTitle.style.color = data.config.color;
        if (repairPointsChip) {
            repairPointsChip.hidden = isTutorialQuest;
            repairPointsChip.classList.toggle('outside', !isTutorialQuest && !isCatQuest && !targetArea);
            repairPointsChip.classList.toggle('special', isCatQuest || isTutorialQuest);
            repairPointsChip.innerText = isTutorialQuest
                ? ''
                : isCatQuest
                    ? tr('questCatPoints', { points: CAT_REPAIR_POINTS })
                    : targetArea
                    ? tr('questAreaPoints', { points: repairPoints })
                    : tr('questOutside');
        }
        preview.innerHTML = data.text.replace('[ ? ]', '<button class="slot-box camera-slot" type="button"><span class="slot-camera-icon" aria-hidden="true"></span><span class="slot-camera-label">' + tr('cameraSlotLabel') + '</span></button>');
        let hint = questLayer.querySelector('.quest-tutorial-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.className = 'quest-tutorial-hint';
            preview.insertAdjacentElement('afterend', hint);
        }
        hint.hidden = !isTutorialQuest;
        hint.innerText = isTutorialQuest ? tr('tutorialQuestHint') : '';
        if (startScanButton) {
            if (!startScanButton.dataset.defaultText) {
                startScanButton.dataset.defaultText = startScanButton.innerText;
            }
            startScanButton.innerText = isTutorialQuest ? tr('tutorialScanButton') : startScanButton.dataset.defaultText;
            startScanButton.hidden = true;
        }

        state.activeQuest = {
            type: spot.type === 'npc_cat' ? 'NPC' : spot.type === 'tutorial_pen' ? 'TUTORIAL' : 'POI',
            rarity: data.rarity,
            text: data.text,
            grammar: data.grammar,
            instruction: data.instruction,
            level: data.level,
            requiredTag: data.requiredTag,
            rewardCount: data.rewardCount,
            chapterTaskIndex: data.chapterTaskIndex,
            chapterTaskTotal: data.chapterTaskTotal,
            parentSpotId: data.parentSpotId,
            keepMarkerUntilChapterComplete: Number.isInteger(data.chapterTaskIndex),
            targetAreaId: targetArea?.id || null,
            spot,
            marker
        };

        document.querySelector('.location-tag').innerText = isTutorialQuest
            ? spot.name
            : `${tr('collapseNodeName')} ${data.rarity}`;
        SM.ui?.setBagHudHidden?.(true, 'quest-panel');
        questLayer.classList.remove('hidden');
        if (isTutorialQuest) {
            SM.ui?.showGuideMessage?.(tr('mimiTutorialQuest'), { type: 'info', duration: 5200 });
        } else {
            SM.ui?.hideGuideMessage?.();
        }
    }

    function getScanStartCheck(quest = state.activeQuest) {
        if (!quest?.spot || !state.lastPlayerPosition) {
            return { ok: true, meters: 0 };
        }

        const radius = SCAN_START_RADIUS_METERS;
        const distance = L.latLng(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng)
            .distanceTo([quest.spot.lat, quest.spot.lng]);

        return {
            ok: distance <= radius,
            meters: Math.max(1, Math.ceil(distance - radius)),
            distance,
            radius
        };
    }

    async function loadOSMData() {
        try {
            const response = await fetch('spotsData.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error(tr('mapDataInvalid'));
            }

            allSpots = data;
            console.log(`✅ 成功加载了 ${allSpots.length} 个烘焙好的地标！`);
            updateVisibleSpots(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng);
        } catch (error) {
            console.error("加载数据失败", error);
            statusText.innerText = tr('mapDataFailed');
        }
    }

    function getLevelChoiceReaction() {
        const level = state.currentLevel || document.getElementById('level-selector')?.value || 'N5';
        return tr(`levelChoiceReaction.${level}`) || tr('levelChoiceComplete');
    }
    function showMimiIntroAfterLevelChoice() {
        if (hasCompletedTutorialPenQuest()) return;
        if (hasSeenTutorialPenQuest() && !state.tutorialPenActiveThisSession) return;

        if (isLevelOnboardingOpen()) {
            window.setTimeout(showMimiIntroAfterLevelChoice, 700);
            return;
        }

        if (!SM.vision?.hasSelectedLevel?.() && !state.levelChoiceAskedThisSession) {
            state.levelChoiceAskedThisSession = true;
            SM.ui?.showGuideSequence?.([
                tr('mimiIntroLine1'),
                tr('mimiIntroLine2'),
                tr('levelChoiceLead')
            ], {
                type: 'info',
                curtain: true,
                finalButtonLabel: tr('levelChoiceButton'),
                onComplete: () => {
                    SM.vision?.showLevelChoice?.(() => {
                        window.setTimeout(showMimiIntroAfterLevelChoice, 120);
                    });
                }
            });
            return;
        }

        SM.ui?.showGuideSequence?.([
            SM.vision?.hasSelectedLevel?.() && state.levelChoiceAskedThisSession
                ? getLevelChoiceReaction()
                : tr('mimiIntroLine1'),
            ...(SM.vision?.hasSelectedLevel?.() && state.levelChoiceAskedThisSession ? [] : [tr('mimiIntroLine2')]),
            tr('mimiIntroLine3'),
            tr('mimiIntroLine4')
        ], {
            type: 'info',
            curtain: true,
            alertIndex: SM.vision?.hasSelectedLevel?.() && state.levelChoiceAskedThisSession ? 1 : 2,
            revealOnComplete: true,
            onComplete: markTutorialPenSeen
        });
    }

    function isLevelOnboardingOpen() {
        const levelLayer = document.getElementById('level-onboarding-layer');
        return Boolean(levelLayer && !levelLayer.classList.contains('hidden'));
    }

    function updateVisibleSpots(playerLat, playerLng) {
        if (allSpots.length === 0 || playerLat == null || playerLng == null) return;

        const explorerConfig = getExplorerConfig();
        const playerLocation = L.latLng(playerLat, playerLng);
        dynamicMarkersLayer.clearLayers();
        updateRadarDisplay();

        const nearbySpots = allSpots
            .filter(isSpotVisibleInCurrentChapter)
            .map(spot => ({ ...spot, distance: playerLocation.distanceTo([spot.lat, spot.lng]) }))
            .filter(spot => spot.distance < explorerConfig.scanRadius)
            .sort((a, b) => a.distance - b.distance);
        const tutorialSpot = getTutorialPenSpot(playerLat, playerLng);
        if (tutorialSpot) {
            nearbySpots.splice(0, nearbySpots.length, tutorialSpot);
        }

        if (nearbySpots.length === 0) {
            const distantSpots = getDistantSpotsOutsideScan(playerLat, playerLng, explorerConfig);
            if (distantSpots.length) {
                distantSpots.forEach(spot => {
                    dynamicMarkersLayer.addLayer(createDistantSignalMarker(playerLat, playerLng, spot, explorerConfig));
                });
                state.visibleSpotKeys = distantSpots.map(spot => getSpotDiscoveryKey(spot)).filter(Boolean);
                state.visibleSpotsDebug = distantSpots.map(spot => ({
                    type: spot.type,
                    name: spot.name,
                    questTag: spot.questTag,
                    distantSignal: true,
                    distance: Math.round(spot.distance)
                }));
            }
            if (!distantSpots.length) {
                state.visibleSpotKeys = [];
                state.visibleSpotsDebug = [];
            }
            return;
        }

        const selectedSpots = [];
        const selectedByTag = {};
        const previousVisibleKeys = new Set(state.visibleSpotKeys || []);
        const lockedDistantKeys = new Set(state.lockedDistantSignalKeys || []);

        function isFarEnoughFromAllSpots(spot) {
            return selectedSpots.every(selected => {
                return L.latLng(selected.lat, selected.lng).distanceTo([spot.lat, spot.lng]) >= MIN_ANY_SPOT_DISTANCE_METERS;
            });
        }

        function isFarEnoughFromSameTag(spot) {
            return selectedSpots.every(selected => {
                if (selected.questTag !== spot.questTag) return true;
                return L.latLng(selected.lat, selected.lng).distanceTo([spot.lat, spot.lng]) >= MIN_SAME_TAG_DISTANCE_METERS;
            });
        }

        function trySelectSpot(spot, { enforceAnyDistance = true, enforceSameTagDistance = true, ignoreTagLimit = false } = {}) {
            const tag = spot.questTag || spot.type || 'Other';
            selectedByTag[tag] = selectedByTag[tag] || 0;
            if (selectedSpots.length >= explorerConfig.maxVisible) return false;
            if (!ignoreTagLimit && selectedByTag[tag] >= MAX_SPOTS_PER_TAG) return false;
            if (selectedSpots.some(selected => selected.lat === spot.lat && selected.lng === spot.lng)) return false;
            if (enforceAnyDistance && !isFarEnoughFromAllSpots(spot)) return false;
            if (enforceSameTagDistance && !isFarEnoughFromSameTag(spot)) return false;

            selectedSpots.push(spot);
            selectedByTag[tag]++;
            return true;
        }

        for (const spot of nearbySpots) {
            if (selectedSpots.length >= explorerConfig.maxVisible) break;
            if (spot.distance <= explorerConfig.unlockRadius) {
                trySelectSpot(spot, {
                    enforceAnyDistance: false,
                    enforceSameTagDistance: false,
                    ignoreTagLimit: true
                });
            }
        }

        for (const spot of nearbySpots) {
            if (selectedSpots.length >= explorerConfig.maxVisible) break;
            if (previousVisibleKeys.has(getSpotDiscoveryKey(spot))) {
                trySelectSpot(spot, {
                    enforceAnyDistance: false,
                    enforceSameTagDistance: false,
                    ignoreTagLimit: true
                });
            }
        }

        for (const spot of nearbySpots) {
            if (selectedSpots.length >= explorerConfig.maxVisible) break;
            if (lockedDistantKeys.has(getSpotDiscoveryKey(spot))) {
                trySelectSpot(spot, {
                    enforceAnyDistance: false,
                    enforceSameTagDistance: false,
                    ignoreTagLimit: true
                });
            }
        }

        for (const spot of nearbySpots) {
            const tag = spot.questTag || spot.type || 'Other';
            if (!selectedByTag[tag]) {
                trySelectSpot(spot, { enforceAnyDistance: true, enforceSameTagDistance: false });
            }
        }

        for (const spot of nearbySpots) {
            if (selectedSpots.length >= explorerConfig.maxVisible) break;
            if (spot.distance < explorerConfig.unlockRadius) {
                trySelectSpot(spot);
            }
        }

        const minimumVisible = Math.min(3, explorerConfig.maxVisible);
        if (selectedSpots.length < minimumVisible) {
            for (const spot of nearbySpots) {
                if (selectedSpots.length >= minimumVisible || selectedSpots.length >= explorerConfig.maxVisible) break;
                trySelectSpot(spot, { enforceAnyDistance: true, enforceSameTagDistance: false });
            }
        }

        state.visibleSpotsDebug = [];
        const currentVisibleKeys = [];
        let discoveredToastShown = false;

        selectedSpots.forEach(spot => {
            const isUnlocked = true;
            const marker = createPoiMarker(spot);
            if (marker) {
                dynamicMarkersLayer.addLayer(marker);
                currentVisibleKeys.push(getSpotDiscoveryKey(spot));
                if (isUnlocked && !isLevelOnboardingOpen() && !discoveredToastShown && spot.type !== 'tutorial_pen' && markSpotDiscovered(spot)) {
                    discoveredToastShown = true;
                    SM.ui?.showToast(tr('newPlaceFound', { place: spot.name }), { type: 'info', duration: 2400 });
                }
                const point = map.latLngToContainerPoint([spot.lat, spot.lng]);
                state.visibleSpotsDebug.push({
                    type: spot.type,
                    name: spot.name,
                    questTag: spot.questTag,
                    unlocked: isUnlocked,
                    distance: Math.round(spot.distance),
                    x: Math.round(point.x),
                    y: Math.round(point.y)
                });
            }
        });

        const distantHintCount = explorerConfig.distantHints || MAX_DISTANT_SIGNALS;
        getDistantSpotsOutsideScan(playerLat, playerLng, explorerConfig, distantHintCount).forEach(spot => {
            const marker = createDistantSignalMarker(playerLat, playerLng, spot, explorerConfig);
            dynamicMarkersLayer.addLayer(marker);
            currentVisibleKeys.push(getSpotDiscoveryKey(spot));
            state.visibleSpotsDebug.push({
                type: spot.type,
                name: spot.name,
                questTag: spot.questTag,
                distantSignal: true,
                distance: Math.round(spot.distance)
            });
        });
        state.visibleSpotKeys = currentVisibleKeys.filter(Boolean);

        console.log(`👀 雷达 Lv.${explorerConfig.level}: ${explorerConfig.scanRadius}m 视野，生成 ${selectedSpots.length} 个信号`, selectedByTag);
    }

    function removeMarkerForSpot(spot) {
        let actualMarkerOnMap = null;
        dynamicMarkersLayer.eachLayer(layer => {
            if (layer.spotData && layer.spotData.lat === spot.lat && layer.spotData.lng === spot.lng) {
                actualMarkerOnMap = layer;
            }
        });

        if (!actualMarkerOnMap) return;

        const iconElement = actualMarkerOnMap._icon;
        clearCollapseErrorZone(actualMarkerOnMap);
        if (iconElement) {
            iconElement.classList.add('marker-destroy-fx');
            setTimeout(() => {
                dynamicMarkersLayer.removeLayer(actualMarkerOnMap);
            }, 600);
        } else {
            dynamicMarkersLayer.removeLayer(actualMarkerOnMap);
        }
    }

    function getRandomCatDelay() {
        const min = state.devMode ? CAT_SPAWN_DELAY_MS.devMin : CAT_SPAWN_DELAY_MS.min;
        const max = state.devMode ? CAT_SPAWN_DELAY_MS.devMax : CAT_SPAWN_DELAY_MS.max;
        return Math.round(min + Math.random() * (max - min));
    }

    function scheduleRandomCatSpawn() {
        if (!areNpcEventsUnlocked()) return;
        if (catSpawnTimer || activeCatMarker || !playerMarker) return;

        catSpawnTimer = window.setTimeout(() => {
            catSpawnTimer = null;
            spawnTestCat();
        }, getRandomCatDelay());
    }

    function spawnTestCat() {
        if (!playerMarker || activeCatMarker) return;

        const playerPos = playerMarker.getLatLng();
        const angle = Math.random() * Math.PI * 2;
        const distanceMeters = 55 + Math.random() * 75;
        const latOffset = Math.cos(angle) * distanceMeters / 111320;
        const lngOffset = Math.sin(angle) * distanceMeters / (111320 * Math.max(0.2, Math.cos(playerPos.lat * Math.PI / 180)));
        const catLat = playerPos.lat + latOffset;
        const catLng = playerPos.lng + lngOffset;
        const spotKey = `cat_${Date.now()}`;
        const targetArea = getSpotArea({ lat: catLat, lng: catLng })
            || getSpotArea({ lat: playerPos.lat, lng: playerPos.lng })
            || getNearestArea(playerPos.lat, playerPos.lng);

        const spotData = {
            lat: catLat,
            lng: catLng,
            type: 'npc_cat',
            id: spotKey,
            areaId: targetArea?.id || null,
            name: tr('catName'),
            emoji: "🐱",
            questTag: "Food"
        };

        const markerQuestData = SM.quests.buildCatQuestData();
        SM.quests.questCache[spotKey] = markerQuestData;
        SM.quests.saveQuestCache();

        const catIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="font-size: 32px; text-align: center; animation: pulse 1.5s infinite; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.4)); cursor: pointer;">🐱</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        const marker = L.marker([catLat, catLng], { icon: catIcon }).addTo(map);
        activeCatMarker = marker;
        marker.questData = markerQuestData;
        marker.spotData = spotData;
        marker.on('click', () => {
            openQuestUI(marker.questData, spotData, marker);
        });
    }

    function clearCatEvent(marker) {
        if (marker && map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
        if (!marker || marker === activeCatMarker) {
            activeCatMarker = null;
        }
        scheduleRandomCatSpawn();
    }

    function getLimitedBounds(lat, lng) {
        const center = L.latLng(lat, lng);
        const latOffset = MAP_BOUNDS_RADIUS_METERS / 111320;
        const lngOffset = MAP_BOUNDS_RADIUS_METERS / (111320 * Math.max(0.2, Math.cos(center.lat * Math.PI / 180)));
        return L.latLngBounds(
            [center.lat - latOffset, center.lng - lngOffset],
            [center.lat + latOffset, center.lng + lngOffset]
        );
    }

    function updateMapBounds(lat, lng) {
        if (!map || lat == null || lng == null) return;
        const bounds = getLimitedBounds(lat, lng);
        map.setMaxBounds(bounds);
        state.mapBounds = bounds;
    }

    function focusOnPlayer(zoom = FOCUS_ZOOM) {
        if (!map || !state.lastPlayerPosition) return;
        const { lat, lng } = state.lastPlayerPosition;
        updateMapBounds(lat, lng);
        map.setView([lat, lng], zoom, { animate: true });
    }

    function initGeolocation() {
        if (state.forcedDemoArea) {
            setDemoPosition(tr('demoPosition', {
                area: getAreaName(state.forcedDemoArea),
                id: state.forcedDemoArea.id
            }));
            return;
        }

        if ('geolocation' in navigator) {
            navigator.geolocation.watchPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setPlayerPosition(lat, lng, 'gps', position.coords.heading);
                    updateMapBounds(lat, lng);

                    statusText.innerText = tr('gpsUpdated', {
                        lat: lat.toFixed(4),
                        lng: lng.toFixed(4)
                    });
                    if (!hasCenteredOnPlayer) {
                        map.setView([lat, lng], FOCUS_ZOOM);
                        hasCenteredOnPlayer = true;
                    }
                    scheduleRandomCatSpawn();

                    updateVisibleSpots(lat, lng);
                },
                (error) => {
                    console.warn("定位获取失败，使用默认演示位置:", error);
                    if (state.lastPlayerPosition?.source === 'gps') {
                        statusText.innerText = tr('gpsKept');
                        updateVisibleSpots(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng);
                        return;
                    }

                    setDemoPosition(tr('gpsFallback'));
                },
                { enableHighAccuracy: true, maximumAge: 0 }
            );
        } else {
            setDemoPosition(tr('gpsUnsupported'));
        }
    }

    function initLocateButton() {
        const locateBtn = document.getElementById('locate-btn');
        if (!locateBtn) return;

        locateBtn.addEventListener('click', () => {
            focusOnPlayer();
        });
    }

    function updateFloatingControlPositions() {
        const locateBtn = document.getElementById('locate-btn');
        const uiLayer = document.getElementById('ui-layer');
        if (!locateBtn || !uiLayer) return;

        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const panelRect = uiLayer.getBoundingClientRect();
        const gap = 14;
        const bottom = Math.max(24, viewportHeight - panelRect.top + gap);

        locateBtn.style.setProperty('--locate-btn-bottom', `${Math.round(bottom)}px`);
    }

    function initUiToggle() {
        const uiLayer = document.getElementById('ui-layer');
        const uiToggleBtn = document.getElementById('ui-toggle-btn');
        if (!uiToggleBtn || !uiLayer) return;

        uiLayer.classList.add('collapsed');
        uiToggleBtn.innerText = '▼';
        localStorage.setItem('uiLayerCollapsed', '1');
        updateFloatingControlPositions();

        uiToggleBtn.addEventListener('click', () => {
            const isCollapsed = uiLayer.classList.toggle('collapsed');
            uiToggleBtn.innerText = isCollapsed ? '▼' : '▲';
            localStorage.setItem('uiLayerCollapsed', isCollapsed ? '1' : '0');
            updateFloatingControlPositions();
            window.setTimeout(updateFloatingControlPositions, 360);
        });

        window.addEventListener('resize', updateFloatingControlPositions);
        window.setTimeout(updateFloatingControlPositions, 0);
        window.setTimeout(updateFloatingControlPositions, 400);
    }

    function startActiveQuestScan() {
        const scanCheck = getScanStartCheck(state.activeQuest);
        if (!scanCheck.ok) {
            SM.ui?.showGuideMessage?.(tr('moveCloserToScan', { meters: scanCheck.meters }), {
                type: 'warning',
                duration: 3200
            });
            return;
        }

        document.getElementById('quest-layer').classList.add('hidden');
        SM.ui?.setBagHudHidden?.(false, 'quest-panel');
        SM.vision.openCamera();
    }

    function initQuestButtons() {
        document.getElementById('btn-close-quest').addEventListener('click', () => {
            state.activeQuest = null;
            document.getElementById('quest-layer').classList.add('hidden');
            SM.ui?.setBagHudHidden?.(false, 'quest-panel');
        });

        document.getElementById('btn-start-scan').addEventListener('click', startActiveQuestScan);

        document.getElementById('quest-layer').addEventListener('click', event => {
            const cameraSlot = event.target.closest?.('.camera-slot');
            if (!cameraSlot) return;
            event.preventDefault();
            startActiveQuestScan();
        });

        document.getElementById('clear-cache-btn').addEventListener('click', SM.quests.clearQuestCacheAll);
    }

    function refreshLanguage() {
        updateAreaDisplay();
        updatePlayerProgressDisplay();

        if (state.forcedDemoArea && state.lastPlayerPosition?.source === 'demo') {
            statusText.innerText = tr('demoPosition', {
                area: getAreaName(state.forcedDemoArea),
                id: state.forcedDemoArea.id
            });
        }

        const questLayer = document.getElementById('quest-layer');
        if (!state.activeQuest || questLayer?.classList.contains('hidden')) return;

        const questTitle = questLayer.querySelector('.quest-content h3');
        const repairPointsChip = questLayer.querySelector('#quest-repair-points');
        const locationTag = questLayer.querySelector('.location-tag');
        const activeQuest = state.activeQuest;
        const isCatQuest = activeQuest.type === 'NPC';
        const isTutorialQuest = activeQuest.type === 'TUTORIAL';
        const targetArea = isCatQuest
            ? getAreaById(activeQuest.targetAreaId) || getSpotArea(activeQuest.spot) || getSpotArea(state.lastPlayerPosition) || getNearestArea(activeQuest.spot?.lat, activeQuest.spot?.lng)
            : isTutorialQuest
                ? null
            : getSpotArea(activeQuest.spot);

        if (questTitle) {
            questTitle.innerText = isTutorialQuest ? tr('tutorialQuestTitle') : tr('questTitle', { rarity: activeQuest.rarity });
        }

        if (locationTag) {
            locationTag.innerText = isTutorialQuest
                ? tr('collapseNodeName')
                : `${tr('collapseNodeName')} ${activeQuest.rarity}`;
        }

        if (repairPointsChip) {
            const repairPoints = getRepairPointsForRarity(activeQuest.rarity);
            repairPointsChip.hidden = isTutorialQuest;
            repairPointsChip.innerText = isTutorialQuest
                ? ''
                : isCatQuest
                    ? tr('questCatPoints', { points: CAT_REPAIR_POINTS })
                    : targetArea
                    ? tr('questAreaPoints', { points: repairPoints })
                    : tr('questOutside');
        }
    }

    function init() {
        statusText = document.getElementById('status-text');
        const defaultCenterConfig = getDefaultCenterConfig();
        const initialCenter = defaultCenterConfig.center;
        state.defaultCenter = initialCenter;
        state.defaultZoom = defaultCenterConfig.zoom || DEFAULT_ZOOM;
        state.defaultHeading = defaultCenterConfig.heading;
        state.forcedDemoArea = defaultCenterConfig.forcedDemo ? defaultCenterConfig.area : null;
        state.lastPlayerPosition = { lat: initialCenter[0], lng: initialCenter[1], source: 'initial' };

        map = L.map('map', {
            zoomControl: false,
            minZoom: 16,
            maxZoom: 18,
            zoomSnap: 0.5,
            maxBoundsViscosity: 0.9,
            inertiaMaxSpeed: 600
        }).setView(initialCenter, state.defaultZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        map.on('zoomend', () => {
            updateCollapseZoneSizes();
            renderCapturedWordMarkers();
        });
        map.createPane('areaPane');
        map.getPane('areaPane').style.zIndex = 380;
        map.getPane('areaPane').style.pointerEvents = 'none';
        map.createPane('radarPane');
        map.getPane('radarPane').style.zIndex = 430;
        map.getPane('radarPane').style.pointerEvents = 'none';

        dynamicMarkersLayer = L.layerGroup().addTo(map);
        capturedWordLayer = L.layerGroup().addTo(map);
        radarLayer = L.layerGroup().addTo(map);
        loadExplorerProgress();
        loadChapterProgress();
        updatePlayerProgressDisplay();
        updateChapterDungeonButton();
        initFogCanvas();
        updateRadarDisplay();
        initAreas();
        updateMapBounds(initialCenter[0], initialCenter[1]);

        initUiToggle();
        initQuestButtons();
        initLocateButton();
        updateFloatingControlPositions();
        initGeolocation();
        loadOSMData();
        renderCapturedWordMarkers();
        window.setTimeout(showMimiIntroAfterLevelChoice, 1300);
        window.setTimeout(maybePromptChapterStart, 1700);
    }

    SM.map = {
        init,
        get map() {
            return map;
        },
        openQuestUI,
        updateVisibleSpots,
        addCapturedWordCard,
        focusOnCapture,
        removeMarkerForSpot,
        clearCollapseErrorZone,
        focusOnPlayer,
        recordQuestComplete,
        recordCatComplete,
        grantExplorerXp: addExplorerXp,
        grantExplorerReward,
        clearCatEvent,
        spawnTestCat,
        areas: GAME_AREAS,
        getSpotArea,
        getAreaName,
        onWordCardCollected,
        openConvenienceDungeon,
        updateChapterObjectiveHud,
        refreshLanguage
    };
})();

(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    const QUEST_CACHE_STORAGE_KEY = 'semantic-map-quest-cache-v6';
    const COOLDOWN_TIME = 1000 * 60 * 60 * 2;
    const questCache = {};

    const QUEST_TEMPLATES = {
        N5: {
            convenience: [
                { rarity: 'R', weight: 0.3, text: "[ ? ] を買って飲みます。", req: "Food", grammar: "N を Vて Vます", instruction: "拍摄买来就能喝的饮料，例如水、咖啡或茶。", instructionJa: "買って飲めるものを撮影してください。例：水、コーヒー、お茶", reward: 1 },
                { rarity: 'N', weight: 0.3, text: "[ ? ] を買って食べます。", req: "Food", grammar: "N を Vて Vます", instruction: "拍摄买来就能吃的便利店食品。", instructionJa: "買って食べられるものを撮影してください。例：おにぎり、パン、弁当", reward: 1 },
                { rarity: 'R', weight: 0.25, text: "冷たい [ ? ] が飲みたいです。", req: "Food", grammar: "イ形容詞 + N が Vたいです", instruction: "拍摄一种冰的或冷藏的饮料。", instructionJa: "冷たい飲み物を撮影してください。例：水、お茶、ジュース", reward: 1 },
                { rarity: 'R', weight: 0.25, text: "甘い [ ? ] が食べたいです。", req: "Food", grammar: "イ形容詞 + N が Vたいです", instruction: "拍摄一种甜点、糖果或其他甜味食品。", instructionJa: "甘い食べ物を撮影してください。例：プリン、チョコレート、ケーキ", reward: 1 },
                { rarity: 'R', weight: 0.2, text: "温かい [ ? ] を買います。", req: "Food", grammar: "イ形容詞 + N を Vます", instruction: "拍摄一种热的或温热的食品、饮料。", instructionJa: "温かい食べ物か飲み物を撮影してください。例：スープ、コーヒー、弁当", reward: 1 },
                { rarity: 'R', weight: 0.2, text: "この [ ? ] を温めてください。", req: "Food", grammar: "N を Vてください", instruction: "拍摄一种可以请店员加热的食品。", instructionJa: "温めてもらえる食べ物を撮影してください。例：弁当、おにぎり", reward: 1 }
            ],
            park: [
                { rarity: 'R', weight: 0.25, text: "赤い [ ? ] を見ます。", req: "Nature", grammar: "イ形容詞 + N を Vます", instruction: "红色或偏红的自然物。", reward: 1 },
                { rarity: 'R', weight: 0.25, text: "大きい [ ? ] の下で休みます。", req: "Nature", grammar: "イ形容詞 + N の下で Vます", instruction: "比较大的树木、建筑物或公园设施。", reward: 1 },
                { rarity: 'N', weight: 0.2, text: "[ ? ] の近くを歩きます。", req: "Nature", grammar: "N の近くを Vます", instruction: "公园里可以作为参照物的自然物或设施。", reward: 1 }
            ],
            station: [
                { rarity: 'N', weight: 0.3, text: "[ ? ] に乗ります。", req: "Transit", grammar: "N に Vます", instruction: "可以乘坐的交通工具。", reward: 1 },
                { rarity: 'N', weight: 0.3, text: "[ ? ] を探します。", req: "Transit", grammar: "N を Vます", instruction: "车站里容易寻找的出口、站台、售票机或标识。", reward: 1 },
                { rarity: 'R', weight: 0.2, text: "[ ? ] で待ちます。", req: "Transit", grammar: "N で Vます", instruction: "车站里可以等待的地点或设施。", reward: 1 },
                { rarity: 'N', weight: 0.2, text: "[ ? ] から出ます。", req: "Transit", grammar: "N から Vます", instruction: "出口、检票口、站台等可以离开的地点。", reward: 1 }
            ],
            pharmacy: [
                { rarity: 'N', weight: 0.4, text: "薬局で [ ? ] を買います。", req: "Health", grammar: "場所で N を Vます", instruction: "药妆店里可以买到的健康相关物品。", reward: 1 },
                { rarity: 'N', weight: 0.3, text: "[ ? ] を探します。", req: "Health", grammar: "N を Vます", instruction: "药妆店里可以寻找的药品或卫生用品。", reward: 1 },
                { rarity: 'R', weight: 0.2, text: "[ ? ] の説明を読みます。", req: "Health", grammar: "N の N を Vます", instruction: "购买前需要阅读说明的药品或用品。", reward: 1 },
                { rarity: 'N', weight: 0.2, text: "[ ? ] がほしいです。", req: "Health", grammar: "N がほしいです", instruction: "身体不舒服或日常护理时想买的东西。", reward: 1 }
            ]
        },
        N3: {
            convenience: [
                { rarity: 'R', weight: 0.35, text: "昼ごはんに、[ ? ] を買いました。", req: "Food", grammar: "N に N を Vました", instruction: "拍摄一种适合作为午饭的便利店食品。", instructionJa: "昼ごはんにしたい食べ物を撮影してください。例：おにぎり、弁当、サンドイッチ", reward: 1 },
                { rarity: 'R', weight: 0.35, text: "[ ? ] を温めてもらえますか。", req: "Food", grammar: "Vてもらえますか", instruction: "拍摄一种可以请店员加热的食品。", instructionJa: "温めてもらえる食べ物を撮影してください。例：弁当、おにぎり", reward: 1 },
                { rarity: 'SR', weight: 0.015, text: "[ ? ] を買ってから、学校へ行きます。", req: "Food", grammar: "Vてから", instruction: "拍摄一种上学前会购买的食物或饮料。", instructionJa: "学校へ行く前に買いたいものを撮影してください。", reward: 1 },
                { rarity: 'R', weight: 0.3, text: "甘い [ ? ] を食べると、少し元気になります。", req: "Food", grammar: "Vると", instruction: "拍摄一种甜食、点心或能量补给食品。", instructionJa: "元気が出そうな甘い食べ物を撮影してください。例：チョコレート、プリン", reward: 1 },
                { rarity: 'R', weight: 0.25, text: "冷たい [ ? ] を飲みながら休みます。", req: "Food", grammar: "Vます形 + ながら", instruction: "拍摄一种休息时会喝的冷饮。", instructionJa: "休みながら飲みたい冷たい飲み物を撮影してください。", reward: 1 },
                { rarity: 'R', weight: 0.2, text: "[ ? ] は、買いすぎないようにしています。", req: "Food", grammar: "Vすぎないようにしています", instruction: "拍摄一种容易买多、需要控制数量的零食或饮料。", instructionJa: "買いすぎに気をつけたいものを撮影してください。例：お菓子、ジュース", reward: 1 },
                { rarity: 'R', weight: 0.2, text: "[ ? ] を買うかどうか迷っています。", req: "Food", grammar: "V辞書形 + かどうか", instruction: "拍摄一种正在犹豫要不要购买的食品或饮料。", instructionJa: "買うか迷っているものを撮影してください。", reward: 1 }
            ],
            park: [
                { rarity: 'R', weight: 0.28, text: "[ ? ] の近くで休むことにしました。", req: "Nature", grammar: "N の近くで", instruction: "公园里适合靠近休息的自然物或设施。", reward: 1 },
                { rarity: 'R', weight: 0.24, text: "赤い [ ? ] が咲いているので、少し立ち止まりました。", req: "Nature", grammar: "ので", instruction: "红色或鲜艳的花、叶子等。", reward: 1 },
                { rarity: 'SR', weight: 0.03, text: "[ ? ] を見つけたら、友だちに教えます。", req: "Nature", grammar: "Vたら", instruction: "公园里发现会想告诉朋友的东西。", reward: 1 },
                { rarity: 'R', weight: 0.24, text: "季節の [ ? ] を見つけます。", req: "Nature", grammar: "N の N を Vます", instruction: "能体现季节的花、叶子、树木或物品。", reward: 1 },
                { rarity: 'R', weight: 0.22, text: "[ ? ] が見えるように、少し近づきます。", req: "Nature", grammar: "Vるように", instruction: "需要靠近才能看清的自然物、设施或景观。", reward: 1 },
                { rarity: 'R', weight: 0.22, text: "緑の [ ? ] を見つけます。", req: "Nature", grammar: "イ形容詞 + N を Vます", instruction: "绿色或有绿意的东西。", reward: 1 },
                { rarity: 'R', weight: 0.18, text: "小さい [ ? ] を探しています。", req: "Nature", grammar: "イ形容詞 + N を Vています", instruction: "小而容易观察到的东西。", reward: 1 },
                { rarity: 'R', weight: 0.18, text: "静かな [ ? ] で少し休みます。", req: "Nature", grammar: "ナ形容詞 + N で Vます", instruction: "安静、适合停留或休息的地方。", reward: 1 },
                { rarity: 'R', weight: 0.16, text: "[ ? ] のそばを通って、学校へ戻ります。", req: "Nature", grammar: "N のそばを通って", instruction: "公园里或学校周边可以经过的参照物。", reward: 1 }
            ],
            station: [
                { rarity: 'R', weight: 0.35, text: "[ ? ] に乗る前に、時刻表を確認します。", req: "Transit", grammar: "Vる前に", instruction: "乘坐前需要关注的交通工具。", reward: 1 },
                { rarity: 'R', weight: 0.35, text: "[ ? ] をなくさないようにしてください。", req: "Transit", grammar: "Vないように", instruction: "车站里不能弄丢的重要交通物品。", reward: 1 },
                { rarity: 'SR', weight: 0.015, text: "[ ? ] が来るまで、ホームで待ちます。", req: "Transit", grammar: "Vるまで", instruction: "会到站、可以等待的交通工具。", reward: 1 },
                { rarity: 'SR', weight: 0.015, text: "[ ? ] を確認してから、改札を通ります。", req: "Transit", grammar: "Vてから", instruction: "进检票口前需要确认的票、卡、路线图或 안내板。", reward: 1 },
                { rarity: 'R', weight: 0.2, text: "[ ? ] を間違えないように注意します。", req: "Transit", grammar: "Vないように", instruction: "容易弄错的站台、出口、路线或方向。", reward: 1 }
            ],
            pharmacy: [
                { rarity: 'R', weight: 0.35, text: "風邪をひいたので、[ ? ] を買いました。", req: "Health", grammar: "ので", instruction: "感冒或身体不适时会买的东西。", reward: 1 },
                { rarity: 'SR', weight: 0.015, text: "[ ? ] が必要かどうか、店員に聞きます。", req: "Health", grammar: "かどうか", instruction: "不确定是否需要、可以询问店员的药品或用品。", reward: 1 },
                { rarity: 'SR', weight: 0.015, text: "[ ? ] を買う前に、成分を確認します。", req: "Health", grammar: "Vる前に", instruction: "购买前需要看成分或说明的药品、护肤品。", reward: 1 },
                { rarity: 'R', weight: 0.2, text: "[ ? ] を忘れないように持ち歩きます。", req: "Health", grammar: "Vないように", instruction: "经常随身携带的卫生或健康用品。", reward: 1 }
            ]
        },
        N1: {
            convenience: [
                { rarity: 'N', weight: 0.34, text: "時間がないときでも、[ ? ] なら手軽に食事を済ませられる。", req: "Food", grammar: "N なら / V可能形", instruction: "拍摄一种时间紧张时也能方便食用的食品。", instructionJa: "時間がないときでも手軽に食べられるものを撮影してください。", reward: 1 },
                { rarity: 'R', weight: 0.33, text: "災害に備えて、保存のきく [ ? ] を買っておく。", req: "Food", grammar: "Vておく", instruction: "拍摄一种适合长期保存的应急食品或饮料。", instructionJa: "長く保存できる食べ物か飲み物を撮影してください。", reward: 1 },
                { rarity: 'SR', weight: 0.015, text: "健康面を考えると、[ ? ] ばかりに頼るのは避けたい。", req: "Food", grammar: "N ばかりに頼る", instruction: "拍摄一种虽然方便，但不适合长期依赖的食品。", instructionJa: "便利でも、頼りすぎたくない食べ物を撮影してください。", reward: 1 },
                { rarity: 'SR', weight: 0.015, text: "糖分の多い [ ? ] は、摂りすぎないよう注意したい。", req: "Food", grammar: "Vすぎないよう注意する", instruction: "拍摄一种甜食、含糖饮料或其他高糖食品。", instructionJa: "糖分の多い食べ物か飲み物を撮影してください。", reward: 1 },
                { rarity: 'R', weight: 0.25, text: "忙しい学生にとって、[ ? ] は短時間で空腹を満たせる便利な選択肢だ。", req: "Food", grammar: "N にとって / V可能形", instruction: "拍摄一种可以在短时间内充饥的食品。", instructionJa: "短時間で空腹を満たせる食べ物を撮影してください。", reward: 1 },
                { rarity: 'N', weight: 0.25, text: "寒い日には、温かい [ ? ] がいつも以上においしく感じられる。", req: "Food", grammar: "自発の助動詞「られる」", instruction: "拍摄一种寒冷天气里会想吃或喝的热食、热饮。", instructionJa: "寒い日に食べたい温かいものを撮影してください。", reward: 1 },
                { rarity: 'N', weight: 0.2, text: "[ ? ] を選ぶ際は、価格だけでなく栄養バランスも考えたい。", req: "Food", grammar: "V辞書形 + 際 / N だけでなく", instruction: "拍摄一种购买时需要比较价格和营养的食品。", instructionJa: "価格と栄養の両方を考えて選びたい食べ物を撮影してください。", reward: 1 }
            ],
            park: [
                { rarity: 'SR', weight: 0.015, text: "[ ? ] を通して、季節の移り変わりを感じることができる。", req: "Nature", grammar: "N を通して", instruction: "能体现季节变化的自然物。", reward: 1 },
                { rarity: 'R', weight: 0.25, text: "老朽化した [ ? ] については、安全面から再整備が求められる。", req: "Nature", grammar: "N については", instruction: "公园里可能老化、需要维护的设施。", reward: 1 },
                { rarity: 'N', weight: 0.25, text: "季節感のある [ ? ] は、散策体験の質を高める要素にほかならない。", req: "Nature", grammar: "N にほかならない", instruction: "能体现季节感的自然物。", reward: 1 }
            ],
            station: [
                { rarity: 'N', weight: 0.34, text: "円滑に移動するためには、[ ? ] の確認が不可欠だ。", req: "Transit", grammar: "N が不可欠だ", instruction: "顺利移动前需要确认的交通信息或标识。", reward: 1 },
                { rarity: 'SR', weight: 0.015, text: "公共交通機関を利用するうえで、[ ? ] は重要な手がかりとなる。", req: "Transit", grammar: "Vるうえで", instruction: "使用公共交通时重要的线索、标识或物品。", reward: 1 },
                { rarity: 'SR', weight: 0.015, text: "非接触型の [ ? ] は、改札通過を円滑にする手段として普及している。", req: "Transit", grammar: "N として", instruction: "IC卡、手机支付、二维码等非接触交通工具。", reward: 1 },
                { rarity: 'N', weight: 0.25, text: "[ ? ] を確認せずに移動すると、乗り換えを誤りかねない。", req: "Transit", grammar: "Vずに / Vかねない", instruction: "不确认就容易走错的路线图、时刻表、案内板。", reward: 1 },
                { rarity: 'N', weight: 0.2, text: "安全な [ ? ] の確保は、駅利用者にとって重要な課題である。", req: "Transit", grammar: "N にとって", instruction: "安全相关的站台、出口、通路或设施。", reward: 1 }
            ],
            pharmacy: [
                { rarity: 'N', weight: 0.34, text: "症状に応じて、[ ? ] を適切に選択する必要がある。", req: "Health", grammar: "N に応じて", instruction: "需要根据症状选择的药品或健康用品。", reward: 1 },
                { rarity: 'SR', weight: 0.015, text: "自己判断のみに頼らず、[ ? ] の説明を確認すべきだ。", req: "Health", grammar: "N のみに頼らず", instruction: "购买前应该确认说明的药品或健康用品。", reward: 1 },
                { rarity: 'R', weight: 0.25, text: "刺激の強い [ ? ] については、使用前に注意事項を確認するべきだ。", req: "Health", grammar: "N については", instruction: "药品、护肤品、清洁用品等使用前需注意的物品。", reward: 1 },
                { rarity: 'N', weight: 0.25, text: "[ ? ] を常備しておけば、軽い症状にはすぐ対応できる。", req: "Health", grammar: "Vておけば", instruction: "适合常备的药品或急救用品。", reward: 1 },
                { rarity: 'N', weight: 0.2, text: "専門家の助言なしに [ ? ] を併用するのは避けるべきだ。", req: "Health", grammar: "N なしに", instruction: "不应随意混用的药品或保健用品。", reward: 1 }
            ]
        },
        npc_cat: [
            { rarity: 'SSR', weight: 1.0, text: "猫 に [ ? ] を あげる", req: "Food", grammar: "N に N をあげる", instruction: "食物或饮料都可以帮助流浪猫。", reward: 1 }
        ]
    };

    const RARITY_CONFIG = {
        N: { color: '#8a9496', label: '普通', scale: 1.0 },
        R: { color: '#52676c', label: '稀有', scale: 1.2 },
        SR: { color: '#f6c744', label: '超稀有', scale: 1.5 },
        SSR: { color: '#5f4b5a', label: '极光稀有', scale: 1.8 }
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
            html: `<div style="background-color: #54656b; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; opacity: 0.6;">✅</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    }

    function pickWeightedTemplate(templates) {
        const totalWeight = templates.reduce((sum, template) => sum + (template.weight || 1), 0);
        const rand = Math.random() * totalWeight;
        let selectedTemplate = templates[0];
        let cumulativeWeight = 0;

        for (const template of templates) {
            cumulativeWeight += template.weight || 1;
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
            instructionJa: template.instructionJa || '',
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

        if (spot.questData) {
            return { status: 'active', questData: spot.questData };
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

        if (quest.marker && !quest.keepMarkerUntilChapterComplete) {
            quest.marker.setIcon(createCompletedMarkerIcon());
            quest.marker.off('click');
        }
    }

    function clearQuestCacheAll() {
        const keysToRemove = [];
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index);
            if (key && (key.startsWith('semantic-map-') || key === 'uiLayerCollapsed')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        Object.keys(questCache).forEach(key => delete questCache[key]);
        SM.ui?.showToast(SM.i18n?.t?.('resetDone'), { type: 'success' });
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
        clearQuestCacheAll,
        buildCatQuestData
    };
})();

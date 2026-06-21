(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    const STORAGE_KEY = 'semantic-map-mission-state-v1';
    const DAILY_STORAGE_KEY = 'semantic-map-daily-missions-v1';
    const TUTORIAL_COMPLETE_KEY = 'semantic-map-tutorial-pen-complete-v1';

    const elements = {};
    let missionState = null;
    let dailyState = null;
    let activeTab = 'main';

    const COPY = {
        zh: {
            title: '修复计划',
            mission: 'Mission',
            main: '主线',
            daily: '每日',
            lockedTitle: '完成教学节点后解锁',
            lockedBody: '先完成第一个崩坏节点。之后修复计划会开始记录你的探索目标。',
            current: '进行中',
            complete: '可领取',
            claimed: '已领取',
            locked: '未解锁',
            claim: '领取',
            reward: '奖励',
            refresh: '明天重置',
            unlockedToast: '修复计划已解锁',
            claimedToast: '任务奖励已领取',
            mainTasks: [
                { title: '完成教学节点', body: '拍照同步现实线索，修复第一个崩坏节点。' },
                { title: '收集 3 张地点词卡', body: '完成现实地点任务，并把词卡收进背包。' },
                { title: '净化任意 1 个区域', body: '推进区域修复值，第一次完成区域净化。' },
                { title: '帮助 1 位 NPC', body: '把背包里的词卡交给需要帮助的路人。' },
                { title: '净化任意 3 个区域', body: '把修复行动扩展到更多地图区域。' }
            ],
            dailyTasks: {
                foodCards: { title: '补给调查', body: '收集 3 张 Food 词卡。' },
                natureCards: { title: '绿地观测', body: '完成 2 个 Nature 任务。' },
                anyCards: { title: '今日记录', body: '收集任意 3 张地点词卡。' }
            }
        },
        ja: {
            title: '修復計画',
            mission: 'Mission',
            main: 'メイン',
            daily: 'デイリー',
            lockedTitle: 'チュートリアル後に解放',
            lockedBody: '最初の崩壊ノードを修復すると、修復計画が探索目標を記録します。',
            current: '進行中',
            complete: '受取可',
            claimed: '受取済み',
            locked: '未解放',
            claim: '受け取る',
            reward: '報酬',
            refresh: '明日リセット',
            unlockedToast: '修復計画が解放されました',
            claimedToast: 'ミッション報酬を受け取りました',
            mainTasks: [
                { title: 'チュートリアルノードを修復', body: '写真で現実の手がかりを同期し、最初の崩壊ノードを修復します。' },
                { title: '場所語彙カードを3枚集める', body: '現地タスクを完了し、カードをバッグへ保存します。' },
                { title: '任意のエリアを1つ浄化', body: '修復値を進め、初めてのエリア浄化を達成します。' },
                { title: 'NPCを1人助ける', body: 'バッグの語彙カードを、困っている人に渡します。' },
                { title: '任意のエリアを3つ浄化', body: '修復行動をさらに広い地図へ広げます。' }
            ],
            dailyTasks: {
                foodCards: { title: '補給調査', body: 'Foodカードを3枚集めます。' },
                natureCards: { title: '緑地観測', body: 'Natureタスクを2つ完了します。' },
                anyCards: { title: '今日の記録', body: '場所語彙カードを3枚集めます。' }
            }
        }
    };

    const MAIN_MISSIONS = [
        { id: 'tutorial', metric: 'tutorialCompleted', target: 1, reward: { xp: 10, coins: 5 } },
        { id: 'collect3', metric: 'cardsCollected', target: 3, reward: { xp: 30, coins: 15 } },
        { id: 'purify1', metric: 'areasPurified', target: 1, reward: { xp: 50, coins: 25 } },
        { id: 'npc1', metric: 'npcHelps', target: 1, reward: { xp: 30, coins: 20 } },
        { id: 'purify3', metric: 'areasPurified', target: 3, reward: { xp: 80, coins: 40 } }
    ];

    const DAILY_MISSIONS = [
        { id: 'foodCards', metric: 'foodCards', target: 3, reward: { xp: 20, coins: 10 } },
        { id: 'natureCards', metric: 'natureCards', target: 2, reward: { xp: 20, coins: 10 } },
        { id: 'anyCards', metric: 'cardsCollected', target: 3, reward: { xp: 15, coins: 10 } }
    ];

    function getLang() {
        return SM.i18n?.getLang?.() || state.currentLang || 'zh';
    }

    function copy() {
        return COPY[getLang()] || COPY.zh;
    }

    function getTodayKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function createDefaultMissionState() {
        return {
            unlocked: hasCompletedTutorial(),
            currentMainIndex: 0,
            claimedMainIds: [],
            metrics: {
                tutorialCompleted: hasCompletedTutorial() ? 1 : 0,
                cardsCollected: 0,
                areasPurified: 0,
                npcHelps: 0
            }
        };
    }

    function createDefaultDailyState() {
        return {
            date: getTodayKey(),
            claimedDailyIds: [],
            metrics: {
                cardsCollected: 0,
                foodCards: 0,
                natureCards: 0,
                npcHelps: 0
            }
        };
    }

    function hasCompletedTutorial() {
        try {
            return localStorage.getItem(TUTORIAL_COMPLETE_KEY) === '1';
        } catch (error) {
            return false;
        }
    }

    function loadState() {
        try {
            missionState = { ...createDefaultMissionState(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) };
            missionState.metrics = { ...createDefaultMissionState().metrics, ...(missionState.metrics || {}) };
            missionState.claimedMainIds = Array.isArray(missionState.claimedMainIds) ? missionState.claimedMainIds : [];
        } catch (error) {
            missionState = createDefaultMissionState();
        }

        try {
            dailyState = JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY) || '{}');
        } catch (error) {
            dailyState = null;
        }
        if (!dailyState || dailyState.date !== getTodayKey()) {
            dailyState = createDefaultDailyState();
        }
        dailyState.metrics = { ...createDefaultDailyState().metrics, ...(dailyState.metrics || {}) };
        dailyState.claimedDailyIds = Array.isArray(dailyState.claimedDailyIds) ? dailyState.claimedDailyIds : [];

        if (hasCompletedTutorial()) {
            missionState.unlocked = true;
            missionState.metrics.tutorialCompleted = 1;
        }
        advanceMainIndex();
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(missionState));
            localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(dailyState));
        } catch (error) {
            console.warn('Failed to save mission state.', error);
        }
    }

    function clampProgress(value, target) {
        return Math.max(0, Math.min(Number(value || 0), target));
    }

    function getMainProgress(mission) {
        return clampProgress(missionState.metrics[mission.metric], mission.target);
    }

    function getDailyProgress(mission) {
        return clampProgress(dailyState.metrics[mission.metric], mission.target);
    }

    function isMainComplete(mission) {
        return getMainProgress(mission) >= mission.target;
    }

    function isDailyComplete(mission) {
        return getDailyProgress(mission) >= mission.target;
    }

    function advanceMainIndex() {
        let nextIndex = Number(missionState.currentMainIndex || 0);
        while (nextIndex < MAIN_MISSIONS.length - 1) {
            const mission = MAIN_MISSIONS[nextIndex];
            if (!missionState.claimedMainIds.includes(mission.id)) break;
            nextIndex += 1;
        }
        missionState.currentMainIndex = nextIndex;
    }

    function init() {
        Object.assign(elements, {
            button: document.getElementById('mission-btn'),
            buttonProgress: document.getElementById('mission-btn-progress'),
            layer: document.getElementById('mission-layer'),
            closeButton: document.getElementById('mission-close-btn'),
            title: document.getElementById('mission-title'),
            kicker: document.querySelector('.mission-kicker'),
            list: document.getElementById('mission-list'),
            tabs: [...document.querySelectorAll('.mission-tab')]
        });

        loadState();
        bindEvents();
        render();
    }

    function bindEvents() {
        elements.button?.addEventListener('click', () => setOpen(true));
        elements.closeButton?.addEventListener('click', () => setOpen(false));
        elements.layer?.addEventListener('click', event => {
            if (event.target === elements.layer) setOpen(false);
        });
        elements.tabs?.forEach(tab => {
            tab.addEventListener('click', () => {
                activeTab = tab.dataset.missionTab || 'main';
                render();
            });
        });
    }

    function setOpen(open) {
        elements.layer?.classList.toggle('hidden', !open);
        document.body.classList.toggle('mission-open', open);
        if (open) render();
    }

    function render() {
        if (!elements.button || !missionState || !dailyState) return;
        const c = copy();
        elements.title.textContent = c.title;
        elements.kicker.textContent = c.mission;
        elements.tabs?.forEach(tab => {
            const tabName = tab.dataset.missionTab || 'main';
            tab.textContent = tabName === 'daily' ? c.daily : c.main;
            tab.classList.toggle('active', activeTab === tabName);
        });

        renderButton();
        if (activeTab === 'daily') {
            renderDaily();
        } else {
            renderMain();
        }
    }

    function renderButton() {
        const c = copy();
        const current = MAIN_MISSIONS[missionState.currentMainIndex] || MAIN_MISSIONS[0];
        const progress = current ? getMainProgress(current) : 0;
        const target = current?.target || 1;
        elements.button.querySelector('.mission-btn-title').textContent = c.title;
        elements.buttonProgress.textContent = missionState.unlocked ? `${progress}/${target}` : 'LOCK';
        elements.button.classList.toggle('mission-ready', current && isMainComplete(current) && !missionState.claimedMainIds.includes(current.id));
    }

    function renderMain() {
        const c = copy();
        if (!missionState.unlocked) {
            elements.list.innerHTML = `
                <div class="mission-empty-state">
                    <div class="mission-empty-title">${escapeHtml(c.lockedTitle)}</div>
                    <p>${escapeHtml(c.lockedBody)}</p>
                </div>
            `;
            return;
        }

        elements.list.innerHTML = MAIN_MISSIONS.map((mission, index) => {
            const taskCopy = c.mainTasks[index];
            const isClaimed = missionState.claimedMainIds.includes(mission.id);
            const isUnlocked = index <= missionState.currentMainIndex;
            const progress = getMainProgress(mission);
            const complete = isMainComplete(mission);
            const status = isClaimed ? 'claimed' : !isUnlocked ? 'locked' : complete ? 'complete' : 'current';
            return renderMissionCard({ mission, taskCopy, progress, status, type: 'main' });
        }).join('');

        bindClaimButtons();
    }

    function renderDaily() {
        const c = copy();
        elements.list.innerHTML = `
            <div class="mission-daily-note">${escapeHtml(c.refresh)}</div>
            ${DAILY_MISSIONS.map(mission => {
                const taskCopy = c.dailyTasks[mission.id];
                const progress = getDailyProgress(mission);
                const isClaimed = dailyState.claimedDailyIds.includes(mission.id);
                const status = isClaimed ? 'claimed' : isDailyComplete(mission) ? 'complete' : 'current';
                return renderMissionCard({ mission, taskCopy, progress, status, type: 'daily' });
            }).join('')}
        `;
        bindClaimButtons();
    }

    function renderMissionCard({ mission, taskCopy, progress, status, type }) {
        const c = copy();
        const percent = Math.round((progress / mission.target) * 100);
        const statusText = c[status] || '';
        const rewardText = `${c.reward} EXP +${mission.reward.xp} / ${mission.reward.coins}`;
        const canClaim = status === 'complete';
        return `
            <article class="mission-card ${status}">
                <div class="mission-card-top">
                    <span class="mission-status">${escapeHtml(statusText)}</span>
                    <span class="mission-progress-text">${progress}/${mission.target}</span>
                </div>
                <h3>${escapeHtml(taskCopy?.title || '')}</h3>
                <p>${escapeHtml(taskCopy?.body || '')}</p>
                <div class="mission-progress-bar" aria-hidden="true"><span style="width:${percent}%"></span></div>
                <div class="mission-card-bottom">
                    <span>${escapeHtml(rewardText)}</span>
                    ${canClaim ? `<button type="button" class="mission-claim-btn" data-claim-type="${type}" data-claim-id="${mission.id}">${escapeHtml(c.claim)}</button>` : ''}
                </div>
            </article>
        `;
    }

    function bindClaimButtons() {
        elements.list?.querySelectorAll('.mission-claim-btn').forEach(button => {
            button.addEventListener('click', () => claimMission(button.dataset.claimType, button.dataset.claimId));
        });
    }

    function claimMission(type, id) {
        const c = copy();
        const mission = type === 'daily'
            ? DAILY_MISSIONS.find(item => item.id === id)
            : MAIN_MISSIONS.find(item => item.id === id);
        if (!mission) return;

        if (type === 'daily') {
            if (dailyState.claimedDailyIds.includes(id) || !isDailyComplete(mission)) return;
            dailyState.claimedDailyIds.push(id);
        } else {
            if (missionState.claimedMainIds.includes(id) || !isMainComplete(mission)) return;
            missionState.claimedMainIds.push(id);
            advanceMainIndex();
        }

        saveState();
        SM.map?.grantExplorerReward?.(mission.reward);
        SM.ui?.showGuideMessage?.(c.claimedToast, { type: 'success', duration: 2400 });
        render();
    }

    function ensureUnlocked() {
        if (missionState.unlocked) return;
        missionState.unlocked = true;
        SM.ui?.showGuideMessage?.(copy().unlockedToast, { type: 'success', duration: 2800 });
    }

    function incrementMetric(target, metric, amount = 1) {
        target.metrics[metric] = Number(target.metrics[metric] || 0) + amount;
    }

    function recordTutorialComplete() {
        ensureReady();
        ensureUnlocked();
        missionState.metrics.tutorialCompleted = 1;
        saveState();
        render();
    }

    function recordCardCollected(card = {}) {
        ensureReady();
        if (!missionState.unlocked && !hasCompletedTutorial()) return;
        ensureUnlocked();
        incrementMetric(missionState, 'cardsCollected');
        incrementMetric(dailyState, 'cardsCollected');

        const tag = card?.tag || card?.quest?.requiredTag || '';
        if (tag === 'Food') incrementMetric(dailyState, 'foodCards');
        if (tag === 'Nature') incrementMetric(dailyState, 'natureCards');

        saveState();
        render();
    }

    function recordAreaPurified() {
        ensureReady();
        ensureUnlocked();
        incrementMetric(missionState, 'areasPurified');
        saveState();
        render();
    }

    function recordNpcHelp() {
        ensureReady();
        ensureUnlocked();
        incrementMetric(missionState, 'npcHelps');
        incrementMetric(dailyState, 'npcHelps');
        saveState();
        render();
    }

    function ensureReady() {
        if (!missionState || !dailyState) loadState();
    }

    function refreshLanguage() {
        render();
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

    SM.missions = {
        init,
        refreshLanguage,
        recordTutorialComplete,
        recordCardCollected,
        recordAreaPurified,
        recordNpcHelp
    };
})();

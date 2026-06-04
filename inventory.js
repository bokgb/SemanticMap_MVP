(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    let playerInventory = [];
    let collectedWordsCount = 0;
    let pendingWord = null;
    let activeNpcEvent = null;
    const rewardQueue = [];
    const NPC_EVENT_CHANCE = 0.28;
    const DEV_NPC_EVENT_CHANCE = 1;
    const NPC_EVENT_SEEN_KEY_PREFIX = 'semantic_map_npc_event_seen_';
    const NPC_SCENARIOS = {
        convenience: {
            line: 'のどがかわいたな……',
            success: 'ありがとう、ちょうど飲みたかった！',
            fail: 'うーん、今はちょっと違うかも……',
            matcher: isDrinkCard
        },
        station: {
            line: 'あれ、出口はどこだろう……',
            success: '助かった！これで迷わず行けそう。',
            fail: 'うーん、これでは道がわからないな……',
            matcher: data => data?.tag === 'Transit'
        },
        pharmacy: {
            line: 'のどが痛い……',
            success: 'ありがとう。少し楽になりそう。',
            fail: 'うーん、今ほしいものとは違うかも……',
            matcher: data => data?.tag === 'Health'
        },
        park: {
            line: '少し休みたいな……',
            success: 'ありがとう。ここで休めそう。',
            fail: 'うーん、まだ休めそうにないな……',
            matcher: data => data?.tag === 'Nature'
        }
    };

    const elements = {};
    const TAG_COLORS = {
        Food: '#6f6a60',
        Nature: '#4f776f',
        Transit: '#5c6f7a',
        Health: '#6d6f7a',
        Retail: '#687174',
        Item: '#687174'
    };

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function sanitizeColor(value, fallback = '#687174') {
        const color = String(value ?? '').trim();
        return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color) ? color : fallback;
    }

    function getTagColor(tag) {
        return TAG_COLORS[String(tag || '').trim()] || TAG_COLORS.Item;
    }

    function tr(key, params = {}) {
        return SM.i18n?.t?.(key, params) || key;
    }

    function getLang() {
        return SM.i18n?.getLang?.() || state.currentLang || 'zh';
    }

    function translatePos(pos) {
        const normalized = String(pos || '').trim();
        if (!normalized || normalized === '名词' || normalized === '名詞' || normalized.toLowerCase() === 'noun') {
            return tr('noun');
        }
        return normalized;
    }

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
            tagColor: getTagColor(result.tag || 'Item'),
            example: result.example || { s: '', k: '', z: '' },
            extra_words: Array.isArray(result.extra_words) ? result.extra_words : []
        };
    }

    function isDrinkCard(data) {
        if (!data || data.tag !== 'Food') return false;

        const text = `${data.word?.text || ''} ${data.word?.kana || ''} ${data.word?.zh || ''} ${data.example?.s || ''}`.toLowerCase();
        const drinkWords = [
            '水', 'みず', 'water',
            '茶', 'お茶', 'ちゃ', 'tea',
            'コーヒー', 'coffee', '咖啡',
            'ジュース', 'juice',
            '牛乳', 'ミルク', 'milk', '奶',
            '飲み物', '飲物', '飲料', 'ドリンク', 'drink',
            'ソーダ', '炭酸', 'sports drink', 'スポーツドリンク'
        ];

        return drinkWords.some(word => text.includes(word.toLowerCase()));
    }

    function renderRubyWord(wordObj) {
        if (!wordObj || !wordObj.text) return "???";
        const lang = getLang();
        const text = escapeHtml(wordObj.text);
        const kana = escapeHtml(wordObj.kana);
        const zh = escapeHtml(wordObj.zh);
        const meaning = lang === 'zh' && zh
            ? ` <span style="font-size:12px; color:var(--subtle);">(${zh})</span>`
            : '';

        if (!wordObj.kana || wordObj.text === wordObj.kana) {
            return `<span>${text}</span>${meaning}`;
        }
        return `<ruby>${text}<rt>${kana}</rt></ruby>${meaning}`;
    }

    function getQuestReview(data) {
        if (!data?.quest) return [];
        const review = getLang() === 'ja'
            ? data.quest.reviewJa || data.quest.review
            : data.quest.review;
        return Array.isArray(review) ? review : [];
    }

    function renderWordBlock(data) {
        const block = document.createElement('div');
        block.className = 'word-block';
        const tagColor = getTagColor(data.tag);
        const questReview = getQuestReview(data);

        block.style.borderLeftColor = tagColor;
        block.innerHTML = `
            <div class="word-title">${renderRubyWord(data.word)}</div>
            <div class="word-pos">[ ${escapeHtml(translatePos(data.pos))} ]</div>
            <div class="word-tag" style="background-color: ${tagColor}">${escapeHtml(data.tag)}</div>
            ${data.quest ? `
                <div class="word-quest-meta">${escapeHtml(data.quest.location)} / ${escapeHtml(data.quest.level || '')}</div>
                <div class="word-sentence">${escapeHtml(data.quest.sentence || '')}</div>
                ${questReview.length ? `
                    <div class="grammar-review">
                        <div class="grammar-review-title">${escapeHtml(tr('grammarReviewTitle'))}</div>
                        ${questReview.map(item => `<div class="grammar-review-item">${escapeHtml(item)}</div>`).join('')}
                    </div>
                ` : ''}
            ` : ''}
        `;
        return block;
    }

    function renderInventoryList() {
        if (!elements.wordList) return;
        elements.wordList.innerHTML = '';
        if (!playerInventory.length) {
            elements.wordList.innerHTML = `<div class="inventory-empty">${escapeHtml(tr('inventoryEmpty'))}</div>`;
            return;
        }
        [...playerInventory].reverse().forEach(data => {
            elements.wordList.appendChild(renderWordBlock(data));
        });
    }

    function addWordToInventory(data) {
        if (!data) return;

        playerInventory.push(data);
        elements.wordList.prepend(renderWordBlock(data));

        collectedWordsCount++;
        if (!elements.inventoryLayer.classList.contains('open')) {
            elements.bagBadge.style.display = 'block';
            elements.bagBadge.innerText = collectedWordsCount;
        }

        maybeTriggerNpcEvent(data);
    }

    function showNextQueuedReward() {
        const nextReward = rewardQueue.shift();
        if (nextReward) {
            showWordDetailCard(nextReward);
        }
    }

    function showWordDetailCard(aiData) {
        if (!aiData) return;

        if (elements.wordCardLayer && !elements.wordCardLayer.classList.contains('hidden')) {
            rewardQueue.push(aiData);
            return;
        }

        pendingWord = aiData;
        elements.lootWordMain.innerHTML = renderRubyWord(aiData.word);

        if (aiData.example) {
            elements.lootExampleText.innerText = aiData.quest?.sentence || aiData.example.s || '';
            if (aiData.quest) {
                elements.lootExampleZh.innerText = [
                    aiData.quest.location,
                    ...getQuestReview(aiData)
                ].filter(Boolean).join('\n');
            } else {
                elements.lootExampleZh.innerText = getLang() === 'zh' ? aiData.example.z || '' : '';
            }
        } else {
            elements.lootExampleText.innerText = tr('noExample');
            elements.lootExampleZh.innerText = "";
        }

        elements.wordCardLayer.classList.remove('hidden');
    }

    function refreshLanguage() {
        if (pendingWord && elements.lootWordMain) {
            elements.lootWordMain.innerHTML = renderRubyWord(pendingWord.word);
            if (pendingWord.example) {
                elements.lootExampleText.innerText = pendingWord.quest?.sentence || pendingWord.example.s || '';
                elements.lootExampleZh.innerText = pendingWord.quest
                    ? [
                        pendingWord.quest.location,
                        ...getQuestReview(pendingWord)
                    ].filter(Boolean).join('\n')
                    : getLang() === 'zh' ? pendingWord.example.z || '' : '';
            }
        }
        renderInventoryList();
        renderNpcEvent();
    }

    function getNpcScenarioForCard(data) {
        const spotType = data?.quest?.spotType;
        return NPC_SCENARIOS[spotType] || null;
    }

    function getNpcSeenKey(spotType) {
        return `${NPC_EVENT_SEEN_KEY_PREFIX}${spotType || 'unknown'}`;
    }

    function hasSeenNpcEvent(spotType) {
        if (!spotType) return true;
        return state.npcEventSeenBySpot?.[spotType] || window.localStorage?.getItem(getNpcSeenKey(spotType)) === '1';
    }

    function markNpcEventSeen(spotType) {
        if (!spotType) return;
        state.npcEventSeenBySpot = state.npcEventSeenBySpot || {};
        state.npcEventSeenBySpot[spotType] = true;
        try {
            window.localStorage?.setItem(getNpcSeenKey(spotType), '1');
        } catch (error) {
            // The in-memory flag above still prevents repeat triggers this session.
        }
    }

    function maybeTriggerNpcEvent(newCard) {
        if (!newCard?.quest || activeNpcEvent) return;

        const spotType = newCard.quest.spotType;
        if (hasSeenNpcEvent(spotType)) return;
        const scenario = getNpcScenarioForCard(newCard);
        if (!scenario) return;
        if (!playerInventory.some(card => scenario.matcher(card))) return;

        const chance = state.devMode ? DEV_NPC_EVENT_CHANCE : NPC_EVENT_CHANCE;
        if (Math.random() > chance) return;

        markNpcEventSeen(spotType);
        activeNpcEvent = {
            scenario,
            sourceCard: newCard,
            selectedWrong: false,
            completed: false
        };

        window.setTimeout(() => {
            showNpcEvent();
        }, 420);
    }

    function getNpcLayer() {
        let layer = document.getElementById('npc-event-layer');
        if (layer) return layer;

        layer = document.createElement('div');
        layer.id = 'npc-event-layer';
        layer.className = 'hidden';
        layer.innerHTML = `
            <div class="npc-event-panel" role="dialog" aria-modal="true">
                <div class="npc-event-header">
                    <div>
                        <div class="npc-event-kicker"></div>
                        <div class="npc-event-title"></div>
                    </div>
                    <button type="button" class="npc-event-close">✕</button>
                </div>
                <div class="npc-dialogue"></div>
                <div class="npc-help"></div>
                <div class="npc-card-list"></div>
                <div class="npc-result hidden"></div>
            </div>
        `;
        document.body.appendChild(layer);
        layer.querySelector('.npc-event-close')?.addEventListener('click', closeNpcEvent);
        return layer;
    }

    function showNpcEvent() {
        if (!activeNpcEvent) return;

        const layer = getNpcLayer();
        layer.classList.remove('hidden');
        renderNpcEvent();
    }

    function closeNpcEvent() {
        const layer = document.getElementById('npc-event-layer');
        layer?.classList.add('hidden');
        activeNpcEvent = null;
    }

    function renderNpcEvent() {
        if (!activeNpcEvent) return;

        const layer = getNpcLayer();
        if (layer.classList.contains('hidden')) return;

        const scenario = activeNpcEvent.scenario;
        const cards = [...playerInventory].reverse().slice(0, 8);
        const resultText = activeNpcEvent.completed
            ? scenario.success
            : activeNpcEvent.selectedWrong
                ? scenario.fail
                : '';

        const titleEl = layer.querySelector('.npc-event-title');
        const kickerEl = layer.querySelector('.npc-event-kicker');
        const dialogueEl = layer.querySelector('.npc-dialogue');
        const helpEl = layer.querySelector('.npc-help');
        const cardListEl = layer.querySelector('.npc-card-list');
        const resultEl = layer.querySelector('.npc-result');
        const closeBtn = layer.querySelector('.npc-event-close');

        if (titleEl) titleEl.innerText = tr('npcTitle');
        if (kickerEl) kickerEl.innerText = 'NPC';
        if (dialogueEl) dialogueEl.innerText = scenario.line;
        if (helpEl) helpEl.innerText = tr('npcHelp');
        if (closeBtn) closeBtn.innerText = activeNpcEvent.completed ? tr('npcDone') : tr('npcSkip');

        if (resultEl) {
            resultEl.classList.toggle('hidden', !resultText);
            resultEl.innerText = resultText;
        }

        if (!cardListEl) return;
        cardListEl.innerHTML = '';
        if (activeNpcEvent.completed) {
            cardListEl.classList.add('hidden');
            return;
        }
        cardListEl.classList.remove('hidden');

        cards.forEach(card => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'npc-card-btn';
            button.innerHTML = `
                <span class="npc-card-word">${renderRubyWord(card.word)}</span>
                <span class="npc-card-tag" style="background:${getTagColor(card.tag)}">${escapeHtml(card.tag || 'Item')}</span>
            `;
            button.addEventListener('click', () => chooseNpcCard(card));
            cardListEl.appendChild(button);
        });
    }

    function chooseNpcCard(card) {
        if (!activeNpcEvent) return;

        if (activeNpcEvent.scenario.matcher(card)) {
            activeNpcEvent.completed = true;
            activeNpcEvent.selectedWrong = false;
            SM.map?.grantExplorerReward?.({ type: 'npc' });
            SM.ui?.showGuideMessage?.(tr('npcReward'), { type: 'success', duration: 2800 });
        } else {
            activeNpcEvent.selectedWrong = true;
        }

        renderNpcEvent();
    }

    function init() {
        Object.assign(elements, {
            bagBtn: document.getElementById('bag-btn'),
            closeBagBtn: document.getElementById('close-bag-btn'),
            inventoryLayer: document.getElementById('inventory-layer'),
            bagBadge: document.getElementById('bag-badge'),
            wordList: document.getElementById('word-list'),
            wordCardLayer: document.getElementById('word-card-layer'),
            lootWordMain: document.getElementById('loot-word-main'),
            lootExampleText: document.getElementById('loot-example-text'),
            lootExampleZh: document.getElementById('loot-example-zh'),
            btnCollectWord: document.getElementById('btn-collect-word')
        });

        elements.bagBtn.addEventListener('click', event => {
            event.stopPropagation();
            elements.inventoryLayer.classList.toggle('open');
            elements.bagBadge.style.display = 'none';
        });

        elements.inventoryLayer.addEventListener('click', event => {
            event.stopPropagation();
        });

        elements.closeBagBtn.addEventListener('click', () => {
            elements.inventoryLayer.classList.remove('open');
        });

        document.addEventListener('click', () => {
            elements.inventoryLayer.classList.remove('open');
        });

        elements.btnCollectWord.addEventListener('click', () => {
            elements.wordCardLayer.classList.add('hidden');
            if (pendingWord) {
                addWordToInventory(pendingWord);
                pendingWord = null;
            }
            showNextQueuedReward();
        });

        // Dev mode keeps map/testing helpers, but vocabulary cards should be earned through quests.
    }

    SM.inventory = {
        init,
        normalizeAiResult,
        sanitizeColor,
        escapeHtml,
        renderRubyWord,
        addWordToInventory,
        showWordDetailCard,
        refreshLanguage
    };
})();

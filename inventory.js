(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    let playerInventory = [];
    let collectedWordsCount = 0;
    let pendingWord = null;
    const rewardQueue = [];

    const elements = {};

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

    function renderRubyWord(wordObj) {
        if (!wordObj || !wordObj.text) return "???";
        const text = escapeHtml(wordObj.text);
        const kana = escapeHtml(wordObj.kana);
        const zh = escapeHtml(wordObj.zh);

        if (!wordObj.kana || wordObj.text === wordObj.kana) {
            return `<span>${text}</span> <span style="font-size:12px; color:#888;">(${zh})</span>`;
        }
        return `<ruby>${text}<rt>${kana}</rt></ruby> <span style="font-size:12px; color:#888;">(${zh})</span>`;
    }

    function addWordToInventory(data) {
        if (!data) return;

        playerInventory.push(data);
        const block = document.createElement('div');
        block.className = 'word-block';
        const tagColor = sanitizeColor(data.tagColor);
        block.style.borderLeftColor = tagColor;
        block.innerHTML = `
            <div class="word-title">${renderRubyWord(data.word)}</div>
            <div class="word-pos">[ ${escapeHtml(data.pos)} ]</div>
            <div class="word-tag" style="background-color: ${tagColor}">${escapeHtml(data.tag)}</div>
            ${data.quest ? `
                <div class="word-quest-meta">${escapeHtml(data.quest.location)} / ${escapeHtml(data.quest.level || '')}</div>
                <div class="word-sentence">${escapeHtml(data.quest.sentence || '')}</div>
                ${Array.isArray(data.quest.review) && data.quest.review.length ? `
                    <div class="grammar-review">
                        <div class="grammar-review-title">语法复盘</div>
                        ${data.quest.review.map(item => `<div class="grammar-review-item">${escapeHtml(item)}</div>`).join('')}
                    </div>
                ` : ''}
            ` : ''}
        `;
        elements.wordList.prepend(block);

        collectedWordsCount++;
        if (!elements.inventoryLayer.classList.contains('open')) {
            elements.bagBadge.style.display = 'block';
            elements.bagBadge.innerText = collectedWordsCount;
        }
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
            elements.lootExampleZh.innerText = aiData.quest
                ? [
                    aiData.quest.location,
                    ...(Array.isArray(aiData.quest.review) ? aiData.quest.review : [])
                ].filter(Boolean).join('\n')
                : aiData.example.z || '';
        } else {
            elements.lootExampleText.innerText = "没有找到合适的例句。";
            elements.lootExampleZh.innerText = "";
        }

        elements.wordCardLayer.classList.remove('hidden');
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

    function openComboPanel() {
        elements.comboLayer.classList.remove('hidden');
        renderComboWords();
    }

    function renderComboWords() {
        const list = elements.comboWordList;
        if (!list || !elements.slotAdj || !elements.slotNoun || !elements.slotVerb) return;

        list.innerHTML = '';
        playerInventory.forEach((wordData) => {
            if (!wordData || !wordData.word || !wordData.word.text) return;

            const btn = document.createElement('div');
            btn.className = 'combo-word-item';
            btn.style.borderColor = wordData.tagColor;
            btn.innerText = `${wordData.word.text} [${wordData.pos}]`;
            btn.addEventListener('click', () => {
                if (wordData.pos === '形容词' && !state.currentAdj) {
                    state.currentAdj = wordData;
                    elements.slotAdj.innerText = wordData.word.text;
                    elements.slotAdj.classList.add('filled');
                    btn.classList.add('used');
                } else if (wordData.pos === '名词' && !state.currentNoun) {
                    state.currentNoun = wordData;
                    elements.slotNoun.innerText = wordData.word.text;
                    elements.slotNoun.classList.add('filled');
                    btn.classList.add('used');
                } else if (wordData.pos === '动词' && !state.currentVerb) {
                    state.currentVerb = wordData;
                    elements.slotVerb.innerText = wordData.word.text;
                    elements.slotVerb.classList.add('filled');
                    btn.classList.add('used');
                }
                checkComboReady();
            });
            list.appendChild(btn);
        });
    }

    function checkComboReady() {
        if (elements.btnSubmitCombo) {
            elements.btnSubmitCombo.disabled = !(state.currentAdj && state.currentNoun && state.currentVerb);
        }
    }

    function resetSlots() {
        state.currentAdj = null;
        state.currentNoun = null;
        state.currentVerb = null;

        elements.slotAdj.innerText = '形容词';
        elements.slotAdj.classList.remove('filled');
        elements.slotNoun.innerText = '点击下方名词填入';
        elements.slotNoun.classList.remove('filled');
        elements.slotVerb.innerText = '点击下方动词填入';
        elements.slotVerb.classList.remove('filled');
        elements.btnSubmitCombo.disabled = true;
    }

    function submitCombo() {
        const { currentAdj, currentNoun, currentVerb, currentComboTag, currentComboSpot } = state;
        if (!currentAdj || !currentNoun || !currentVerb) return;

        if (currentAdj.tag === currentComboTag || currentNoun.tag === currentComboTag || currentVerb.tag === currentComboTag) {
            SM.ui?.showToast(`Combo 成功！\n${currentAdj.word.text} ${currentNoun.word.text} を ${currentVerb.word.text}`, { type: 'success' });
            elements.comboLayer.classList.add('hidden');
            resetSlots();

            if (currentComboSpot && SM.map) {
                SM.map.removeSpotFromPool(currentComboSpot);
            }

            if (currentComboSpot && SM.quests) {
                SM.quests.completeSpot(currentComboSpot);
            }

            if (currentComboSpot && SM.map) {
                SM.map.removeMarkerForSpot(currentComboSpot);
            }

            state.currentComboSpot = null;
            state.currentComboTag = null;
        } else {
            SM.ui?.showToast(`语境不匹配：该区域需要 ${currentComboTag} 相关词汇。`, { type: 'warning' });
            elements.comboLayer.classList.add('hidden');
            resetSlots();
        }
    }

    function initTestData() {
        const testWords = [
            { word: { text: "電車", kana: "でんしゃ", zh: "电车" }, pos: "名词", tag: "Transit", tagColor: "#9E9E9E" },
            { word: { text: "乗る", kana: "のる", zh: "骑/乘" }, pos: "动词", tag: "Transit", tagColor: "#9E9E9E" },
            { word: { text: "赤い", kana: "あかい", zh: "红色的" }, pos: "形容词", tag: "Nature", tagColor: "#4CAF50" },
            { word: { text: "花", kana: "はな", zh: "花" }, pos: "名词", tag: "Nature", tagColor: "#4CAF50" },
            { word: { text: "見つける", kana: "みつける", zh: "发现" }, pos: "动词", tag: "Nature", tagColor: "#4CAF50" }
        ];
        testWords.forEach(wordData => addWordToInventory(wordData));
    }

    function init() {
        Object.assign(elements, {
            bagBtn: document.getElementById('bag-btn'),
            closeBagBtn: document.getElementById('close-bag-btn'),
            inventoryLayer: document.getElementById('inventory-layer'),
            bagBadge: document.getElementById('bag-badge'),
            wordList: document.getElementById('word-list'),
            comboLayer: document.getElementById('combo-layer'),
            comboWordList: document.getElementById('combo-word-list'),
            slotAdj: document.getElementById('slot-adj'),
            slotNoun: document.getElementById('slot-noun'),
            slotVerb: document.getElementById('slot-verb'),
            btnSubmitCombo: document.getElementById('btn-submit-combo'),
            btnCloseCombo: document.getElementById('btn-close-combo'),
            wordCardLayer: document.getElementById('word-card-layer'),
            lootWordMain: document.getElementById('loot-word-main'),
            lootExampleText: document.getElementById('loot-example-text'),
            lootExampleZh: document.getElementById('loot-example-zh'),
            btnCollectWord: document.getElementById('btn-collect-word')
        });

        state.currentAdj = null;
        state.currentNoun = null;
        state.currentVerb = null;
        state.currentComboTag = null;
        state.currentComboSpot = null;

        elements.bagBtn.addEventListener('click', () => {
            elements.inventoryLayer.classList.add('open');
            elements.bagBadge.style.display = 'none';
        });

        elements.closeBagBtn.addEventListener('click', () => {
            elements.inventoryLayer.classList.remove('open');
        });

        elements.btnCloseCombo.addEventListener('click', () => {
            elements.comboLayer.classList.add('hidden');
            resetSlots();
            state.currentComboTag = null;
            state.currentComboSpot = null;
        });

        elements.btnSubmitCombo.addEventListener('click', submitCombo);

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
        queueExtraWordRewards,
        openComboPanel
    };
})();

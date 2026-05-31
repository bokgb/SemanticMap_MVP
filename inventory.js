(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    let playerInventory = [];
    let collectedWordsCount = 0;
    let pendingWord = null;
    const rewardQueue = [];

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

        elements.bagBtn.addEventListener('click', () => {
            elements.inventoryLayer.classList.add('open');
            elements.bagBadge.style.display = 'none';
        });

        elements.closeBagBtn.addEventListener('click', () => {
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

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
        showWordDetailCard
    };
})();

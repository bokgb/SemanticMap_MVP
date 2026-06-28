(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};

    let toastLayer = null;
    let guideLayer = null;
    let tutorialLayer = null;
    let guideMessageTimer = null;
    let guideSequence = null;
    const bagHudHideReasons = new Set();
    const TUTORIAL_STORAGE_PREFIX = 'semantic-map-tutorial-v1-';

    function getToastLayer() {
        if (toastLayer) return toastLayer;

        toastLayer = document.getElementById('toast-layer');
        if (!toastLayer) {
            toastLayer = document.createElement('div');
            toastLayer.id = 'toast-layer';
            toastLayer.setAttribute('aria-live', 'polite');
            toastLayer.setAttribute('aria-atomic', 'true');
            document.body.appendChild(toastLayer);
        }

        return toastLayer;
    }

    function getGuideLayer() {
        if (guideLayer) return guideLayer;

        guideLayer = document.getElementById('mimi-guide');
        if (!guideLayer) {
            guideLayer = document.createElement('div');
            guideLayer.id = 'mimi-guide';
            guideLayer.innerHTML = `
                <button class="mimi-avatar" type="button" aria-label="">
                    <img class="mimi-face" src="assets/lumi-avatar.png" alt="" aria-hidden="true">
                </button>
                <div class="mimi-speech" role="status" aria-live="polite">
                    <div class="mimi-name"></div>
                    <div class="mimi-text"></div>
                    <div class="mimi-choice-list" hidden></div>
                    <button class="mimi-next-btn" type="button"></button>
                </div>
            `;
            document.body.appendChild(guideLayer);
            refreshLanguage();

            guideLayer.querySelector('.mimi-avatar')?.addEventListener('click', () => {
                if (guideSequence) {
                    advanceGuideSequence();
                    return;
                }
                showGuideMessage(SM.i18n?.t?.('mimiIdle') || '', { type: 'info', duration: 3200 });
            });
            guideLayer.querySelector('.mimi-speech')?.addEventListener('click', () => {
                if (guideSequence) advanceGuideSequence();
            });
        }

        return guideLayer;
    }

    function refreshLanguage() {
        const layer = getGuideLayer();
        const name = SM.i18n?.t?.('mimiName') || 'Lumi';

        const avatar = layer.querySelector('.mimi-avatar');
        const nameEl = layer.querySelector('.mimi-name');
        const nextButton = layer.querySelector('.mimi-next-btn');

        avatar?.setAttribute('aria-label', name);
        if (nameEl) nameEl.textContent = name;
        if (nextButton) nextButton.textContent = SM.i18n?.t?.('dialogNextButton') || 'Next';

        layer.classList.remove('show', 'reveal');
        window.clearTimeout(guideMessageTimer);
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

    function renderGuideText(value) {
        return escapeHtml(value)
            .replace(/\[\[(.+?)\]\]/g, '<span class="mimi-highlight">$1</span>')
            .replace(/(\u30b3\u30f3\u30d3\u30cb|\u4fbf\u5229\u5e97)/g, '<span class="mimi-highlight">$1</span>');
    }
    function setGuideText(element, value) {
        if (element) element.innerHTML = renderGuideText(value || '');
    }
    function showGuideMessage(message, options = {}) {
        const layer = getGuideLayer();
        const textEl = layer.querySelector('.mimi-text');
        const nextButton = layer.querySelector('.mimi-next-btn');
        const type = options.type || 'info';
        const duration = Number.isFinite(options.duration) ? options.duration : 3200;

        guideSequence = null;
        setTutorialCurtain(false);
        clearGuideChoices(layer);
        layer.classList.remove('success', 'warning', 'error', 'info', 'show');
        layer.classList.remove('sequence', 'reveal', 'curtain');
        layer.classList.add(type);
        setGuideText(textEl, message);
        if (nextButton) {
            nextButton.hidden = true;
        }

        window.clearTimeout(guideMessageTimer);
        window.requestAnimationFrame(() => layer.classList.add('show'));
        guideMessageTimer = window.setTimeout(() => {
            layer.classList.remove('show');
        }, duration);
    }

    function hideGuideMessage() {
        const layer = getGuideLayer();
        layer.classList.remove('show');
        layer.classList.remove('sequence', 'reveal', 'alert', 'curtain');
        guideSequence = null;
        setTutorialCurtain(false);
        document.body.classList.remove('mimi-alert');
        window.clearTimeout(guideMessageTimer);
    }

    function setTutorialCurtain(visible) {
        document.body.classList.toggle('tutorial-curtain', Boolean(visible));
    }

    function showGuideSequence(messages, options = {}) {
        const lines = Array.isArray(messages) ? messages.filter(Boolean).map(String) : [];
        if (!lines.length) return;

        const layer = getGuideLayer();
        clearGuideChoices(layer);
        guideSequence = {
            lines,
            index: 0,
            type: options.type || 'info',
            alertIndex: Number.isInteger(options.alertIndex) ? options.alertIndex : -1,
            revealOnComplete: Boolean(options.revealOnComplete),
            finalButtonLabel: options.finalButtonLabel || '',
            onComplete: typeof options.onComplete === 'function' ? options.onComplete : null
        };

        window.clearTimeout(guideMessageTimer);
        document.body.classList.remove('mimi-alert');
        layer.classList.remove('success', 'warning', 'error', 'info', 'show', 'reveal', 'alert', 'curtain');
        layer.classList.add(guideSequence.type, 'sequence');
        layer.classList.toggle('curtain', Boolean(options.curtain));
        setTutorialCurtain(Boolean(options.curtain));
        renderGuideSequenceLine();
        window.requestAnimationFrame(() => layer.classList.add('show'));
    }

    function showGuideChoice(message, choices = [], options = {}) {
        const layer = getGuideLayer();
        const textEl = layer.querySelector('.mimi-text');
        const nextButton = layer.querySelector('.mimi-next-btn');
        const choiceList = layer.querySelector('.mimi-choice-list');
        const type = options.type || 'info';
        const normalizedChoices = Array.isArray(choices) ? choices.filter(choice => choice?.label) : [];
        if (!normalizedChoices.length) return;

        guideSequence = null;
        window.clearTimeout(guideMessageTimer);
        document.body.classList.remove('mimi-alert');
        layer.classList.remove('success', 'warning', 'error', 'info', 'show', 'reveal', 'alert', 'curtain');
        layer.classList.add(type, 'sequence');
        layer.classList.toggle('curtain', Boolean(options.curtain));
        setTutorialCurtain(Boolean(options.curtain));
        setGuideText(textEl, message);
        if (nextButton) nextButton.hidden = true;
        if (choiceList) {
            choiceList.innerHTML = '';
            choiceList.hidden = false;
            normalizedChoices.forEach(choice => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'mimi-choice-btn';
                button.textContent = choice.label;
                button.addEventListener('click', () => {
                    clearGuideChoices(layer);
                    hideGuideMessage();
                    if (typeof choice.onSelect === 'function') choice.onSelect(choice.value);
                });
                choiceList.appendChild(button);
            });
        }
        window.requestAnimationFrame(() => layer.classList.add('show'));
    }

    function renderGuideSequenceLine() {
        if (!guideSequence) return;

        const layer = getGuideLayer();
        const textEl = layer.querySelector('.mimi-text');
        const nextButton = layer.querySelector('.mimi-next-btn');
        const isLastLine = guideSequence.index >= guideSequence.lines.length - 1;
        const isAlertLine = guideSequence.alertIndex >= 0 && guideSequence.index >= guideSequence.alertIndex;

        setGuideText(textEl, guideSequence.lines[guideSequence.index] || '');
        layer.classList.toggle('alert', isAlertLine);
        document.body.classList.toggle('mimi-alert', isAlertLine);
        if (nextButton) {
            nextButton.hidden = false;
            nextButton.textContent = isLastLine && guideSequence.finalButtonLabel
                ? guideSequence.finalButtonLabel
                : SM.i18n?.t?.(isLastLine ? 'dialogStartButton' : 'dialogNextButton')
                || (isLastLine ? 'Start' : 'Next');
        }
    }

    function advanceGuideSequence() {
        if (!guideSequence) return;

        if (guideSequence.index < guideSequence.lines.length - 1) {
            guideSequence.index += 1;
            renderGuideSequenceLine();
            return;
        }

        const onComplete = guideSequence.onComplete;
        const shouldReveal = guideSequence.revealOnComplete;
        guideSequence = null;
        document.body.classList.remove('mimi-alert');

        if (shouldReveal) {
            playGuideReveal(onComplete);
            return;
        }

        hideGuideMessage();
        if (onComplete) onComplete();
    }

    function playGuideReveal(onComplete) {
        const layer = getGuideLayer();
        window.clearTimeout(guideMessageTimer);
        layer.classList.add('reveal');

        guideMessageTimer = window.setTimeout(() => {
            hideGuideMessage();
            if (onComplete) onComplete();
        }, 1700);
    }

    function setBagHudHidden(hidden, reason = 'default') {
        if (hidden) {
            bagHudHideReasons.add(reason);
        } else {
            bagHudHideReasons.delete(reason);
        }
        document.body.classList.toggle('bag-hud-hidden', bagHudHideReasons.size > 0);
    }

    function clearGuideChoices(layer = getGuideLayer()) {
        const choiceList = layer.querySelector('.mimi-choice-list');
        if (!choiceList) return;
        choiceList.innerHTML = '';
        choiceList.hidden = true;
    }

    function showToast(message, options = {}) {
        if (!options.plain) {
            showGuideMessage(message, options);
            return;
        }

        const layer = getToastLayer();
        const toast = document.createElement('div');
        const type = options.type || 'info';
        const duration = Number.isFinite(options.duration) ? options.duration : 2600;

        toast.className = `game-toast ${type}`;
        toast.textContent = String(message || '');
        layer.appendChild(toast);

        window.setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-8px)';
            toast.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
            window.setTimeout(() => toast.remove(), 220);
        }, duration);
    }

    function showRewardPopup(message, reward = {}) {
        showCelebrationBurst();

        const existingFloat = document.querySelector('.reward-float');
        if (existingFloat) existingFloat.remove();

        const float = document.createElement('div');
        float.className = 'reward-float';
        float.setAttribute('role', 'status');
        float.setAttribute('aria-live', 'polite');
        float.innerHTML = `
            <span>EXP +${escapeHtml(reward.xp || 0)}</span>
            <span>${escapeHtml(SM.i18n?.t?.('coinsLabel') || '')} +${escapeHtml(reward.coins || 0)}</span>
        `;
        document.body.appendChild(float);
        window.setTimeout(() => float.remove(), 1300);
    }

    function showCelebrationBurst() {
        const existingBurst = document.querySelector('.celebration-burst');
        if (existingBurst) existingBurst.remove();

        const layer = document.createElement('div');
        layer.className = 'celebration-burst';
        const colors = ['#2ee6cc', '#ffd166', '#ff6b6b', '#7dd3fc', '#a78bfa', '#ffffff'];

        for (let index = 0; index < 34; index += 1) {
            const particle = document.createElement('span');
            const angle = (Math.PI * 2 * index) / 34 + (Math.random() - 0.5) * 0.34;
            const distance = 86 + Math.random() * 118;
            particle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
            particle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
            particle.style.setProperty('--c', colors[index % colors.length]);
            particle.style.setProperty('--d', `${Math.random() * 0.16}s`);
            layer.appendChild(particle);
        }

        document.body.appendChild(layer);
        window.setTimeout(() => layer.remove(), 1250);
    }

    function showDialog({ title, message = '', buttonText, type = 'warning' } = {}) {
        const existingDialog = document.querySelector('.game-dialog-layer');
        if (existingDialog) {
            existingDialog.remove();
        }

        const dialogTitle = title || SM.i18n?.t?.('dialogFallbackTitle') || '';
        const dialogButton = buttonText || SM.i18n?.t?.('dialogFallbackButton') || '';
        const layer = document.createElement('div');
        layer.className = 'game-dialog-layer';
        layer.innerHTML = `
            <div class="game-dialog ${type}" role="dialog" aria-modal="true" aria-labelledby="game-dialog-title">
                <h2 id="game-dialog-title">${escapeHtml(dialogTitle)}</h2>
                <p>${escapeHtml(message)}</p>
                <button type="button" class="game-dialog-btn">${escapeHtml(dialogButton)}</button>
            </div>
        `;
        document.body.appendChild(layer);

        const closeButton = layer.querySelector('.game-dialog-btn');
        closeButton?.focus();
        closeButton?.addEventListener('click', () => layer.remove());
    }

    function getTutorialLayer() {
        if (tutorialLayer) return tutorialLayer;

        tutorialLayer = document.createElement('div');
        tutorialLayer.id = 'tutorial-coach';
        tutorialLayer.setAttribute('role', 'dialog');
        tutorialLayer.setAttribute('aria-live', 'polite');
        tutorialLayer.innerHTML = `
            <div class="tutorial-coach-card">
                <div class="tutorial-coach-eyebrow"></div>
                <h2 class="tutorial-coach-title"></h2>
                <p class="tutorial-coach-message"></p>
                <button class="tutorial-coach-btn" type="button"></button>
            </div>
        `;
        document.body.appendChild(tutorialLayer);

        tutorialLayer.querySelector('.tutorial-coach-btn')?.addEventListener('click', () => {
            const key = tutorialLayer.dataset.tutorialKey;
            if (key) {
                try {
                    localStorage.setItem(`${TUTORIAL_STORAGE_PREFIX}${key}`, '1');
                } catch (error) {
                    console.warn('Failed to save tutorial state.', error);
                }
            }
            tutorialLayer.classList.remove('show');
        });

        return tutorialLayer;
    }

    function hasSeenTutorial(key) {
        try {
            return localStorage.getItem(`${TUTORIAL_STORAGE_PREFIX}${key}`) === '1';
        } catch (error) {
            return false;
        }
    }

    function showTutorial(key, { title, message, titleKey, messageKey, buttonKey = 'tutorialOk' } = {}) {
        if (!key || hasSeenTutorial(key)) return;

        const levelOnboardingLayer = document.getElementById('level-onboarding-layer');
        if (levelOnboardingLayer && !levelOnboardingLayer.classList.contains('hidden')) {
            window.setTimeout(() => showTutorial(key, { title, message, titleKey, messageKey, buttonKey }), 700);
            return;
        }

        const layer = getTutorialLayer();
        const eyebrowEl = layer.querySelector('.tutorial-coach-eyebrow');
        const titleEl = layer.querySelector('.tutorial-coach-title');
        const messageEl = layer.querySelector('.tutorial-coach-message');
        const buttonEl = layer.querySelector('.tutorial-coach-btn');

        layer.dataset.tutorialKey = key;
        if (eyebrowEl) eyebrowEl.textContent = SM.i18n?.t?.('tutorialEyebrow') || '';
        if (titleEl) titleEl.textContent = title || SM.i18n?.t?.(titleKey) || '';
        if (messageEl) messageEl.textContent = message || SM.i18n?.t?.(messageKey) || '';
        if (buttonEl) buttonEl.textContent = SM.i18n?.t?.(buttonKey) || 'OK';

        window.requestAnimationFrame(() => layer.classList.add('show'));
    }

    function resetTutorials() {
        try {
            Object.keys(localStorage)
                .filter(key => key.startsWith(TUTORIAL_STORAGE_PREFIX))
                .forEach(key => localStorage.removeItem(key));
        } catch (error) {
            console.warn('Failed to reset tutorial state.', error);
        }
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

    window.alert = (message) => {
        showToast(message, { type: 'info', duration: 3200 });
    };

    SM.ui = {
        showToast,
        showRewardPopup,
        showGuideMessage,
        showGuideSequence,
        showGuideChoice,
        hideGuideMessage,
        setTutorialCurtain,
        setBagHudHidden,
        showTutorial,
        resetTutorials,
        refreshLanguage,
        showDialog
    };
})();

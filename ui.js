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
                    <img class="mimi-face" src="assets/mimi-avatar.png" alt="" aria-hidden="true">
                </button>
                <div class="mimi-speech" role="status" aria-live="polite">
                    <div class="mimi-name"></div>
                    <div class="mimi-text"></div>
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
        const name = SM.i18n?.t?.('mimiName') || 'Mimi';

        const avatar = layer.querySelector('.mimi-avatar');
        const nameEl = layer.querySelector('.mimi-name');
        const nextButton = layer.querySelector('.mimi-next-btn');

        avatar?.setAttribute('aria-label', name);
        if (nameEl) nameEl.textContent = name;
        if (nextButton) nextButton.textContent = SM.i18n?.t?.('dialogNextButton') || 'Next';

        layer.classList.remove('show', 'reveal');
        window.clearTimeout(guideMessageTimer);
    }

    function showGuideMessage(message, options = {}) {
        const layer = getGuideLayer();
        const textEl = layer.querySelector('.mimi-text');
        const nextButton = layer.querySelector('.mimi-next-btn');
        const type = options.type || 'info';
        const duration = Number.isFinite(options.duration) ? options.duration : 3200;

        guideSequence = null;
        setTutorialCurtain(false);
        layer.classList.remove('success', 'warning', 'error', 'info', 'show');
        layer.classList.remove('sequence', 'reveal');
        layer.classList.add(type);
        if (textEl) {
            textEl.textContent = String(message || '');
        }
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
        layer.classList.remove('sequence', 'reveal');
        guideSequence = null;
        setTutorialCurtain(false);
        window.clearTimeout(guideMessageTimer);
    }

    function setTutorialCurtain(visible) {
        document.body.classList.toggle('tutorial-curtain', Boolean(visible));
    }

    function showGuideSequence(messages, options = {}) {
        const lines = Array.isArray(messages) ? messages.filter(Boolean).map(String) : [];
        if (!lines.length) return;

        const layer = getGuideLayer();
        guideSequence = {
            lines,
            index: 0,
            type: options.type || 'info',
            revealOnComplete: Boolean(options.revealOnComplete),
            onComplete: typeof options.onComplete === 'function' ? options.onComplete : null
        };

        window.clearTimeout(guideMessageTimer);
        layer.classList.remove('success', 'warning', 'error', 'info', 'show', 'reveal');
        layer.classList.add(guideSequence.type, 'sequence');
        setTutorialCurtain(false);
        renderGuideSequenceLine();
        window.requestAnimationFrame(() => layer.classList.add('show'));
    }

    function renderGuideSequenceLine() {
        if (!guideSequence) return;

        const layer = getGuideLayer();
        const textEl = layer.querySelector('.mimi-text');
        const nextButton = layer.querySelector('.mimi-next-btn');
        const isLastLine = guideSequence.index >= guideSequence.lines.length - 1;

        if (textEl) textEl.textContent = guideSequence.lines[guideSequence.index] || '';
        if (nextButton) {
            nextButton.hidden = false;
            nextButton.textContent = SM.i18n?.t?.(isLastLine ? 'dialogStartButton' : 'dialogNextButton')
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
        showGuideMessage,
        showGuideSequence,
        hideGuideMessage,
        setTutorialCurtain,
        setBagHudHidden,
        showTutorial,
        resetTutorials,
        refreshLanguage,
        showDialog
    };
})();

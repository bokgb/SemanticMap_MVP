(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};

    let toastLayer = null;
    let guideLayer = null;
    let guideMessageTimer = null;

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
                </div>
            `;
            document.body.appendChild(guideLayer);
            refreshLanguage();

            guideLayer.querySelector('.mimi-avatar')?.addEventListener('click', () => {
                showGuideMessage(SM.i18n?.t?.('mimiIdle') || '', { type: 'info', duration: 3200 });
            });
        }

        return guideLayer;
    }

    function refreshLanguage() {
        const layer = getGuideLayer();
        const name = SM.i18n?.t?.('mimiName') || 'Mimi';

        const avatar = layer.querySelector('.mimi-avatar');
        const nameEl = layer.querySelector('.mimi-name');

        avatar?.setAttribute('aria-label', name);
        if (nameEl) nameEl.textContent = name;

        layer.classList.remove('show');
        window.clearTimeout(guideMessageTimer);
    }

    function showGuideMessage(message, options = {}) {
        const layer = getGuideLayer();
        const textEl = layer.querySelector('.mimi-text');
        const type = options.type || 'info';
        const duration = Number.isFinite(options.duration) ? options.duration : 3200;

        layer.classList.remove('success', 'warning', 'error', 'info', 'show');
        layer.classList.add(type);
        if (textEl) {
            textEl.textContent = String(message || '');
        }

        window.clearTimeout(guideMessageTimer);
        window.requestAnimationFrame(() => layer.classList.add('show'));
        guideMessageTimer = window.setTimeout(() => {
            layer.classList.remove('show');
        }, duration);
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
        refreshLanguage,
        showDialog
    };
})();

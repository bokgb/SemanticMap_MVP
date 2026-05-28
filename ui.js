(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};

    let toastLayer = null;

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

    function showToast(message, options = {}) {
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

    function showDialog({ title = '提示', message = '', buttonText = '知道了', type = 'warning' } = {}) {
        const existingDialog = document.querySelector('.game-dialog-layer');
        if (existingDialog) {
            existingDialog.remove();
        }

        const layer = document.createElement('div');
        layer.className = 'game-dialog-layer';
        layer.innerHTML = `
            <div class="game-dialog ${type}" role="dialog" aria-modal="true" aria-labelledby="game-dialog-title">
                <h2 id="game-dialog-title">${escapeHtml(title)}</h2>
                <p>${escapeHtml(message)}</p>
                <button type="button" class="game-dialog-btn">${escapeHtml(buttonText)}</button>
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
        showDialog
    };
})();

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

    window.alert = (message) => {
        showToast(message, { type: 'info', duration: 3200 });
    };

    SM.ui = {
        showToast
    };
})();

(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    state.devMode = new URLSearchParams(window.location.search).get('dev') === '1'
        || localStorage.getItem('semantic-map-dev-mode') === '1';
    state.currentLang = 'ja';
    state.activeQuest = null;

    function initClickEffects() {
        document.addEventListener('pointerdown', (event) => {
            if (event.button !== undefined && event.button !== 0) return;

            const pulse = document.createElement('span');
            pulse.className = 'recording-click-pulse';
            pulse.style.left = `${event.clientX}px`;
            pulse.style.top = `${event.clientY}px`;
            document.body.appendChild(pulse);

            pulse.addEventListener('animationend', () => {
                pulse.remove();
            }, { once: true });
        }, { capture: true, passive: true });
    }

    function init() {
        initClickEffects();
        SM.quests.init();
        SM.inventory.init();
        SM.i18n.init();
        SM.vision.init();
        SM.map.init();
        SM.missions?.init?.();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    state.devMode = new URLSearchParams(window.location.search).get('dev') === '1'
        || localStorage.getItem('semantic-map-dev-mode') === '1';
    state.currentLang = 'zh';
    state.activeQuest = null;

    function init() {
        SM.quests.init();
        SM.inventory.init();
        SM.i18n.init();
        SM.vision.init();
        SM.map.init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

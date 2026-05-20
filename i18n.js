(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    function toggleLanguage() {
        state.currentLang = state.currentLang === 'zh' ? 'ja' : 'zh';

        const langBtn = document.getElementById('lang-toggle-btn');
        if (langBtn) {
            langBtn.innerText = state.currentLang === 'zh'
                ? '🇯🇵 日本語に切替 (Switch to JP)'
                : '🇨🇳 切回中文 (Switch to CN)';
        }

        const translatableElements = document.querySelectorAll('[data-zh][data-ja]');
        translatableElements.forEach(el => {
            el.innerText = el.getAttribute(`data-${state.currentLang}`);
        });

        const bagBtnText = document.getElementById('bag-btn-text');
        if (bagBtnText) {
            bagBtnText.innerText = state.currentLang === 'zh' ? '地点词汇卡' : '場所語彙カード';
        }
    }

    function init() {
        state.currentLang = state.currentLang || 'zh';
        window.toggleLanguage = toggleLanguage;
    }

    SM.i18n = {
        init,
        toggleLanguage
    };
})();

(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};
    const LANG_STORAGE_KEY = 'semantic-map-lang';

    const DICT = {
        zh: {
            langToggle: 'JP',
            mimiName: 'Mimi',
            mimiFace: 'M',
            bagTitle: '地点词汇卡',
            difficulty: {
                N5: '当前难度：N5 - 新手',
                N3: '当前难度：N3 - 进阶',
                N1: '当前难度：N1 - 专家',
                unknown: '当前难度：未知'
            },
            levelSelected: '已选择：{level}',
            cameraUnsupported: '当前浏览器不支持摄像头调用，请使用 HTTPS 或 localhost 环境。',
            cameraOpenFailed: '无法调用摄像头：{message}',
            cameraNotReady: '摄像头画面尚未准备好，请稍等一秒再拍。',
            captureFailed: '无法拍摄当前画面：{message}',
            aiError: 'AI 识别出错：{message}',
            backendLog: '请检查后端日志',
            apiRejected: 'API 拒绝请求: {message}',
            aiNoText: 'AI 没有返回可解析的文本结果。',
            aiFailed: '识别失败：{message}',
            recognitionFailed: '识别失败',
            unknownItem: '未知物品',
            flowError: '识别流程异常：{message}',
            scanFirst: '请先点击地图上的地点文型任务，再开始正式拍照。',
            parsing: '解析中...',
            catRescue: '小猫救援',
            catFed: '喂食成功：已使用 {word}',
            purified: '净化完成',
            areaPurified: '区域净化完成！',
            areaRepair: '区域修复',
            outsidePracticeDone: '区域外练习完成：已获得词卡，但不增加区域修复值。',
            wrongTitle: '拍摄对象不符合任务',
            wrongCatMessage: '你拍到了：{word}\n这个任务需要食物或饮料类物品。',
            wrongMessage: '你拍到了：{word}\n识别类别：{tag}\n这个任务需要：{required}',
            wrongRequiredFallback: '任务指定类别',
            ok: '知道了',
            grammarReviewTitle: '语法复盘',
            noExample: '没有找到合适的例句。',
            noun: '名词',
            mapDataInvalid: 'spotsData.json 格式不是数组',
            mapDataFailed: '地标数据加载失败，请检查 spotsData.json',
            areaComplete: '{area} 修复完成',
            areaProgress: '{area} {points}/{required}',
            questTitle: '{rarity}级文型任务',
            questCatPoints: '小猫救援 +{points}',
            questAreaPoints: '区域修复值 +{points}',
            questOutside: '区域外练习：不加修复值',
            catName: '流浪猫',
            demoPosition: '开发测试位置：{area}\nURL 参数 area={id}',
            gpsUpdated: '坐标更新成功：\n纬度 {lat}\n经度 {lng}',
            gpsKept: 'GPS 暂时中断，已保留上次定位',
            gpsFallback: 'GPS 定位失败，已切换到关西演示位置',
            gpsUnsupported: '你的设备不支持 GPS，已切换到关西演示位置',
            resetDone: '已重置全部进度，正在重新开始',
            weakSignal: '信号还不稳定，再靠近约 {meters} 米就能解锁。',
            newPlaceFound: '发现新地点：{place}',
            explorerLevelUp: '探索等级 Lv.{level}！雷达范围扩大到 {radius}m',
            mimiIdle: '我是 Mimi。附近有语义信号，走近一点看看吧。',
            noSignalHint: '这个范围暂时没有稳定信号。看一下雷达边缘的方向提示吧。',
            noSignalMoveHint: '附近暂时没有稳定信号，往{direction}走约 {meters} 米试试看。',
            dialogFallbackTitle: '提示',
            dialogFallbackButton: '知道了'
        },
        ja: {
            langToggle: 'ZH',
            mimiName: 'ミミ',
            mimiFace: 'ミ',
            bagTitle: '場所語彙カード',
            difficulty: {
                N5: '現在の難易度：N5 - 初心者',
                N3: '現在の難易度：N3 - 中級',
                N1: '現在の難易度：N1 - 上級',
                unknown: '現在の難易度：不明'
            },
            levelSelected: '選択しました：{level}',
            cameraUnsupported: 'このブラウザではカメラを使用できません。HTTPS または localhost で開いてください。',
            cameraOpenFailed: 'カメラを起動できません：{message}',
            cameraNotReady: 'カメラ映像の準備がまだです。少し待ってから撮影してください。',
            captureFailed: '現在の映像を撮影できません：{message}',
            aiError: 'AI認識エラー：{message}',
            backendLog: 'バックエンドログを確認してください',
            apiRejected: 'API がリクエストを拒否しました：{message}',
            aiNoText: 'AI から解析可能なテキストが返りませんでした。',
            aiFailed: '認識に失敗しました：{message}',
            recognitionFailed: '認識失敗',
            unknownItem: '不明な物体',
            flowError: '認識処理エラー：{message}',
            scanFirst: '先に地図上の文型タスクを選んでから撮影してください。',
            parsing: '解析中...',
            catRescue: '猫救助',
            catFed: '餌やり成功：{word} をあげました',
            purified: '浄化完了',
            areaPurified: 'エリア浄化完了！',
            areaRepair: 'エリア修復',
            outsidePracticeDone: 'エリア外練習完了：語彙カードは獲得しましたが、修復値は増えません。',
            wrongTitle: '撮影対象がタスクに合っていません',
            wrongCatMessage: '撮影したもの：{word}\nこのタスクでは食べ物または飲み物が必要です。',
            wrongMessage: '撮影したもの：{word}\n認識カテゴリ：{tag}\n必要なカテゴリ：{required}',
            wrongRequiredFallback: 'タスク指定カテゴリ',
            ok: 'わかりました',
            grammarReviewTitle: '文法レビュー',
            noExample: '適切な例文が見つかりませんでした。',
            noun: '名詞',
            mapDataInvalid: 'spotsData.json の形式が配列ではありません',
            mapDataFailed: '地点データの読み込みに失敗しました。spotsData.json を確認してください。',
            areaComplete: '{area} 修復完了',
            areaProgress: '{area} {points}/{required}',
            questTitle: '{rarity}級文型タスク',
            questCatPoints: '猫救助 +{points}',
            questAreaPoints: 'エリア修復値 +{points}',
            questOutside: 'エリア外練習：修復値なし',
            catName: '迷い猫',
            demoPosition: '開発テスト位置：{area}\nURL パラメータ area={id}',
            gpsUpdated: '座標を更新しました：\n緯度 {lat}\n経度 {lng}',
            gpsKept: 'GPS が一時的に途切れました。前回位置を保持しています',
            gpsFallback: 'GPS 位置情報を取得できないため、関西デモ位置に切り替えました',
            gpsUnsupported: 'この端末は GPS に対応していないため、関西デモ位置に切り替えました',
            resetDone: '進行状況をリセットしました。再開します',
            weakSignal: '信号がまだ弱いです。あと約 {meters}m 近づくと解放されます。',
            newPlaceFound: '新しい地点を発見：{place}',
            explorerLevelUp: '探索レベル Lv.{level}！レーダー範囲が {radius}m に拡大しました',
            mimiIdle: 'ミミだよ。近くに意味信号があるみたい。少し近づいてみよう。',
            noSignalHint: 'この範囲にはまだ安定した信号がないみたい。レーダー端の方向ヒントを見てみよう。',
            noSignalMoveHint: '近くに安定した信号がありません。{direction}へ約 {meters}m 進んでみましょう。',
            dialogFallbackTitle: '案内',
            dialogFallbackButton: 'わかりました'
        }
    };

    function getLang() {
        return state.currentLang === 'ja' ? 'ja' : 'zh';
    }

    function getByPath(source, path) {
        return String(path || '').split('.').reduce((node, key) => {
            return node && Object.prototype.hasOwnProperty.call(node, key) ? node[key] : undefined;
        }, source);
    }

    function format(template, params = {}) {
        return String(template ?? '').replace(/\{(\w+)\}/g, (_, key) => {
            return params[key] ?? '';
        });
    }

    function t(key, params = {}) {
        const lang = getLang();
        const template = getByPath(DICT[lang], key) ?? getByPath(DICT.zh, key) ?? key;
        return format(template, params);
    }

    function applyLanguage() {
        const lang = getLang();

        document.documentElement.lang = lang === 'ja' ? 'ja' : 'zh-CN';

        const langBtn = document.getElementById('lang-toggle-btn');
        if (langBtn) {
            langBtn.innerText = t('langToggle');
        }

        const translatableElements = document.querySelectorAll('[data-zh][data-ja]');
        translatableElements.forEach(el => {
            el.innerText = el.getAttribute(`data-${lang}`);
        });

        document.querySelectorAll('[data-zh-title][data-ja-title]').forEach(el => {
            el.setAttribute('title', el.getAttribute(`data-${lang}-title`));
        });

        document.querySelectorAll('[data-zh-label][data-ja-label]').forEach(el => {
            el.setAttribute('aria-label', el.getAttribute(`data-${lang}-label`));
        });

        const bagBtnText = document.getElementById('bag-btn-text');
        if (bagBtnText) {
            bagBtnText.innerText = t('bagTitle');
        }

        SM.vision?.updateDifficultyHint?.();
        SM.ui?.refreshLanguage?.();
        SM.map?.refreshLanguage?.();
        SM.inventory?.refreshLanguage?.();
    }

    function toggleLanguage() {
        state.currentLang = state.currentLang === 'zh' ? 'ja' : 'zh';
        localStorage.setItem(LANG_STORAGE_KEY, state.currentLang);
        applyLanguage();
    }

    function init() {
        const urlLang = new URLSearchParams(window.location.search).get('lang');
        const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
        state.currentLang = urlLang === 'ja' || urlLang === 'zh'
            ? urlLang
            : savedLang === 'ja' || savedLang === 'zh'
                ? savedLang
                : state.currentLang || 'zh';
        localStorage.setItem(LANG_STORAGE_KEY, state.currentLang);
        window.toggleLanguage = toggleLanguage;
        applyLanguage();
    }

    SM.i18n = {
        init,
        toggleLanguage,
        applyLanguage,
        t,
        getLang
    };
})();

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
            inventoryEmpty: '还没有词卡。完成附近任务后，词卡会收进这里。',
            tutorialEyebrow: '新手提示',
            tutorialOk: '知道了',
            tutorialIntroTitle: '先看亮着的视野',
            tutorialIntroBody: '亮着的范围是你现在能感知到的地方。问号是远处信号，靠近后会变成任务点。',
            tutorialQuestTitle: '到现场完成这个句子',
            tutorialQuestBody: '走到任务点附近，按句子的目标拍照。完成后会获得词卡、EXP 和金币。',
            tutorialInventoryTitle: '词卡会进背包',
            tutorialInventoryBody: '你在现实地点收集到的词会保存在这里。之后 NPC 任务也会用到这些词卡。',
            tutorialLevelTitle: '升级会扩大视野',
            tutorialLevelBody: '等级提高后，可感知范围和可发现的信号会增加，地图会慢慢变得更开阔。',
            tutorialPracticeSpotName: 'Mimi 的练习信号',
            tutorialPracticeInstruction: '拍一个物体。',
            tutorialQuestTitle: '拍照来填空',
            tutorialQuestHint: '点击下方按钮，拍一个物体来填入空中。',
            tutorialScanButton: '拍照',
            mimiTutorialIntro: '我发现一个小信号。先点 P。',
            mimiIntroLine1: '你好，我是 Mimi。',
            mimiIntroLine2: '这张地图还在黑暗之中。',
            mimiIntroLine3: '我先为你打开一点视野。看见发光的 P 后，请点一下它。',
            dialogNextButton: '继续',
            dialogStartButton: '开始调查',
            mimiTutorialQuest: '很好。拍一个物体，让句子亮起来。',
            mimiInventoryTip: '词卡收好啦。以后会用到。',
            mimiLevelTip: 'Lv.{level}。视野变大一点。',
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
            wrongTitle: '信号没有亮起来',
            wrongCatMessage: '你拍到了：{word}\n这次要找能吃或能喝的东西。',
            wrongMessage: '你拍到了：{word}\n它还不能放进这个句子。换一个再试试。',
            ok: '知道了',
            tryAgain: '再试一次',
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
            questTutorialPractice: '练习任务：不增加修复值',
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
            questRewardToast: '获得 EXP +{xp} / 金币 +{coins}',
            coinsLabel: '金币',
            maxLevelLabel: 'EXP MAX',
            mimiIdle: '我是 Mimi。附近有语义信号，走近一点看看吧。',
            noSignalHint: '这个范围暂时没有稳定信号。看一下雷达边缘的方向提示吧。',
            noSignalMoveHint: '附近暂时没有稳定信号，往{direction}走约 {meters} 米试试看。',
            moveCloserToScan: '再靠近一点。还差约 {meters} 米。',
            npcTitle: '道の人',
            npcHelp: 'バッグからカードを渡す',
            npcSkip: 'またあとで',
            npcDone: 'ありがとう',
            npcReward: 'ミミ：いい判断だね。探索経験 +1',
            dialogFallbackTitle: '提示',
            dialogFallbackButton: '知道了'
        },
        ja: {
            langToggle: 'ZH',
            mimiName: 'ミミ',
            mimiFace: 'ミ',
            bagTitle: '場所語彙カード',
            inventoryEmpty: 'まだ語彙カードがありません。近くのタスクを完了すると、ここに入ります。',
            tutorialEyebrow: 'はじめてのヒント',
            tutorialOk: 'わかった',
            tutorialIntroTitle: 'まず明るい視野を見よう',
            tutorialIntroBody: '明るい範囲は、今感じ取れる場所です。？は遠くの信号で、近づくとタスクになります。',
            tutorialQuestTitle: '現地で文を完成させよう',
            tutorialQuestBody: 'タスク地点の近くで、文の目標に合うものを撮影します。完了すると語彙カード、EXP、コインが手に入ります。',
            tutorialInventoryTitle: '語彙カードはバッグへ',
            tutorialInventoryBody: '現実の場所で集めた語彙はここに保存されます。あとでNPCタスクでも使います。',
            tutorialLevelTitle: 'レベルアップで視野が広がる',
            tutorialLevelBody: 'レベルが上がると、感じ取れる範囲と見つかる信号が増えて、地図が少しずつ開けます。',
            tutorialPracticeSpotName: 'ミミの練習信号',
            tutorialPracticeInstruction: '物を撮ってください。',
            tutorialQuestTitle: '撮影して空欄を埋めよう',
            tutorialQuestHint: '下のボタンを押して、物を撮影して空欄に入れましょう。',
            tutorialScanButton: '撮影',
            mimiTutorialIntro: '小さな信号だよ。まず P をタップ。',
            mimiIntroLine1: 'こんにちは、ミミです。',
            mimiIntroLine2: 'この地図は、まだ暗闇の中にあります。',
            mimiIntroLine3: 'まずは少しだけ視野を開きます。光っている P をタップしてください。',
            dialogNextButton: 'つづける',
            dialogStartButton: '調査開始',
            mimiTutorialQuest: 'いいね。物を撮って文に入れよう。',
            mimiInventoryTip: 'カードをしまったよ。あとで使える。',
            mimiLevelTip: 'Lv.{level}。視野が少し広がったよ。',
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
            wrongTitle: '信号が光らなかった',
            wrongCatMessage: '写ったもの：{word}\n食べ物か飲み物を探してみよう。',
            wrongMessage: '写ったもの：{word}\nこの文にはまだ入らないみたい。別のものを試そう。',
            ok: 'わかりました',
            tryAgain: 'もう一度',
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
            questTutorialPractice: '練習タスク：修復値なし',
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
            questRewardToast: 'EXP +{xp} / コイン +{coins}',
            coinsLabel: 'コイン',
            maxLevelLabel: 'EXP MAX',
            mimiIdle: 'ミミだよ。近くに意味信号があるみたい。少し近づいてみよう。',
            noSignalHint: 'この範囲にはまだ安定した信号がないみたい。レーダー端の方向ヒントを見てみよう。',
            noSignalMoveHint: '近くに安定した信号がありません。{direction}へ約 {meters}m 進んでみましょう。',
            moveCloserToScan: 'もう少し近づこう。あと約 {meters}m。',
            npcTitle: '道の人',
            npcHelp: 'バッグからカードを渡す',
            npcSkip: 'またあとで',
            npcDone: 'ありがとう',
            npcReward: 'ミミ：いい判断だね。探索経験 +1',
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
                : state.currentLang || 'ja';
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

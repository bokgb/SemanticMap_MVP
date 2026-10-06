(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};
    const LANG_STORAGE_KEY = 'semantic-map-lang';

    const DICT = {
        zh: {
            langToggle: 'JP',
            mimiName: 'Lumi',
            mimiFace: 'L',
            bagTitle: '旅行邮袋',
            inventoryEmpty: '还没有词卡。完成附近任务后，词卡会收进这里。',
            tutorialEyebrow: '新手提示',
            tutorialOk: '知道了',
            tutorialIntroTitle: '沿着地图慢慢走',
            tutorialIntroBody: '附近的信封是居民的委托，走近地点就能和他们见面。',
            tutorialQuestTitle: '到现场完成这个句子',
            tutorialQuestBody: '走到任务点附近，按句子的目标拍照。完成后会获得词卡。',
            tutorialInventoryTitle: '词卡会进背包',
            tutorialInventoryBody: '你在现实地点收集到的词会保存在这里。之后 NPC 任务也会用到这些词卡。',
            tutorialLevelTitle: '升级会扩大视野',
            tutorialLevelBody: '等级提高后，可感知范围和可发现的信号会增加，地图会慢慢变得更开阔。',
            tutorialPracticeSpotName: '驿站委托',
            collapseNodeName: '驿站委托',
            tutorialPracticeInstruction: '拍一张能填进句子的照片。',
            tutorialQuestTitle: '完成委托驿站委托',
            tutorialQuestHint: '拍一个现实物体，AI 会把它变成单词填进空白。',
            cameraSlotLabel: '拍照填入',
            tutorialScanButton: '拍照',
            mimiTutorialIntro: '第一份委托到了，点开驿站看看吧。',
            mimiIntroLine1: '欢迎来到风间邮局，我是领路人 Lumi。',
            mimiIntroLine2: '你是一名穿行异世界的快递员。每个地点，都有一位等着你的居民。',
            levelChoiceLead: '……顺便问一下，旅人的日语水平怎么样？',
            levelChoicePrompt: '旅人的日语水平？',
            levelChoiceButton: '选择',
            levelChoiceComplete: '确认完毕。',
            levelChoiceReaction: {
                N5: '从简单的问候开始，一路慢慢学。',
                N3: '边走边聊，认识更多新朋友。',
                N1: '沿途的来信就拜托你读一读了。'
            },
            mimiIntroLine3: '杂货铺、林间花园、远行车站……今天从一份小小的委托开始。',
            mimiIntroLine4: '点开附近的驿站，认识当地居民。拍下需要的物品，把词语带回旅途。',
            dialogNextButton: '继续',
            dialogStartButton: '出发',
            mimiTutorialQuest: '很好。拍一张照片，让句子亮起来。',
            mimiInventoryTip: '这张词卡保存好了。去看看下一个节点吧。',
            mimiLevelTip: 'Lv.{level}。视野变大一点。',
            difficulty: {
                N5: '当前日语水平：N5-N4',
                N3: '当前日语水平：N3-N2',
                N1: '当前日语水平：N1+',
                unknown: '当前日语水平：未知'
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
            aiBusyRetry: '数字世界的信号有点拥挤。别动，我正在用同一张照片重新同步。',
            aiBusyFinal: '抱歉，现实侧的信号暂时太拥挤了。这张照片已经保留，点一下按钮就能再次同步。',
            recognitionFailed: '识别失败',
            unknownItem: '未知物品',
            flowError: '识别流程异常：{message}',
            scanFirst: '请先点击地图上的地点文型任务，再开始正式拍照。',
            parsing: '解析中...',
            resyncButton: '再同步',
            catRescue: '小猫救援',
            catFed: '喂食成功：已使用 {word}',
            purified: '踏访完成',
            areaPurified: '区域踏访完成！',
            areaRepair: '区域完成委托',
            outsidePracticeDone: '区域外练习完成：已获得词卡，但不增加区域旅途进度。',
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
            areaComplete: '{area} 完成委托完成',
            areaProgress: '{area} {points}/{required}',
            questTitle: '居民的委托',
            questCatPoints: '小猫救援 +{points}',
            questAreaPoints: '区域旅途进度 +{points}',
            questTutorialPractice: '练习任务：不增加旅途进度',
            questOutside: '区域外练习：不加旅途进度',
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
            mimiIdle: '不急，沿路走走吧。下一站有人等着你的来信。',
            noSignalHint: '这个范围暂时没有稳定信号。看一下雷达边缘的方向提示吧。',
            noSignalMoveHint: '附近暂时没有稳定信号，往{direction}走约 {meters} 米试试看。',
            moveCloserToScan: '再靠近一点。还差约 {meters} 米。',
            npcTitle: '道の人',
            npcHelp: 'バッグからカードを渡す',
            npcSkip: 'またあとで',
            npcDone: 'ありがとう',
            npcReward: '判断不错，这张词卡派上用场了。继续前进吧。',
            dialogFallbackTitle: '提示',
            dialogFallbackButton: '知道了'
        },
        ja: {
            langToggle: 'ZH',
            mimiName: 'ルミ',
            mimiFace: 'ル',
            bagTitle: '旅の郵便バッグ',
            inventoryEmpty: 'まだ語彙カードがありません。近くのタスクを完了すると、ここに入ります。',
            tutorialEyebrow: 'はじめてのヒント',
            tutorialOk: 'わかった',
            tutorialIntroTitle: '地図と一緒に歩こう',
            tutorialIntroBody: '近くの封筒は住人からの依頼。近づくと出会えます。',
            tutorialQuestTitle: '現地で文を完成させよう',
            tutorialQuestBody: 'タスク地点の近くで、文の目標に合う写真を撮ります。完了すると語彙カードが手に入ります。',
            tutorialInventoryTitle: '語彙カードはバッグへ',
            tutorialInventoryBody: '現実の場所で集めた語彙はここに保存されます。あとでNPCタスクでも使います。',
            tutorialLevelTitle: 'レベルアップで視野が広がる',
            tutorialLevelBody: 'レベルが上がると、感じ取れる範囲と見つかる信号が増えて、地図が少しずつ開けます。',
            tutorialPracticeSpotName: '配達依頼',
            collapseNodeName: '配達依頼',
            tutorialPracticeInstruction: '文に合う写真を撮ってください。',
            tutorialQuestTitle: '配達依頼を配達',
            tutorialQuestHint: '現実の物を撮ると、単語になって空白に入ります。',
            cameraSlotLabel: '写真で入力',
            tutorialScanButton: '撮影',
            mimiTutorialIntro: '最初の依頼が届きました。タップしてみてね。',
            mimiIntroLine1: '風の郵便局へようこそ。案内役のルミです。',
            mimiIntroLine2: 'あなたは異世界を旅する配達員。行く先々で住人が待っています。',
            levelChoiceLead: '……ちなみに、選ばれし者の日本語レベルは？',
            levelChoicePrompt: '選ばれし者の日本語レベルは？',
            levelChoiceButton: '選択',
            levelChoiceComplete: '確認完了です。',
            levelChoiceReaction: {
                N5: '簡単なあいさつから、少しずつ覚えよう。',
                N3: 'お話ししながら、新しい友達に会いに行こう。',
                N1: '旅先のお手紙も読んでもらおうかな。'
            },
            mimiIntroLine3: '雑貨店、森の庭、旅の駅。今日は小さなお届けものから。',
            mimiIntroLine4: '近くの依頼をタップして住人に会い、必要なものを撮って言葉を旅に持ち帰ろう。',
            dialogNextButton: 'つづける',
            dialogStartButton: '出発する',
            mimiTutorialQuest: 'いいね。写真を撮って文を完成させよう。',
            mimiInventoryTip: 'このカードを保存したよ。次のノードへ行こう。',
            mimiLevelTip: 'Lv.{level}。視野が少し広がったよ。',
            difficulty: {
                N5: '現在の日本語レベル：N5-N4',
                N3: '現在の日本語レベル：N3-N2',
                N1: '現在の日本語レベル：N1+',
                unknown: '現在の日本語レベル：不明'
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
            aiBusyRetry: 'デジタル世界の信号が少し混み合っています。その写真のまま、もう一度同期します。',
            aiBusyFinal: 'すみません。現実側の信号が一時的に混み合っています。この写真は保持しました。ボタンを押すと再同期できます。',
            recognitionFailed: '認識失敗',
            unknownItem: '不明な物体',
            flowError: '認識処理エラー：{message}',
            scanFirst: '先に地図上の文型タスクを選んでから撮影してください。',
            parsing: '解析中...',
            resyncButton: '再同期',
            catRescue: '猫救助',
            catFed: '餌やり成功：{word} をあげました',
            purified: '踏破完了',
            areaPurified: 'エリア踏破完了！',
            areaRepair: 'エリア配達',
            outsidePracticeDone: 'エリア外練習完了：語彙カードは獲得しましたが、旅の進捗は増えません。',
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
            areaComplete: '{area} 配達完了',
            areaProgress: '{area} {points}/{required}',
            questTitle: '住人からの依頼',
            questCatPoints: '猫救助 +{points}',
            questAreaPoints: 'エリア旅の進捗 +{points}',
            questTutorialPractice: '練習タスク：旅の進捗なし',
            questOutside: 'エリア外練習：旅の進捗なし',
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
            mimiIdle: 'ゆっくり歩こう。次の街で、お届けものを待っている人がいるよ。',
            noSignalHint: 'この範囲にはまだ安定した信号がないみたい。レーダー端の方向ヒントを見てみよう。',
            noSignalMoveHint: '近くに安定した信号がありません。{direction}へ約 {meters}m 進んでみましょう。',
            moveCloserToScan: 'もう少し近づこう。あと約 {meters}m。',
            npcTitle: '道の人',
            npcHelp: 'バッグからカードを渡す',
            npcSkip: 'またあとで',
            npcDone: 'ありがとう',
            npcReward: 'いい判断だったね。このカードが役に立ったよ。次へ進もう。',
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
        SM.missions?.refreshLanguage?.();
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

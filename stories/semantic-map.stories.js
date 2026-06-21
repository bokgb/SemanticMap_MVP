const desktop = {
  viewport: { defaultViewport: 'semanticDesktop' }
};

const mobile = {
  viewport: { defaultViewport: 'semanticMobile' }
};

const viewports = {
  desktop: { className: 'desktop', parameters: desktop },
  mobile: { className: 'mobile', parameters: mobile }
};

const stateLabels = {
  ready: 'ready',
  loading: 'loading',
  empty: 'empty',
  error: 'error'
};

function root(content, { viewport = 'desktop', state = 'ready' } = {}) {
  return `
    <main class="storybook-root ${viewports[viewport].className}">
      ${content}
      <div class="storybook-state-label">${viewport} / ${stateLabels[state]}</div>
    </main>
  `;
}

function mapBackground({ state = 'ready' } = {}) {
  const markers = state === 'empty'
    ? ''
    : `
      <div class="storybook-marker" style="left: 32%; top: 34%;">食</div>
      <div class="storybook-marker" style="left: 62%; top: 48%;">駅</div>
      <div class="storybook-marker is-muted" style="left: 74%; top: 26%;">?</div>
    `;

  return `
    <div id="map" class="storybook-map" aria-label="Mock semantic map"></div>
    ${markers}
  `;
}

function progressPanel() {
  return `
    <div id="player-progress-panel" class="player-progress-panel" aria-live="polite">
      <div class="player-progress-top">
        <span id="player-level-label">Lv.3</span>
        <span id="player-exp-label" class="player-exp-label">EXP 40/100</span>
        <span id="player-coins-label">85 金币</span>
      </div>
      <div class="player-exp-bar" aria-hidden="true">
        <div id="player-exp-fill" style="width: 40%;"></div>
      </div>
    </div>
  `;
}

function hud() {
  return `
    <button id="locate-btn" class="map-control-btn" type="button">
      <span class="locate-icon" aria-hidden="true"></span>
      <span class="locate-label">当前位置</span>
    </button>
    ${progressPanel()}
    <div id="ui-layer">
      <div id="ui-toggle"><button id="ui-toggle-btn">▾</button></div>
      <button id="lang-toggle-btn" type="button">JP</button>
      <h2>系统信息</h2>
      <p id="status-text">GPS 已定位：茨木 OIC 修复区</p>
      <select id="level-selector">
        <option>N5-N4</option>
        <option selected>N3-N2</option>
        <option>N1+</option>
      </select>
      <div id="difficulty-hint" data-level="N3">当前日语水平：N3-N2</div>
      <button id="clear-cache-btn">重置进度</button>
    </div>
    <button id="bag-btn">🎒<span id="bag-badge" style="display:block;">2</span></button>
  `;
}

function stateMessage(state, page) {
  if (state === 'loading') {
    return `
      <div class="storybook-loading" role="status">
        <div class="simple-spinner"></div>
        ${page} 正在加载...
      </div>
    `;
  }
  if (state === 'empty') {
    return `<div class="storybook-empty">${page} 暂无内容，等待附近地点或任务出现。</div>`;
  }
  if (state === 'error') {
    return `<div class="storybook-error">${page} 加载失败。请检查定位、相机权限或网络连接。</div>`;
  }
  return '';
}

function mapPage({ viewport = 'desktop', state = 'ready' } = {}) {
  return root(`
    ${mapBackground({ state })}
    ${hud()}
    ${stateMessage(state, '地图')}
  `, { viewport, state });
}

function questPanel({ state = 'ready' } = {}) {
  const content = {
    ready: {
      title: '文型语义缺失！',
      chip: '修复值 +2',
      slot: '?',
      fixed: 'を飲みます',
      button: '带着文型去拍照'
    },
    loading: {
      title: '正在生成地点任务...',
      chip: '修复中',
      slot: '...',
      fixed: 'を探しています',
      button: '请稍候'
    },
    empty: {
      title: '附近没有可用任务',
      chip: '0',
      slot: '-',
      fixed: '暂无文型',
      button: '返回地图'
    },
    error: {
      title: '任务生成失败',
      chip: '错误',
      slot: '!',
      fixed: '请重试',
      button: '重新获取'
    }
  }[state];

  return `
    <div id="quest-layer">
      <div class="quest-panel">
        <div class="quest-header">
          <span class="location-tag">📍 地点任务 R</span>
          <button id="btn-close-quest">×</button>
        </div>
        <div class="quest-content">
          <h3>${content.title}</h3>
          <div class="repair-reward-chip" id="quest-repair-points">${content.chip}</div>
          <div class="sentence-preview">
            <span class="slot-box" id="quest-slot">${content.slot}</span>
            <span class="fixed-text">${content.fixed}</span>
          </div>
        </div>
        <button id="btn-start-scan">${content.button}</button>
      </div>
    </div>
  `;
}

function questPage({ viewport = 'desktop', state = 'ready' } = {}) {
  return root(`
    ${mapBackground()}
    ${hud()}
    ${questPanel({ state })}
  `, { viewport, state });
}

function wordBlock({ withPhoto = false } = {}) {
  return `
    <div class="word-block ${withPhoto ? 'has-capture' : ''}" style="border-left-color:#6f6a60;">
      ${withPhoto ? '<img class="word-photo-thumb" src="/lumi-avatar.png" alt="">' : ''}
      <div class="word-title"><ruby>水<rt>みず</rt></ruby> <span style="font-size:12px;color:var(--subtle);">(水)</span></div>
      <div class="word-pos">[ 名词 ]</div>
      <div class="word-tag" style="background-color:#6f6a60;">Food</div>
      <div class="word-quest-meta">OIC Convenience / N3</div>
      <div class="word-sentence">水を飲みます。</div>
      <div class="grammar-review">
        <div class="grammar-review-title">语法复习</div>
        <div class="grammar-review-item">を：把「水」标记为动作对象</div>
      </div>
    </div>
  `;
}

function inventoryLayer({ state = 'ready' } = {}) {
  let body = `${wordBlock({ withPhoto: true })}${wordBlock()}`;
  if (state === 'loading') {
    body = '<div class="inventory-empty"><div class="simple-spinner"></div>正在读取今日词汇卡...</div>';
  }
  if (state === 'empty') {
    body = '<div class="inventory-empty">还没有收录词汇。完成一个地点任务后，词卡会出现在这里。</div>';
  }
  if (state === 'error') {
    body = '<div class="inventory-empty">词汇卡读取失败，本地存储可能不可用。</div>';
  }

  return `
    <div id="inventory-layer" class="open">
      <div class="inv-header">
        <h3>地点词汇卡</h3>
        <button id="close-bag-btn">×</button>
      </div>
      <div id="word-list">${body}</div>
    </div>
  `;
}

function inventoryPage({ viewport = 'desktop', state = 'ready' } = {}) {
  return root(`
    ${mapBackground()}
    ${hud()}
    ${inventoryLayer({ state })}
  `, { viewport, state });
}

function cameraPage({ viewport = 'desktop', state = 'ready' } = {}) {
  const overlay = state === 'loading'
    ? '<div id="ai-scanning-overlay"><div class="simple-spinner"></div><div class="simple-scanning-text">解析中...</div></div>'
    : stateMessage(state, '相机');

  return root(`
    <div id="camera-layer" style="display:flex;">
      <div class="storybook-camera-preview"></div>
      ${overlay}
      <div class="camera-controls">
        <button id="capture-btn" ${state === 'loading' ? 'disabled' : ''}>提取属性 (Capture)</button>
        <button id="close-camera-btn">关闭</button>
      </div>
    </div>
  `, { viewport, state });
}

function wordCard({ state = 'ready' } = {}) {
  const word = state === 'loading'
    ? '<div class="simple-spinner"></div>'
    : state === 'empty'
      ? '<span>暂无词卡</span>'
      : state === 'error'
        ? '<span>识别失败</span>'
        : '<ruby>水<rt>みず</rt></ruby><span>水</span>';

  const example = state === 'error'
    ? 'AI 返回内容无法解析。'
    : state === 'empty'
      ? '完成任务后会显示例句。'
      : '水を飲みます。';

  return `
    <div id="word-card-layer">
      <div class="loot-card">
        <div class="loot-header">✓ 文型词汇卡完成 ✓</div>
        <div id="loot-word-main" class="loot-word">${word}</div>
        <div class="loot-example-box">
          <div class="ex-label">💡 例句</div>
          <div id="loot-example-text" class="ex-text">${example}</div>
          <div id="loot-example-zh" class="ex-zh">在便利店完成的地点文型。</div>
        </div>
        <button id="btn-collect-word" class="loot-btn">收录到地点词汇卡</button>
      </div>
    </div>
  `;
}

function wordCardPage({ viewport = 'desktop', state = 'ready' } = {}) {
  return root(`
    ${mapBackground()}
    ${hud()}
    ${wordCard({ state })}
  `, { viewport, state });
}

function onboarding({ state = 'ready' } = {}) {
  const disabled = state === 'loading' ? 'disabled' : '';
  return `
    <div id="level-onboarding-layer">
      <div class="level-onboarding-panel">
        <div class="level-onboarding-guide">
          <div class="level-onboarding-avatar"><img src="/lumi-avatar.png" alt=""></div>
          <div>
            <div class="level-onboarding-kicker">Lumi</div>
            <h1>${state === 'error' ? '读取等级失败' : '选择日语水平'}</h1>
          </div>
        </div>
        <p class="level-onboarding-copy">${state === 'empty' ? '暂无可选等级。' : '用于匹配任务难度，之后可以随时调整。'}</p>
        <div class="level-choice-list">
          <button class="level-choice-btn" type="button" ${disabled}><span class="level-choice-main">N5-N4</span><span class="level-choice-sub">JLPT N5-N4</span></button>
          <button class="level-choice-btn" type="button" ${disabled}><span class="level-choice-main">N3-N2</span><span class="level-choice-sub">JLPT N3-N2</span></button>
          <button class="level-choice-btn" type="button" ${disabled}><span class="level-choice-main">N1+</span><span class="level-choice-sub">JLPT N1+</span></button>
        </div>
      </div>
    </div>
    ${state === 'loading' ? stateMessage(state, '等级选择') : ''}
  `;
}

function onboardingPage({ viewport = 'desktop', state = 'ready' } = {}) {
  return root(onboarding({ state }), { viewport, state });
}

function guideComponent({ state = 'ready' } = {}) {
  const type = state === 'error' ? 'error' : state === 'empty' ? 'warning' : 'success';
  const message = {
    ready: '发现新的地点信号。靠近后可以开始文型修复。',
    loading: '正在确认你的当前位置...',
    empty: '附近暂时没有新的崩坏节点。',
    error: '定位失败，已切换到演示位置。'
  }[state];

  return `
    <div id="mimi-guide" class="${type} show">
      <button class="mimi-avatar" type="button" aria-label="Lumi">
        <img class="mimi-face" src="/lumi-avatar.png" alt="">
      </button>
      <div class="mimi-speech" role="status">
        <div class="mimi-name">Lumi</div>
        <div class="mimi-text">${message}</div>
        ${state === 'loading' ? '<button class="mimi-next-btn" type="button">修复中</button>' : ''}
      </div>
    </div>
  `;
}

function componentStage({ viewport = 'desktop', state = 'ready' } = {}) {
  return root(`
    ${mapBackground()}
    ${progressPanel()}
    ${guideComponent({ state })}
    <div id="toast-layer">
      <div class="game-toast ${state === 'error' ? 'error' : 'info'}">${state === 'empty' ? '暂无提示' : '这里是 Toast / Lumi 组件状态'}</div>
    </div>
  `, { viewport, state });
}

function makeStories(render) {
  return {
    Desktop: { render: () => render({ viewport: 'desktop', state: 'ready' }), parameters: desktop },
    Mobile: { render: () => render({ viewport: 'mobile', state: 'ready' }), parameters: mobile },
    LoadingDesktop: { render: () => render({ viewport: 'desktop', state: 'loading' }), parameters: desktop },
    LoadingMobile: { render: () => render({ viewport: 'mobile', state: 'loading' }), parameters: mobile },
    EmptyDesktop: { render: () => render({ viewport: 'desktop', state: 'empty' }), parameters: desktop },
    EmptyMobile: { render: () => render({ viewport: 'mobile', state: 'empty' }), parameters: mobile },
    ErrorDesktop: { render: () => render({ viewport: 'desktop', state: 'error' }), parameters: desktop },
    ErrorMobile: { render: () => render({ viewport: 'mobile', state: 'error' }), parameters: mobile }
  };
}

export default {
  title: 'Semantic Map/Pages',
  tags: ['autodocs']
};

export const MapDesktop = makeStories(mapPage).Desktop;
export const MapMobile = makeStories(mapPage).Mobile;
export const MapLoadingDesktop = makeStories(mapPage).LoadingDesktop;
export const MapLoadingMobile = makeStories(mapPage).LoadingMobile;
export const MapEmptyDesktop = makeStories(mapPage).EmptyDesktop;
export const MapEmptyMobile = makeStories(mapPage).EmptyMobile;
export const MapErrorDesktop = makeStories(mapPage).ErrorDesktop;
export const MapErrorMobile = makeStories(mapPage).ErrorMobile;

export const QuestDesktop = makeStories(questPage).Desktop;
export const QuestMobile = makeStories(questPage).Mobile;
export const QuestLoadingDesktop = makeStories(questPage).LoadingDesktop;
export const QuestLoadingMobile = makeStories(questPage).LoadingMobile;
export const QuestEmptyDesktop = makeStories(questPage).EmptyDesktop;
export const QuestEmptyMobile = makeStories(questPage).EmptyMobile;
export const QuestErrorDesktop = makeStories(questPage).ErrorDesktop;
export const QuestErrorMobile = makeStories(questPage).ErrorMobile;

export const InventoryDesktop = makeStories(inventoryPage).Desktop;
export const InventoryMobile = makeStories(inventoryPage).Mobile;
export const InventoryLoadingDesktop = makeStories(inventoryPage).LoadingDesktop;
export const InventoryLoadingMobile = makeStories(inventoryPage).LoadingMobile;
export const InventoryEmptyDesktop = makeStories(inventoryPage).EmptyDesktop;
export const InventoryEmptyMobile = makeStories(inventoryPage).EmptyMobile;
export const InventoryErrorDesktop = makeStories(inventoryPage).ErrorDesktop;
export const InventoryErrorMobile = makeStories(inventoryPage).ErrorMobile;

export const CameraDesktop = makeStories(cameraPage).Desktop;
export const CameraMobile = makeStories(cameraPage).Mobile;
export const CameraLoadingDesktop = makeStories(cameraPage).LoadingDesktop;
export const CameraLoadingMobile = makeStories(cameraPage).LoadingMobile;
export const CameraEmptyDesktop = makeStories(cameraPage).EmptyDesktop;
export const CameraEmptyMobile = makeStories(cameraPage).EmptyMobile;
export const CameraErrorDesktop = makeStories(cameraPage).ErrorDesktop;
export const CameraErrorMobile = makeStories(cameraPage).ErrorMobile;

export const WordCardDesktop = makeStories(wordCardPage).Desktop;
export const WordCardMobile = makeStories(wordCardPage).Mobile;
export const WordCardLoadingDesktop = makeStories(wordCardPage).LoadingDesktop;
export const WordCardLoadingMobile = makeStories(wordCardPage).LoadingMobile;
export const WordCardEmptyDesktop = makeStories(wordCardPage).EmptyDesktop;
export const WordCardEmptyMobile = makeStories(wordCardPage).EmptyMobile;
export const WordCardErrorDesktop = makeStories(wordCardPage).ErrorDesktop;
export const WordCardErrorMobile = makeStories(wordCardPage).ErrorMobile;

export const OnboardingDesktop = makeStories(onboardingPage).Desktop;
export const OnboardingMobile = makeStories(onboardingPage).Mobile;
export const OnboardingLoadingDesktop = makeStories(onboardingPage).LoadingDesktop;
export const OnboardingLoadingMobile = makeStories(onboardingPage).LoadingMobile;
export const OnboardingEmptyDesktop = makeStories(onboardingPage).EmptyDesktop;
export const OnboardingEmptyMobile = makeStories(onboardingPage).EmptyMobile;
export const OnboardingErrorDesktop = makeStories(onboardingPage).ErrorDesktop;
export const OnboardingErrorMobile = makeStories(onboardingPage).ErrorMobile;

export const CoreComponentsDesktop = makeStories(componentStage).Desktop;
export const CoreComponentsMobile = makeStories(componentStage).Mobile;
export const CoreComponentsLoadingDesktop = makeStories(componentStage).LoadingDesktop;
export const CoreComponentsLoadingMobile = makeStories(componentStage).LoadingMobile;
export const CoreComponentsEmptyDesktop = makeStories(componentStage).EmptyDesktop;
export const CoreComponentsEmptyMobile = makeStories(componentStage).EmptyMobile;
export const CoreComponentsErrorDesktop = makeStories(componentStage).ErrorDesktop;
export const CoreComponentsErrorMobile = makeStories(componentStage).ErrorMobile;

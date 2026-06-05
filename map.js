(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    const DEFAULT_CENTER = [34.81036015042446, 135.5610787988949];
    const DEFAULT_DEMO_AREA_ID = 'ritsumeikan_oic';
    const EXPLORER_PROGRESS_STORAGE_KEY = 'semantic-map-explorer-progress-v1';
    const EXPLORER_LEVELS = [
        { level: 1, xp: 0, scanRadius: 180, unlockRadius: 60, maxVisible: 4, distantHints: 2 },
        { level: 2, xp: 50, scanRadius: 240, unlockRadius: 70, maxVisible: 5, distantHints: 2 },
        { level: 3, xp: 120, scanRadius: 300, unlockRadius: 80, maxVisible: 6, distantHints: 3 },
        { level: 4, xp: 220, scanRadius: 380, unlockRadius: 90, maxVisible: 7, distantHints: 3 },
        { level: 5, xp: 360, scanRadius: 480, unlockRadius: 100, maxVisible: 8, distantHints: 4 }
    ];
    const QUEST_REWARDS = {
        N: { xp: 10, coins: 5 },
        R: { xp: 20, coins: 10 },
        SR: { xp: 40, coins: 20 },
        SSR: { xp: 60, coins: 30 },
        npc: { xp: 30, coins: 15 }
    };
    const MAX_SPOTS_PER_TAG = 2;
    const MAX_DISTANT_SIGNALS = 4;
    const MIN_DISTANT_SIGNAL_ANGLE_DEGREES = 32;
    const MIN_ANY_SPOT_DISTANCE_METERS = 135;
    const MIN_SAME_TAG_DISTANCE_METERS = 180;
    const MAP_BOUNDS_RADIUS_METERS = 1200;
    const TUTORIAL_PEN_SPOT_ID = 'tutorial_pen_practice';
    const TUTORIAL_PEN_COMPLETE_KEY = 'semantic-map-tutorial-pen-complete-v1';
    const TUTORIAL_PEN_OFFSET_METERS = 26;
    const DEFAULT_ZOOM = 17;
    const FOCUS_ZOOM = 17;
    const AREA_PROGRESS_STORAGE_KEY = 'semantic-map-area-progress-v3';
    const RARITY_REPAIR_POINTS = {
        N: 1,
        R: 2,
        SR: 4,
        SSR: 6
    };
    const CAT_REPAIR_POINTS = 5;
    const CAT_SPAWN_DELAY_MS = {
        devMin: 4000,
        devMax: 9000,
        min: 45000,
        max: 90000
    };
    const CAT_NEARBY_AREA_RADIUS_METERS = 900;
    const GAME_AREAS = [
        // 修复区按“步行可达的语义场景”组织，而不是行政区。
        {
            id: 'ritsumeikan_oic',
            name: {
                zh: '立命馆 OIC 修复区',
                ja: '立命館OIC修復エリア'
            },
            center: [34.81036015042446, 135.5610787988949],
            radius: 420,
            zoom: 16,
            requiredPoints: 8,
            description: {
                zh: '立命馆大学大阪茨木校区与周边生活设施',
                ja: '立命館大学大阪いばらきキャンパスと周辺生活施設'
            }
        },
        {
            id: 'ibarakishi_station_west',
            name: {
                zh: '茨木站修复区',
                ja: '茨木駅修復エリア'
            },
            center: [34.81525, 135.56220],
            radius: 360,
            zoom: 17,
            requiredPoints: 8,
            description: {
                zh: 'JR 茨木站周边、车站设施与通勤动线',
                ja: 'JR茨木駅周辺、駅施設と通勤動線'
            }
        },
        {
            id: 'aeon_ibaraki',
            name: {
                zh: 'AEON 茨木生活修复区',
                ja: 'イオン茨木生活修復エリア'
            },
            center: [34.81255, 135.55845],
            radius: 300,
            zoom: 17.5,
            requiredPoints: 8,
            description: {
                zh: 'AEON MALL 茨木、商店与日常消费场景',
                ja: 'イオンモール茨木、店と日常の買い物場面'
            }
        },
        {
            id: 'minami_ibaraki_station',
            name: {
                zh: '南茨木站修复区',
                ja: '南茨木駅修復エリア'
            },
            center: [34.80255, 135.56535],
            radius: 360,
            zoom: 17,
            requiredPoints: 8,
            description: {
                zh: '阪急与大阪单轨南茨木站周边',
                ja: '阪急・大阪モノレール南茨木駅周辺'
            }
        },
        {
            id: 'tenroku',
            name: {
                zh: '天六商店街修复区',
                ja: '天六商店街修復エリア'
            },
            center: [34.7106, 135.5108],
            radius: 480,
            requiredPoints: 8,
            description: {
                zh: '天神橋筋六丁目周边',
                ja: '天神橋筋六丁目周辺'
            }
        },
        {
            id: 'ogimachi_park',
            name: {
                zh: '扇町公园修复区',
                ja: '扇町公園修復エリア'
            },
            center: [34.70413, 135.50915],
            radius: 430,
            requiredPoints: 6,
            description: {
                zh: '扇町公园与周边生活设施',
                ja: '扇町公園と周辺生活施設'
            }
        },
        {
            id: 'nakazakicho',
            name: {
                zh: '中崎町路地修复区',
                ja: '中崎町路地修復エリア'
            },
            center: [34.7068, 135.5051],
            radius: 430,
            requiredPoints: 7,
            description: {
                zh: '中崎町站、巷道与小店周边',
                ja: '中崎町駅、路地、小店舗周辺'
            }
        },
        {
            id: 'umeda',
            name: {
                zh: '梅田地下街修复区',
                ja: '梅田地下街修復エリア'
            },
            center: [34.7025, 135.4959],
            radius: 560,
            requiredPoints: 12,
            description: {
                zh: '大阪站、梅田商业与交通节点',
                ja: '大阪駅、梅田商業地、交通結節点'
            }
        },
        {
            id: 'minamimorimachi',
            name: {
                zh: '南森町生活修复区',
                ja: '南森町生活修復エリア'
            },
            center: [34.6977, 135.5115],
            radius: 460,
            requiredPoints: 8,
            description: {
                zh: '南森町、大阪天满宫与生活街区',
                ja: '南森町、大阪天満宮、生活街区'
            }
        },
        {
            id: 'kyoto_station',
            name: {
                zh: '京都站交通修复区',
                ja: '京都駅交通修復エリア'
            },
            center: [34.9858, 135.7588],
            radius: 540,
            requiredPoints: 10,
            description: {
                zh: '京都站与八条口周边',
                ja: '京都駅と八条口周辺'
            }
        },
        {
            id: 'nishiki_market',
            name: {
                zh: '锦市场商店街修复区',
                ja: '錦市場商店街修復エリア'
            },
            center: [35.0050, 135.7648],
            radius: 500,
            requiredPoints: 8,
            description: {
                zh: '锦市场、四条与商业街周边',
                ja: '錦市場、四条、商店街周辺'
            }
        },
        {
            id: 'gion',
            name: {
                zh: '祇园街路修复区',
                ja: '祇園街路修復エリア'
            },
            center: [35.0037, 135.7750],
            radius: 480,
            requiredPoints: 7,
            description: {
                zh: '祇园四条与花见小路周边',
                ja: '祇園四条と花見小路周辺'
            }
        },
        {
            id: 'fushimi_inari',
            name: {
                zh: '伏见稻荷修复区',
                ja: '伏見稲荷修復エリア'
            },
            center: [34.9671, 135.7727],
            radius: 560,
            requiredPoints: 6,
            description: {
                zh: '伏见稻荷、稻荷站与参道周边',
                ja: '伏見稲荷、稲荷駅、参道周辺'
            }
        },
        {
            id: 'nijo_castle',
            name: {
                zh: '二条城周边修复区',
                ja: '二条城周辺修復エリア'
            },
            center: [35.0142, 135.7480],
            radius: 560,
            requiredPoints: 6,
            description: {
                zh: '二条城、二条站与周边街区',
                ja: '二条城、二条駅、周辺街区'
            }
        }
    ];
    const OIC_DEMO_AREA_IDS = new Set([
        'ritsumeikan_oic',
        'ibarakishi_station_west',
        'aeon_ibaraki',
        'minami_ibaraki_station'
    ]);
    const AREA_URL_PARAMS = ['area', 'testArea', 'demoArea'];
    let map = null;
    let playerMarker = null;
    let dynamicMarkersLayer = null;
    let radarLayer = null;
    let fogCanvas = null;
    let fogContext = null;
    let areaLayer = null;
    let areaProgress = {};
    let explorerProgress = { xp: 0, coins: 0, discoveredSpotKeys: [] };
    let allSpots = [];
    let catSpawnTimer = null;
    let activeCatMarker = null;
    let statusText = null;
    let hasCenteredOnPlayer = false;

    function escapeAttribute(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function tr(key, params = {}) {
        return SM.i18n?.t?.(key, params) || key;
    }

    function loadExplorerProgress() {
        try {
            const rawProgress = localStorage.getItem(EXPLORER_PROGRESS_STORAGE_KEY);
            const parsed = rawProgress ? JSON.parse(rawProgress) : {};
            explorerProgress = {
                xp: Number(parsed?.xp || 0),
                coins: Number(parsed?.coins || 0),
                discoveredSpotKeys: Array.isArray(parsed?.discoveredSpotKeys) ? parsed.discoveredSpotKeys : []
            };
        } catch (error) {
            console.warn('读取探索进度失败，使用空进度。', error);
            explorerProgress = { xp: 0, coins: 0, discoveredSpotKeys: [] };
        }
        state.explorerProgress = explorerProgress;
    }

    function saveExplorerProgress() {
        try {
            localStorage.setItem(EXPLORER_PROGRESS_STORAGE_KEY, JSON.stringify(explorerProgress));
        } catch (error) {
            console.warn('保存探索进度失败。', error);
        }
    }

    function getExplorerConfig() {
        const xp = Number(explorerProgress.xp || 0);
        let config = EXPLORER_LEVELS[0];
        for (const levelConfig of EXPLORER_LEVELS) {
            if (xp >= levelConfig.xp) {
                config = levelConfig;
            }
        }
        return config;
    }

    function getNextExplorerConfig() {
        const currentLevel = getExplorerConfig().level;
        return EXPLORER_LEVELS.find(levelConfig => levelConfig.level > currentLevel) || null;
    }

    function updatePlayerProgressDisplay() {
        const levelLabel = document.getElementById('player-level-label');
        const coinsLabel = document.getElementById('player-coins-label');
        const expLabel = document.getElementById('player-exp-label');
        const expFill = document.getElementById('player-exp-fill');
        if (!levelLabel || !coinsLabel || !expLabel || !expFill) return;

        const config = getExplorerConfig();
        const nextConfig = getNextExplorerConfig();
        const xp = Number(explorerProgress.xp || 0);
        const coins = Number(explorerProgress.coins || 0);
        const currentLevelXp = config.xp;
        const nextLevelXp = nextConfig?.xp ?? currentLevelXp;
        const levelSpan = Math.max(1, nextLevelXp - currentLevelXp);
        const progress = nextConfig ? Math.max(0, Math.min(1, (xp - currentLevelXp) / levelSpan)) : 1;

        levelLabel.innerText = `Lv.${config.level}`;
        coinsLabel.innerText = `${coins} ${tr('coinsLabel')}`;
        expLabel.innerText = nextConfig
            ? `EXP ${xp - currentLevelXp}/${levelSpan}`
            : tr('maxLevelLabel');
        expFill.style.width = `${Math.round(progress * 100)}%`;
    }

    function addExplorerReward({ xp = 0, coins = 0, showToast = false } = {}) {
        const beforeLevel = getExplorerConfig().level;
        explorerProgress.xp = Number(explorerProgress.xp || 0) + Number(xp || 0);
        explorerProgress.coins = Number(explorerProgress.coins || 0) + Number(coins || 0);
        const afterConfig = getExplorerConfig();
        saveExplorerProgress();
        updatePlayerProgressDisplay();
        updateRadarDisplay();
        drawFog();

        if (showToast && (xp || coins)) {
            SM.ui?.showToast(tr('questRewardToast', {
                xp: Number(xp || 0),
                coins: Number(coins || 0)
            }), { type: 'success', duration: 2400 });
        }

        if (afterConfig.level > beforeLevel) {
            SM.ui?.showGuideMessage?.(tr('mimiLevelTip', {
                level: afterConfig.level,
                radius: afterConfig.scanRadius
            }), { type: 'success', duration: 3400 });
        }
    }

    function addExplorerXp(points = 1) {
        addExplorerReward({ xp: points, coins: 0 });
    }

    function grantExplorerReward(reward = {}) {
        const normalizedReward = typeof reward === 'string'
            ? QUEST_REWARDS[reward]
            : reward.type
                ? QUEST_REWARDS[reward.type]
                : reward;
        addExplorerReward({
            xp: Number(normalizedReward?.xp || 0),
            coins: Number(normalizedReward?.coins || 0),
            showToast: true
        });
    }

    function getQuestReward(rarity) {
        return QUEST_REWARDS[rarity] || QUEST_REWARDS.N;
    }

    function getSpotDiscoveryKey(spot) {
        if (!spot) return '';
        return spot.id || `${spot.type}_${spot.name}_${Number(spot.lat).toFixed(5)}_${Number(spot.lng).toFixed(5)}`;
    }

    function markSpotDiscovered(spot) {
        const key = getSpotDiscoveryKey(spot);
        if (!key || explorerProgress.discoveredSpotKeys.includes(key)) return false;
        explorerProgress.discoveredSpotKeys.push(key);
        saveExplorerProgress();
        return true;
    }

    function getLangValue(value) {
        if (!value || typeof value !== 'object') return value || '';
        const lang = SM.i18n?.getLang?.() || state.currentLang || 'zh';
        return value[lang] || value.zh || value.ja || '';
    }

    function getAreaName(area) {
        return getLangValue(area?.name);
    }

    function createCompletedQuestMarker(spot) {
        const completedMarker = L.marker([spot.lat, spot.lng], { icon: SM.quests.createCompletedMarkerIcon() });
        completedMarker.spotData = spot;
        return completedMarker;
    }

    function getRequestedDemoArea() {
        if (!state.devMode) return null;

        const params = new URLSearchParams(window.location.search);
        const areaId = AREA_URL_PARAMS
            .map(key => params.get(key))
            .find(Boolean);

        if (!areaId) return null;
        return GAME_AREAS.find(area => area.id === areaId) || null;
    }

    function getRequestedDemoHeading() {
        if (!state.devMode) return null;
        const params = new URLSearchParams(window.location.search);
        return normalizeHeading(params.get('heading') ?? params.get('demoHeading'));
    }

    function getDefaultCenterConfig() {
        const requestedArea = getRequestedDemoArea();
        if (requestedArea) {
            return {
                center: [...requestedArea.center],
                area: requestedArea,
                forcedDemo: true,
                zoom: requestedArea.zoom || DEFAULT_ZOOM,
                heading: getRequestedDemoHeading()
            };
        }

        const defaultDemoArea = state.devMode ? getAreaById(DEFAULT_DEMO_AREA_ID) : null;
        if (defaultDemoArea) {
            return {
                center: [...defaultDemoArea.center],
                area: defaultDemoArea,
                forcedDemo: true,
                zoom: defaultDemoArea.zoom || DEFAULT_ZOOM,
                heading: getRequestedDemoHeading()
            };
        }

        return {
            center: [...DEFAULT_CENTER],
            area: null,
            forcedDemo: false,
            zoom: DEFAULT_ZOOM,
            heading: getRequestedDemoHeading()
        };
    }

    function setDemoPosition(message) {
        const center = state.defaultCenter || DEFAULT_CENTER;
        statusText.innerText = message;
        setPlayerPosition(center[0], center[1], 'demo', state.defaultHeading);
        updateMapBounds(center[0], center[1]);
        map.setView(center, state.defaultZoom || DEFAULT_ZOOM);
        scheduleRandomCatSpawn();
        updateVisibleSpots(center[0], center[1]);
    }

    function normalizeHeading(value) {
        const heading = Number(value);
        if (!Number.isFinite(heading) || heading < 0) return null;
        return ((heading % 360) + 360) % 360;
    }

    function inferHeadingFromMovement(previousPosition, lat, lng) {
        if (!previousPosition || previousPosition.source !== 'gps') return null;
        const distance = L.latLng(previousPosition.lat, previousPosition.lng).distanceTo([lat, lng]);
        if (distance < 4) return null;
        return getBearingDegrees(previousPosition.lat, previousPosition.lng, lat, lng);
    }

    function createPlayerMarkerIcon(source = 'gps', heading = null) {
        const demoClass = source === 'gps' ? '' : ' demo';
        const normalizedHeading = normalizeHeading(heading);
        const headingClass = normalizedHeading == null ? '' : ' has-heading';
        const headingArrow = normalizedHeading == null
            ? ''
            : `<span class="player-heading-arrow" style="transform: translate(-50%, -50%) rotate(${normalizedHeading.toFixed(1)}deg);"></span>`;
        return L.divIcon({
            className: 'player-position-marker',
            html: `<div class="player-location-dot${demoClass}${headingClass}">${headingArrow}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
    }

    function initFogCanvas() {
        fogCanvas = document.getElementById('fog-canvas');
        if (!fogCanvas) {
            fogCanvas = document.createElement('canvas');
            fogCanvas.id = 'fog-canvas';
            fogCanvas.setAttribute('aria-hidden', 'true');
            document.body.appendChild(fogCanvas);
        }
        fogContext = fogCanvas.getContext('2d');
        window.addEventListener('resize', drawFog);
        map.on('move zoom resize', drawFog);
        drawFog();
    }

    function metersToPixels(meters, latLng) {
        if (!map || !latLng) return meters;

        const lat = latLng.lat ?? latLng[0];
        const lng = latLng.lng ?? latLng[1];
        const lngOffset = meters / (111320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
        const pointA = map.latLngToContainerPoint([lat, lng]);
        const pointB = map.latLngToContainerPoint([lat, lng + lngOffset]);
        return Math.max(1, Math.abs(pointB.x - pointA.x));
    }

    function clearFogCircle(point, radius, feather = 24) {
        if (!fogContext || !point) return;

        const gradient = fogContext.createRadialGradient(
            point.x,
            point.y,
            Math.max(1, radius - feather),
            point.x,
            point.y,
            radius
        );
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        fogContext.fillStyle = gradient;
        fogContext.beginPath();
        fogContext.arc(point.x, point.y, radius, 0, Math.PI * 2);
        fogContext.fill();
    }

    function drawFog() {
        if (!fogCanvas || !fogContext || !map) return;

        const width = window.innerWidth || document.documentElement.clientWidth;
        const height = window.innerHeight || document.documentElement.clientHeight;
        const pixelRatio = window.devicePixelRatio || 1;
        const canvasWidth = Math.round(width * pixelRatio);
        const canvasHeight = Math.round(height * pixelRatio);

        if (fogCanvas.width !== canvasWidth || fogCanvas.height !== canvasHeight) {
            fogCanvas.width = canvasWidth;
            fogCanvas.height = canvasHeight;
            fogCanvas.style.width = `${width}px`;
            fogCanvas.style.height = `${height}px`;
        }

        fogContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        fogContext.clearRect(0, 0, width, height);
        fogContext.fillStyle = 'rgba(9, 18, 22, 0.58)';
        fogContext.fillRect(0, 0, width, height);

        fogContext.save();
        fogContext.globalCompositeOperation = 'destination-out';

        if (state.lastPlayerPosition) {
            const config = getExplorerConfig();
            const latLng = { lat: state.lastPlayerPosition.lat, lng: state.lastPlayerPosition.lng };
            const point = map.latLngToContainerPoint([latLng.lat, latLng.lng]);
            const radius = metersToPixels(config.scanRadius, latLng);
            clearFogCircle(point, radius, 34);
        }

        fogContext.restore();
    }

    function setPlayerPosition(lat, lng, source = 'gps', heading = null) {
        const previousPosition = state.lastPlayerPosition;
        const reportedHeading = normalizeHeading(heading);
        const movementHeading = reportedHeading == null
            ? inferHeadingFromMovement(previousPosition, lat, lng)
            : null;
        const playerHeading = reportedHeading != null
            ? reportedHeading
            : source === 'gps'
                ? movementHeading ?? state.playerHeading ?? null
                : null;

        state.playerHeading = playerHeading;
        state.lastPlayerPosition = { lat, lng, source, heading: playerHeading };

        if (!playerMarker) {
            playerMarker = L.marker([lat, lng], {
                icon: createPlayerMarkerIcon(source, playerHeading),
                keyboard: false,
                interactive: false,
                zIndexOffset: 1000
            }).addTo(map);
            updateRadarDisplay();
            drawFog();
            return;
        }

        playerMarker.setLatLng([lat, lng]);
        playerMarker.setIcon(createPlayerMarkerIcon(source, playerHeading));
        updateRadarDisplay();
        drawFog();
    }

    function updateRadarDisplay() {
        if (!map || !state.lastPlayerPosition) return;

        const config = getExplorerConfig();
        const center = [state.lastPlayerPosition.lat, state.lastPlayerPosition.lng];
        if (!radarLayer) {
            radarLayer = L.layerGroup().addTo(map);
        }

        radarLayer.clearLayers();

    }

    function loadAreaProgress() {
        try {
            const rawProgress = localStorage.getItem(AREA_PROGRESS_STORAGE_KEY);
            areaProgress = rawProgress ? JSON.parse(rawProgress) || {} : {};
        } catch (error) {
            console.warn('读取区域进度失败，使用空进度。', error);
            areaProgress = {};
        }
    }

    function saveAreaProgress() {
        try {
            localStorage.setItem(AREA_PROGRESS_STORAGE_KEY, JSON.stringify(areaProgress));
        } catch (error) {
            console.warn('保存区域进度失败。', error);
        }
    }

    function getContainingAreas(spot) {
        if (!spot) return [];

        return GAME_AREAS
            .map(area => {
                const distance = L.latLng(area.center).distanceTo([spot.lat, spot.lng]);
                return {
                    area,
                    distance,
                    radiusRatio: distance / area.radius
                };
            })
            .filter(item => item.distance <= item.area.radius)
            .sort((a, b) => a.radiusRatio - b.radiusRatio || a.distance - b.distance)
            .map(item => item.area);
    }

    function getSpotArea(spot) {
        return getContainingAreas(spot)[0] || null;
    }

    function getAreaById(areaId) {
        if (!areaId) return null;
        return GAME_AREAS.find(area => area.id === areaId) || null;
    }

    function getNearestArea(lat, lng, maxDistance = CAT_NEARBY_AREA_RADIUS_METERS) {
        if (lat == null || lng == null) return null;

        let nearest = null;
        let nearestDistance = Infinity;
        GAME_AREAS.forEach(area => {
            const distance = L.latLng(area.center).distanceTo([lat, lng]);
            if (distance < nearestDistance) {
                nearest = area;
                nearestDistance = distance;
            }
        });

        return nearestDistance <= maxDistance ? nearest : null;
    }

    function getAreaRecord(area) {
        const record = areaProgress[area.id] || {};
        areaProgress[area.id] = {
            completedSpotKeys: Array.isArray(record.completedSpotKeys) ? record.completedSpotKeys : [],
            repairPoints: Number(record.repairPoints || 0),
            completedRewards: record.completedRewards && typeof record.completedRewards === 'object' ? record.completedRewards : {},
            purified: Boolean(record.purified)
        };
        return areaProgress[area.id];
    }

    function getAreaRepairPoints(area) {
        return getAreaRecord(area).repairPoints;
    }

    function getRepairPointsForRarity(rarity) {
        return RARITY_REPAIR_POINTS[rarity] || RARITY_REPAIR_POINTS.N;
    }

    function updateAreaDisplay() {
        if (!areaLayer) return;

        areaLayer.eachLayer(layer => {
            const area = layer.areaData;
            if (!area || !layer.getTooltip) return;

            const points = getAreaRepairPoints(area);
            const record = getAreaRecord(area);
            const areaName = getAreaName(area);
            const label = record.purified
                ? tr('areaComplete', { area: areaName })
                : tr('areaProgress', {
                    area: areaName,
                    points: Math.min(points, area.requiredPoints),
                    required: area.requiredPoints
                });
            layer.setStyle?.({
                color: record.purified ? '#0f766e' : '#b7791f',
                fillColor: record.purified ? '#d7e8e4' : '#f6e7c8',
                fillOpacity: record.purified ? 0.08 : 0.025
            });
            layer.bindTooltip(label, {
                permanent: true,
                direction: 'top',
                className: 'area-label',
                interactive: false,
                offset: [0, -28],
                opacity: 0.9
            });
        });
    }

    function initAreas() {
        loadAreaProgress();
        areaLayer = L.layerGroup().addTo(map);

        const visibleAreas = state.forcedDemoArea?.id === 'ritsumeikan_oic'
            ? GAME_AREAS.filter(area => OIC_DEMO_AREA_IDS.has(area.id))
            : state.forcedDemoArea ? [state.forcedDemoArea] : GAME_AREAS;
        visibleAreas.forEach(area => {
            const circle = L.circle(area.center, {
                radius: area.radius,
                color: '#b7791f',
                weight: 1,
                fillColor: '#f6e7c8',
                fillOpacity: 0.025,
                dashArray: '14 12',
                interactive: false,
                pane: 'areaPane',
                className: 'repair-area-circle'
            });
            circle.areaData = area;
            areaLayer.addLayer(circle);
        });

        updateAreaDisplay();
    }

    function applyAreaRepair(area, questOrSpot, earnedPoints, rewardKey) {
        if (!area || !SM.quests) return null;

        const rarity = questOrSpot?.rarity || questOrSpot?.questData?.rarity || 'N';
        const record = getAreaRecord(area);
        const spot = questOrSpot?.spot || questOrSpot;
        const spotKey = rewardKey || SM.quests.getSpotKey(spot);
        const previousPoints = record.completedRewards[spotKey] || 0;
        let addedPoints = 0;

        if (!previousPoints) {
            record.completedSpotKeys.push(spotKey);
            record.completedRewards[spotKey] = earnedPoints;
            record.repairPoints += earnedPoints;
            addedPoints = earnedPoints;
        }

        const wasPurified = record.purified;
        if (record.repairPoints >= area.requiredPoints) {
            record.purified = true;
        }

        saveAreaProgress();
        updateAreaDisplay();

        return {
            area,
            rarity,
            addedPoints,
            earnedPoints,
            repairPoints: record.repairPoints,
            requiredPoints: area.requiredPoints,
            purified: record.purified,
            justPurified: record.purified && !wasPurified
        };
    }

    function recordQuestComplete(questOrSpot) {
        const spot = questOrSpot?.spot || questOrSpot;
        const rarity = questOrSpot?.rarity || questOrSpot?.questData?.rarity || 'N';
        const questReward = getQuestReward(rarity);
        const area = getSpotArea(spot);
        if (!area || !SM.quests) {
            addExplorerReward({ ...questReward, showToast: true });
            return {
                area: null,
                rarity,
                xp: questReward.xp,
                coins: questReward.coins,
                addedPoints: 0,
                earnedPoints: 0,
                outsideArea: true
            };
        }

        const earnedPoints = getRepairPointsForRarity(rarity);
        const result = applyAreaRepair(area, questOrSpot, earnedPoints);
        if (result?.addedPoints) {
            addExplorerReward({ ...questReward, showToast: true });
        }
        return result;
    }

    function recordCatComplete(questOrSpot) {
        const spot = questOrSpot?.spot || questOrSpot;
        const area = getAreaById(spot?.areaId)
            || getSpotArea(spot)
            || getSpotArea(state.lastPlayerPosition)
            || getNearestArea(spot?.lat ?? state.lastPlayerPosition?.lat, spot?.lng ?? state.lastPlayerPosition?.lng);

        if (!area) {
            return {
                area: null,
                rarity: questOrSpot?.rarity || 'SSR',
                addedPoints: 0,
                earnedPoints: 0,
                outsideArea: true,
                isCat: true
            };
        }

        const rewardKey = `cat_help_${spot?.id || Date.now()}`;
        const result = {
            ...applyAreaRepair(area, questOrSpot, CAT_REPAIR_POINTS, rewardKey),
            isCat: true
        };
        if (result?.addedPoints) {
            addExplorerReward({ ...QUEST_REWARDS.npc, showToast: true });
        }
        return result;
    }

    function createSignalMarker(spot, config) {
        const icon = L.divIcon({
            className: 'custom-marker signal-marker',
            html: `<div class="signal-dot" data-spot-type="${escapeAttribute(spot.type)}" data-spot-name="${escapeAttribute(spot.name)}">?</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        const marker = L.marker([spot.lat, spot.lng], { icon });
        marker.spotData = spot;
        marker.on('click', () => {});
        return marker;
    }

    function createDistantSignalMarker(playerLat, playerLng, targetSpot, config) {
        const icon = L.divIcon({
            className: 'custom-marker distant-signal-marker',
            html: `<div class="distant-signal-dot" data-spot-type="${escapeAttribute(targetSpot.type)}" data-spot-name="${escapeAttribute(targetSpot.name)}">?</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        const marker = L.marker([targetSpot.lat, targetSpot.lng], {
            icon,
            opacity: 0.78,
            zIndexOffset: -80
        });
        marker.spotData = targetSpot;
        marker.on('click', () => {});
        return marker;
    }

    function getBearingDegrees(fromLat, fromLng, toLat, toLng) {
        return (Math.atan2(toLng - fromLng, toLat - fromLat) * 180 / Math.PI + 360) % 360;
    }

    function getAngleDistanceDegrees(angleA, angleB) {
        const diff = Math.abs(angleA - angleB) % 360;
        return Math.min(diff, 360 - diff);
    }

    function getDirectionLabel(fromLat, fromLng, toLat, toLng) {
        const degrees = getBearingDegrees(fromLat, fromLng, toLat, toLng);
        const lang = SM.i18n?.getLang?.() || 'zh';
        const labels = lang === 'ja'
            ? ['北', '北東', '東', '南東', '南', '南西', '西', '北西']
            : ['北边', '东北边', '东边', '东南边', '南边', '西南边', '西边', '西北边'];
        return labels[Math.round(degrees / 45) % 8];
    }

    function getDistantSpotsOutsideScan(playerLat, playerLng, config, limit = MAX_DISTANT_SIGNALS) {
        const playerLocation = L.latLng(playerLat, playerLng);
        const selected = [];
        const selectedAngles = [];

        const candidates = allSpots
            .map(spot => ({ ...spot, distance: playerLocation.distanceTo([spot.lat, spot.lng]) }))
            .filter(spot => spot.distance >= config.scanRadius)
            .sort((a, b) => a.distance - b.distance);

        for (const spot of candidates) {
            if (selected.length >= limit) break;
            const angle = getBearingDegrees(playerLat, playerLng, spot.lat, spot.lng);
            const isFarEnough = selectedAngles.every(existingAngle => {
                return getAngleDistanceDegrees(angle, existingAngle) >= MIN_DISTANT_SIGNAL_ANGLE_DEGREES;
            });
            if (!isFarEnough) continue;

            selected.push(spot);
            selectedAngles.push(angle);
        }

        if (selected.length === 0 && candidates[0]) {
            selected.push(candidates[0]);
        }

        return selected;
    }

    function hasCompletedTutorialPenQuest() {
        try {
            return localStorage.getItem(TUTORIAL_PEN_COMPLETE_KEY) === '1';
        } catch (error) {
            return false;
        }
    }

    function getOffsetPosition(lat, lng, northMeters, eastMeters) {
        const latOffset = northMeters / 111320;
        const lngScale = Math.max(0.2, Math.cos(lat * Math.PI / 180));
        const lngOffset = eastMeters / (111320 * lngScale);
        return { lat: lat + latOffset, lng: lng + lngOffset };
    }

    function getTutorialPenSpot(playerLat, playerLng) {
        if (hasCompletedTutorialPenQuest()) return null;

        const position = getOffsetPosition(playerLat, playerLng, TUTORIAL_PEN_OFFSET_METERS, TUTORIAL_PEN_OFFSET_METERS * 0.45);
        return {
            id: TUTORIAL_PEN_SPOT_ID,
            lat: position.lat,
            lng: position.lng,
            distance: L.latLng(playerLat, playerLng).distanceTo([position.lat, position.lng]),
            type: 'tutorial_pen',
            questTag: 'Item',
            emoji: 'P',
            name: tr('tutorialPracticeSpotName'),
            questData: {
                rarity: 'N',
                text: '[ ? ] を持っています。',
                grammar: 'N を持っています',
                instruction: tr('tutorialPracticeInstruction'),
                level: state.currentLevel || 'N5',
                requiredTag: 'Item',
                rewardCount: 1,
                config: {
                    color: '#0f766e',
                    label: 'Practice',
                    scale: 1
                }
            }
        };
    }

    function createPoiMarker(spot) {
        const questState = SM.quests.getQuestStateForSpot(spot);
        if (questState.status === 'completed') {
            return createCompletedQuestMarker(spot);
        }

        const markerQuestData = questState.questData;
        const explorerConfig = getExplorerConfig();
        const distanceToPlayer = Number(spot.distance ?? (
            state.lastPlayerPosition
                ? L.latLng(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng).distanceTo([spot.lat, spot.lng])
                : Infinity
        ));
        const isInteractable = distanceToPlayer <= explorerConfig.unlockRadius;
        const config = markerQuestData.config
            || SM.quests.RARITY_CONFIG[markerQuestData.rarity]
            || SM.quests.RARITY_CONFIG.N;
        const isTutorialMarker = spot.type === 'tutorial_pen';
        const size = spot.type === 'npc_cat' ? 36 : isTutorialMarker ? 34 : 30;
        const spotTypeAttr = escapeAttribute(spot.type);
        const spotNameAttr = escapeAttribute(spot.name);
        const isSrMarker = markerQuestData.rarity === 'SR';
        const markerBackground = isTutorialMarker
            ? 'radial-gradient(circle at 32% 24%, #d1fff7 0%, #21b7a2 38%, #0f766e 100%)'
            : isSrMarker
            ? 'radial-gradient(circle at 30% 24%, #fff8b8 0%, #f6d84a 34%, #d69a14 72%, #9c6507 100%)'
            : config.color;
        const markerBorder = isTutorialMarker ? '2px solid #e6fffb' : isSrMarker ? '2px solid #fff4b0' : '2px solid white';
        const markerShadow = isTutorialMarker
            ? '0 0 0 3px rgba(255,255,255,0.7), 0 0 18px rgba(15,118,110,0.88), 0 4px 14px rgba(8,75,68,0.28)'
            : isSrMarker
            ? '0 0 0 3px rgba(255,255,255,0.7), 0 0 18px rgba(246,199,68,0.95), 0 4px 14px rgba(120,80,0,0.32)'
            : `0 0 10px ${config.color}`;
        const markerTextShadow = isSrMarker || isTutorialMarker ? '0 1px 3px rgba(0,0,0,0.35)' : 'none';
        const markerOpacity = isInteractable ? '1' : '0.62';
        const sparkleHtml = isSrMarker
            ? '<span style="position:absolute; top:3px; right:5px; font-size:10px; line-height:1; color:#fff8b8; text-shadow:0 0 5px rgba(255,255,255,0.9);">✦</span>'
            : '';

        let iconHtml = "";
        if (spot.type === 'npc_cat') {
            iconHtml = `<div data-spot-type="${spotTypeAttr}" data-spot-name="${spotNameAttr}" style="font-size: 28px; text-align: center; line-height: ${size}px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">🐱</div>`;
        } else {
            iconHtml = `<div data-spot-type="${spotTypeAttr}" data-spot-name="${spotNameAttr}" style="
                position: relative;
                background: ${markerBackground};
                width: 100%; height: 100%;
                border-radius: 50%;
                border: ${markerBorder};
                display: flex; align-items: center; justify-content: center;
                color: white; font-weight: bold; font-size: 10px;
                text-shadow: ${markerTextShadow};
                box-shadow: ${markerShadow};
                opacity: ${markerOpacity};">
                <span style="position: relative; z-index: 1;">${isTutorialMarker ? 'P' : markerQuestData.rarity}</span>
                ${sparkleHtml}
            </div>`;
        }

        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: iconHtml,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });

        const marker = L.marker([spot.lat, spot.lng], { icon: customIcon });
        marker.spotData = spot;
        marker.questData = markerQuestData;

        marker.on('click', () => {
            if (!isInteractable) {
                return;
            }
            openQuestUI(marker.questData, spot, marker);
        });

        return marker;
    }

    function openQuestUI(data, spot, marker) {
        const questLayer = document.getElementById('quest-layer');
        const questTitle = questLayer.querySelector('.quest-content h3');
        const repairPointsChip = questLayer.querySelector('#quest-repair-points');
        const preview = questLayer.querySelector('.sentence-preview');
        const repairPoints = getRepairPointsForRarity(data.rarity);
        const isCatQuest = spot.type === 'npc_cat';
        const isTutorialQuest = spot.type === 'tutorial_pen';
        const targetArea = isCatQuest
            ? getAreaById(spot.areaId) || getSpotArea(spot) || getSpotArea(state.lastPlayerPosition) || getNearestArea(spot.lat, spot.lng)
            : isTutorialQuest
                ? null
            : getSpotArea(spot);

        questTitle.innerText = tr('questTitle', { rarity: data.rarity });
        questTitle.style.color = data.config.color;
        if (repairPointsChip) {
            repairPointsChip.hidden = isTutorialQuest;
            repairPointsChip.classList.toggle('outside', !isTutorialQuest && !isCatQuest && !targetArea);
            repairPointsChip.classList.toggle('special', isCatQuest || isTutorialQuest);
            repairPointsChip.innerText = isTutorialQuest
                ? ''
                : isCatQuest
                    ? tr('questCatPoints', { points: CAT_REPAIR_POINTS })
                    : targetArea
                    ? tr('questAreaPoints', { points: repairPoints })
                    : tr('questOutside');
        }
        preview.innerHTML = data.text.replace('[ ? ]', '<span class="slot-box">?</span>');

        state.activeQuest = {
            type: spot.type === 'npc_cat' ? 'NPC' : spot.type === 'tutorial_pen' ? 'TUTORIAL' : 'POI',
            rarity: data.rarity,
            text: data.text,
            grammar: data.grammar,
            instruction: data.instruction,
            level: data.level,
            requiredTag: data.requiredTag,
            rewardCount: data.rewardCount,
            targetAreaId: targetArea?.id || null,
            spot,
            marker
        };

        document.querySelector('.location-tag').innerText = `${spot.emoji} ${spot.name}`;
        questLayer.classList.remove('hidden');
        if (isTutorialQuest) {
            SM.ui?.showGuideMessage?.(tr('mimiTutorialQuest'), { type: 'info', duration: 5200 });
        } else {
            SM.ui?.hideGuideMessage?.();
        }
    }

    async function loadOSMData() {
        try {
            const response = await fetch('spotsData.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error(tr('mapDataInvalid'));
            }

            allSpots = data;
            console.log(`✅ 成功加载了 ${allSpots.length} 个烘焙好的地标！`);
            updateVisibleSpots(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng);
        } catch (error) {
            console.error("加载数据失败", error);
            statusText.innerText = tr('mapDataFailed');
        }
    }

    function updateVisibleSpots(playerLat, playerLng) {
        if (allSpots.length === 0 || playerLat == null || playerLng == null) return;

        const explorerConfig = getExplorerConfig();
        const playerLocation = L.latLng(playerLat, playerLng);
        dynamicMarkersLayer.clearLayers();
        updateRadarDisplay();

        const nearbySpots = allSpots
            .map(spot => ({ ...spot, distance: playerLocation.distanceTo([spot.lat, spot.lng]) }))
            .filter(spot => spot.distance < explorerConfig.scanRadius)
            .sort((a, b) => a.distance - b.distance);
        const tutorialSpot = getTutorialPenSpot(playerLat, playerLng);
        if (tutorialSpot) {
            nearbySpots.splice(0, nearbySpots.length, tutorialSpot);
        }

        if (nearbySpots.length === 0) {
            const distantSpots = getDistantSpotsOutsideScan(playerLat, playerLng, explorerConfig);
            if (distantSpots.length) {
                distantSpots.forEach(spot => {
                    dynamicMarkersLayer.addLayer(createDistantSignalMarker(playerLat, playerLng, spot, explorerConfig));
                });
                state.visibleSpotKeys = distantSpots.map(spot => getSpotDiscoveryKey(spot)).filter(Boolean);
                state.visibleSpotsDebug = distantSpots.map(spot => ({
                    type: spot.type,
                    name: spot.name,
                    questTag: spot.questTag,
                    distantSignal: true,
                    distance: Math.round(spot.distance)
                }));
            }
            if (!distantSpots.length) {
                state.visibleSpotKeys = [];
                state.visibleSpotsDebug = [];
            }
            return;
        }

        const selectedSpots = [];
        const selectedByTag = {};
        const previousVisibleKeys = new Set(state.visibleSpotKeys || []);

        function isFarEnoughFromAllSpots(spot) {
            return selectedSpots.every(selected => {
                return L.latLng(selected.lat, selected.lng).distanceTo([spot.lat, spot.lng]) >= MIN_ANY_SPOT_DISTANCE_METERS;
            });
        }

        function isFarEnoughFromSameTag(spot) {
            return selectedSpots.every(selected => {
                if (selected.questTag !== spot.questTag) return true;
                return L.latLng(selected.lat, selected.lng).distanceTo([spot.lat, spot.lng]) >= MIN_SAME_TAG_DISTANCE_METERS;
            });
        }

        function trySelectSpot(spot, { enforceAnyDistance = true, enforceSameTagDistance = true, ignoreTagLimit = false } = {}) {
            const tag = spot.questTag || spot.type || 'Other';
            selectedByTag[tag] = selectedByTag[tag] || 0;
            if (selectedSpots.length >= explorerConfig.maxVisible) return false;
            if (!ignoreTagLimit && selectedByTag[tag] >= MAX_SPOTS_PER_TAG) return false;
            if (selectedSpots.some(selected => selected.lat === spot.lat && selected.lng === spot.lng)) return false;
            if (enforceAnyDistance && !isFarEnoughFromAllSpots(spot)) return false;
            if (enforceSameTagDistance && !isFarEnoughFromSameTag(spot)) return false;

            selectedSpots.push(spot);
            selectedByTag[tag]++;
            return true;
        }

        for (const spot of nearbySpots) {
            if (selectedSpots.length >= explorerConfig.maxVisible) break;
            if (spot.distance <= explorerConfig.unlockRadius) {
                trySelectSpot(spot, {
                    enforceAnyDistance: false,
                    enforceSameTagDistance: false,
                    ignoreTagLimit: true
                });
            }
        }

        for (const spot of nearbySpots) {
            if (selectedSpots.length >= explorerConfig.maxVisible) break;
            if (previousVisibleKeys.has(getSpotDiscoveryKey(spot))) {
                trySelectSpot(spot, {
                    enforceAnyDistance: false,
                    enforceSameTagDistance: false,
                    ignoreTagLimit: true
                });
            }
        }

        for (const spot of nearbySpots) {
            const tag = spot.questTag || spot.type || 'Other';
            if (!selectedByTag[tag]) {
                trySelectSpot(spot, { enforceAnyDistance: true, enforceSameTagDistance: false });
            }
        }

        for (const spot of nearbySpots) {
            if (selectedSpots.length >= explorerConfig.maxVisible) break;
            if (spot.distance < explorerConfig.unlockRadius) {
                trySelectSpot(spot);
            }
        }

        const minimumVisible = Math.min(3, explorerConfig.maxVisible);
        if (selectedSpots.length < minimumVisible) {
            for (const spot of nearbySpots) {
                if (selectedSpots.length >= minimumVisible || selectedSpots.length >= explorerConfig.maxVisible) break;
                trySelectSpot(spot, { enforceAnyDistance: true, enforceSameTagDistance: false });
            }
        }

        state.visibleSpotsDebug = [];
        const currentVisibleKeys = [];
        let discoveredToastShown = false;

        selectedSpots.forEach(spot => {
            const isUnlocked = true;
            const marker = createPoiMarker(spot);
            if (marker) {
                dynamicMarkersLayer.addLayer(marker);
                currentVisibleKeys.push(getSpotDiscoveryKey(spot));
                if (isUnlocked && !discoveredToastShown && markSpotDiscovered(spot)) {
                    discoveredToastShown = true;
                    SM.ui?.showToast(tr('newPlaceFound', { place: spot.name }), { type: 'info', duration: 2400 });
                }
                const point = map.latLngToContainerPoint([spot.lat, spot.lng]);
                state.visibleSpotsDebug.push({
                    type: spot.type,
                    name: spot.name,
                    questTag: spot.questTag,
                    unlocked: isUnlocked,
                    distance: Math.round(spot.distance),
                    x: Math.round(point.x),
                    y: Math.round(point.y)
                });
            }
        });

        const distantHintCount = explorerConfig.distantHints || MAX_DISTANT_SIGNALS;
        getDistantSpotsOutsideScan(playerLat, playerLng, explorerConfig, distantHintCount).forEach(spot => {
            const marker = createDistantSignalMarker(playerLat, playerLng, spot, explorerConfig);
            dynamicMarkersLayer.addLayer(marker);
            currentVisibleKeys.push(getSpotDiscoveryKey(spot));
            state.visibleSpotsDebug.push({
                type: spot.type,
                name: spot.name,
                questTag: spot.questTag,
                distantSignal: true,
                distance: Math.round(spot.distance)
            });
        });
        state.visibleSpotKeys = currentVisibleKeys.filter(Boolean);

        console.log(`👀 雷达 Lv.${explorerConfig.level}: ${explorerConfig.scanRadius}m 视野，生成 ${selectedSpots.length} 个信号`, selectedByTag);
    }

    function removeMarkerForSpot(spot) {
        let actualMarkerOnMap = null;
        dynamicMarkersLayer.eachLayer(layer => {
            if (layer.spotData && layer.spotData.lat === spot.lat && layer.spotData.lng === spot.lng) {
                actualMarkerOnMap = layer;
            }
        });

        if (!actualMarkerOnMap) return;

        const iconElement = actualMarkerOnMap._icon;
        if (iconElement) {
            iconElement.classList.add('marker-destroy-fx');
            setTimeout(() => {
                dynamicMarkersLayer.removeLayer(actualMarkerOnMap);
            }, 600);
        } else {
            dynamicMarkersLayer.removeLayer(actualMarkerOnMap);
        }
    }

    function getRandomCatDelay() {
        const min = state.devMode ? CAT_SPAWN_DELAY_MS.devMin : CAT_SPAWN_DELAY_MS.min;
        const max = state.devMode ? CAT_SPAWN_DELAY_MS.devMax : CAT_SPAWN_DELAY_MS.max;
        return Math.round(min + Math.random() * (max - min));
    }

    function scheduleRandomCatSpawn() {
        if (catSpawnTimer || activeCatMarker || !playerMarker) return;

        catSpawnTimer = window.setTimeout(() => {
            catSpawnTimer = null;
            spawnTestCat();
        }, getRandomCatDelay());
    }

    function spawnTestCat() {
        if (!playerMarker || activeCatMarker) return;

        const playerPos = playerMarker.getLatLng();
        const angle = Math.random() * Math.PI * 2;
        const distanceMeters = 55 + Math.random() * 75;
        const latOffset = Math.cos(angle) * distanceMeters / 111320;
        const lngOffset = Math.sin(angle) * distanceMeters / (111320 * Math.max(0.2, Math.cos(playerPos.lat * Math.PI / 180)));
        const catLat = playerPos.lat + latOffset;
        const catLng = playerPos.lng + lngOffset;
        const spotKey = `cat_${Date.now()}`;
        const targetArea = getSpotArea({ lat: catLat, lng: catLng })
            || getSpotArea({ lat: playerPos.lat, lng: playerPos.lng })
            || getNearestArea(playerPos.lat, playerPos.lng);

        const spotData = {
            lat: catLat,
            lng: catLng,
            type: 'npc_cat',
            id: spotKey,
            areaId: targetArea?.id || null,
            name: tr('catName'),
            emoji: "🐱",
            questTag: "Food"
        };

        const markerQuestData = SM.quests.buildCatQuestData();
        SM.quests.questCache[spotKey] = markerQuestData;
        SM.quests.saveQuestCache();

        const catIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="font-size: 32px; text-align: center; animation: pulse 1.5s infinite; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.4)); cursor: pointer;">🐱</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        const marker = L.marker([catLat, catLng], { icon: catIcon }).addTo(map);
        activeCatMarker = marker;
        marker.questData = markerQuestData;
        marker.spotData = spotData;
        marker.on('click', () => {
            openQuestUI(marker.questData, spotData, marker);
        });
    }

    function clearCatEvent(marker) {
        if (marker && map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
        if (!marker || marker === activeCatMarker) {
            activeCatMarker = null;
        }
        scheduleRandomCatSpawn();
    }

    function getLimitedBounds(lat, lng) {
        const center = L.latLng(lat, lng);
        const latOffset = MAP_BOUNDS_RADIUS_METERS / 111320;
        const lngOffset = MAP_BOUNDS_RADIUS_METERS / (111320 * Math.max(0.2, Math.cos(center.lat * Math.PI / 180)));
        return L.latLngBounds(
            [center.lat - latOffset, center.lng - lngOffset],
            [center.lat + latOffset, center.lng + lngOffset]
        );
    }

    function updateMapBounds(lat, lng) {
        if (!map || lat == null || lng == null) return;
        const bounds = getLimitedBounds(lat, lng);
        map.setMaxBounds(bounds);
        state.mapBounds = bounds;
    }

    function focusOnPlayer(zoom = FOCUS_ZOOM) {
        if (!map || !state.lastPlayerPosition) return;
        const { lat, lng } = state.lastPlayerPosition;
        updateMapBounds(lat, lng);
        map.setView([lat, lng], zoom, { animate: true });
    }

    function initGeolocation() {
        if (state.forcedDemoArea) {
            setDemoPosition(tr('demoPosition', {
                area: getAreaName(state.forcedDemoArea),
                id: state.forcedDemoArea.id
            }));
            return;
        }

        if ('geolocation' in navigator) {
            navigator.geolocation.watchPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setPlayerPosition(lat, lng, 'gps', position.coords.heading);
                    updateMapBounds(lat, lng);

                    statusText.innerText = tr('gpsUpdated', {
                        lat: lat.toFixed(4),
                        lng: lng.toFixed(4)
                    });
                    if (!hasCenteredOnPlayer) {
                        map.setView([lat, lng], FOCUS_ZOOM);
                        hasCenteredOnPlayer = true;
                    }
                    scheduleRandomCatSpawn();

                    updateVisibleSpots(lat, lng);
                },
                (error) => {
                    console.warn("定位获取失败，使用默认演示位置:", error);
                    if (state.lastPlayerPosition?.source === 'gps') {
                        statusText.innerText = tr('gpsKept');
                        updateVisibleSpots(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng);
                        return;
                    }

                    setDemoPosition(tr('gpsFallback'));
                },
                { enableHighAccuracy: true, maximumAge: 0 }
            );
        } else {
            setDemoPosition(tr('gpsUnsupported'));
        }
    }

    function initLocateButton() {
        const locateBtn = document.getElementById('locate-btn');
        if (!locateBtn) return;

        locateBtn.addEventListener('click', () => {
            focusOnPlayer();
        });
    }

    function updateFloatingControlPositions() {
        const locateBtn = document.getElementById('locate-btn');
        const uiLayer = document.getElementById('ui-layer');
        if (!locateBtn || !uiLayer) return;

        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const panelRect = uiLayer.getBoundingClientRect();
        const gap = 14;
        const bottom = Math.max(24, viewportHeight - panelRect.top + gap);

        locateBtn.style.setProperty('--locate-btn-bottom', `${Math.round(bottom)}px`);
    }

    function initUiToggle() {
        const uiLayer = document.getElementById('ui-layer');
        const uiToggleBtn = document.getElementById('ui-toggle-btn');
        if (!uiToggleBtn || !uiLayer) return;

        uiLayer.classList.add('collapsed');
        uiToggleBtn.innerText = '▼';
        localStorage.setItem('uiLayerCollapsed', '1');
        updateFloatingControlPositions();

        uiToggleBtn.addEventListener('click', () => {
            const isCollapsed = uiLayer.classList.toggle('collapsed');
            uiToggleBtn.innerText = isCollapsed ? '▼' : '▲';
            localStorage.setItem('uiLayerCollapsed', isCollapsed ? '1' : '0');
            updateFloatingControlPositions();
            window.setTimeout(updateFloatingControlPositions, 360);
        });

        window.addEventListener('resize', updateFloatingControlPositions);
        window.setTimeout(updateFloatingControlPositions, 0);
        window.setTimeout(updateFloatingControlPositions, 400);
    }

    function initQuestButtons() {
        document.getElementById('btn-close-quest').addEventListener('click', () => {
            state.activeQuest = null;
            document.getElementById('quest-layer').classList.add('hidden');
        });

        document.getElementById('btn-start-scan').addEventListener('click', () => {
            document.getElementById('quest-layer').classList.add('hidden');
            SM.vision.openCamera();
        });

        document.getElementById('clear-cache-btn').addEventListener('click', SM.quests.clearQuestCacheAll);
    }

    function refreshLanguage() {
        updateAreaDisplay();
        updatePlayerProgressDisplay();

        if (state.forcedDemoArea && state.lastPlayerPosition?.source === 'demo') {
            statusText.innerText = tr('demoPosition', {
                area: getAreaName(state.forcedDemoArea),
                id: state.forcedDemoArea.id
            });
        }

        const questLayer = document.getElementById('quest-layer');
        if (!state.activeQuest || questLayer?.classList.contains('hidden')) return;

        const questTitle = questLayer.querySelector('.quest-content h3');
        const repairPointsChip = questLayer.querySelector('#quest-repair-points');
        const activeQuest = state.activeQuest;
        const isCatQuest = activeQuest.type === 'NPC';
        const isTutorialQuest = activeQuest.type === 'TUTORIAL';
        const targetArea = isCatQuest
            ? getAreaById(activeQuest.targetAreaId) || getSpotArea(activeQuest.spot) || getSpotArea(state.lastPlayerPosition) || getNearestArea(activeQuest.spot?.lat, activeQuest.spot?.lng)
            : isTutorialQuest
                ? null
            : getSpotArea(activeQuest.spot);

        if (questTitle) {
            questTitle.innerText = tr('questTitle', { rarity: activeQuest.rarity });
        }

        if (repairPointsChip) {
            const repairPoints = getRepairPointsForRarity(activeQuest.rarity);
            repairPointsChip.hidden = isTutorialQuest;
            repairPointsChip.innerText = isTutorialQuest
                ? ''
                : isCatQuest
                    ? tr('questCatPoints', { points: CAT_REPAIR_POINTS })
                    : targetArea
                    ? tr('questAreaPoints', { points: repairPoints })
                    : tr('questOutside');
        }
    }

    function init() {
        statusText = document.getElementById('status-text');
        const defaultCenterConfig = getDefaultCenterConfig();
        const initialCenter = defaultCenterConfig.center;
        state.defaultCenter = initialCenter;
        state.defaultZoom = defaultCenterConfig.zoom || DEFAULT_ZOOM;
        state.defaultHeading = defaultCenterConfig.heading;
        state.forcedDemoArea = defaultCenterConfig.forcedDemo ? defaultCenterConfig.area : null;
        state.lastPlayerPosition = { lat: initialCenter[0], lng: initialCenter[1], source: 'initial' };

        map = L.map('map', {
            zoomControl: false,
            minZoom: 16,
            maxZoom: 18,
            zoomSnap: 0.5,
            maxBoundsViscosity: 0.9,
            inertiaMaxSpeed: 600
        }).setView(initialCenter, state.defaultZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        map.createPane('areaPane');
        map.getPane('areaPane').style.zIndex = 380;
        map.getPane('areaPane').style.pointerEvents = 'none';
        map.createPane('radarPane');
        map.getPane('radarPane').style.zIndex = 430;
        map.getPane('radarPane').style.pointerEvents = 'none';

        dynamicMarkersLayer = L.layerGroup().addTo(map);
        radarLayer = L.layerGroup().addTo(map);
        loadExplorerProgress();
        updatePlayerProgressDisplay();
        initFogCanvas();
        updateRadarDisplay();
        initAreas();
        updateMapBounds(initialCenter[0], initialCenter[1]);

        initUiToggle();
        initQuestButtons();
        initLocateButton();
        updateFloatingControlPositions();
        initGeolocation();
        loadOSMData();
        window.setTimeout(() => {
            if (!hasCompletedTutorialPenQuest()) {
                SM.ui?.showGuideMessage?.(tr('mimiTutorialIntro'), { type: 'info', duration: 5200 });
            }
        }, 1300);
    }

    SM.map = {
        init,
        get map() {
            return map;
        },
        openQuestUI,
        updateVisibleSpots,
        removeMarkerForSpot,
        focusOnPlayer,
        recordQuestComplete,
        recordCatComplete,
        grantExplorerXp: addExplorerXp,
        grantExplorerReward,
        clearCatEvent,
        spawnTestCat,
        areas: GAME_AREAS,
        getSpotArea,
        getAreaName,
        refreshLanguage
    };
})();

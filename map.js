(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    const DEFAULT_CENTER = [34.7106, 135.5108];
    const VISIBLE_SPOT_RADIUS_METERS = 900;
    const CLOSE_SPOT_RADIUS_METERS = 360;
    const MAX_VISIBLE_SPOTS = 8;
    const MAX_SPOTS_PER_TAG = 2;
    const MIN_ANY_SPOT_DISTANCE_METERS = 135;
    const MIN_SAME_TAG_DISTANCE_METERS = 180;
    const MAP_BOUNDS_RADIUS_METERS = 1200;
    const DEFAULT_ZOOM = 17;
    const FOCUS_ZOOM = 17;
    const AREA_PROGRESS_STORAGE_KEY = 'semantic-map-area-progress-v2';
    const RARITY_REPAIR_POINTS = {
        N: 1,
        R: 2,
        SR: 4,
        SSR: 6
    };
    const GAME_AREAS = [
        {
            id: 'tenroku',
            name: '天六语义修复区',
            center: [34.7106, 135.5108],
            radius: 520,
            requiredPoints: 6,
            description: '天神橋筋六丁目周边'
        }
    ];
    let map = null;
    let playerMarker = null;
    let dynamicMarkersLayer = null;
    let areaLayer = null;
    let areaProgress = {};
    let allSpots = [];
    let catSpawned = false;
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

    function createCompletedQuestMarker(spot) {
        const completedMarker = L.marker([spot.lat, spot.lng], { icon: SM.quests.createCompletedMarkerIcon() });
        completedMarker.spotData = spot;
        return completedMarker;
    }

    function createPlayerMarkerIcon(source = 'gps') {
        const demoClass = source === 'gps' ? '' : ' demo';
        return L.divIcon({
            className: 'player-position-marker',
            html: `<div class="player-location-dot${demoClass}"></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    }

    function setPlayerPosition(lat, lng, source = 'gps') {
        state.lastPlayerPosition = { lat, lng, source };

        if (!playerMarker) {
            playerMarker = L.marker([lat, lng], {
                icon: createPlayerMarkerIcon(source),
                keyboard: false,
                interactive: false,
                zIndexOffset: 1000
            }).addTo(map);
            return;
        }

        playerMarker.setLatLng([lat, lng]);
        playerMarker.setIcon(createPlayerMarkerIcon(source));
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

    function getSpotArea(spot) {
        if (!spot) return null;
        return GAME_AREAS.find(area => {
            return L.latLng(area.center).distanceTo([spot.lat, spot.lng]) <= area.radius;
        }) || null;
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
            const label = record.purified
                ? `${area.name} 修复完成`
                : `${area.name} ${Math.min(points, area.requiredPoints)}/${area.requiredPoints}`;
            layer.setStyle?.({
                color: record.purified ? '#26a69a' : '#00acc1',
                fillColor: record.purified ? '#80cbc4' : '#b2ebf2',
                fillOpacity: record.purified ? 0.2 : 0.13
            });
            layer.bindTooltip(label, {
                permanent: true,
                direction: 'top',
                className: 'area-label'
            });
        });
    }

    function initAreas() {
        loadAreaProgress();
        areaLayer = L.layerGroup().addTo(map);

        GAME_AREAS.forEach(area => {
            const circle = L.circle(area.center, {
                radius: area.radius,
                color: '#00acc1',
                weight: 2,
                fillColor: '#b2ebf2',
                fillOpacity: 0.13,
                dashArray: '6 6',
                interactive: false
            });
            circle.areaData = area;
            areaLayer.addLayer(circle);
        });

        updateAreaDisplay();
    }

    function recordQuestComplete(questOrSpot) {
        const spot = questOrSpot?.spot || questOrSpot;
        const rarity = questOrSpot?.rarity || questOrSpot?.questData?.rarity || 'N';
        const area = getSpotArea(spot);
        if (!area || !SM.quests) return null;

        const record = getAreaRecord(area);
        const spotKey = SM.quests.getSpotKey(spot);
        const earnedPoints = getRepairPointsForRarity(rarity);
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

    function createPoiMarker(spot) {
        const questState = SM.quests.getQuestStateForSpot(spot);
        if (questState.status === 'completed') {
            return createCompletedQuestMarker(spot);
        }

        const markerQuestData = questState.questData;
        const config = markerQuestData.config
            || SM.quests.RARITY_CONFIG[markerQuestData.rarity]
            || SM.quests.RARITY_CONFIG.N;
        const size = spot.type === 'npc_cat' ? 36 : Math.round(30 * (config.scale || 1));
        const spotTypeAttr = escapeAttribute(spot.type);
        const spotNameAttr = escapeAttribute(spot.name);

        let iconHtml = "";
        if (spot.type === 'npc_cat') {
            iconHtml = `<div data-spot-type="${spotTypeAttr}" data-spot-name="${spotNameAttr}" style="font-size: 28px; text-align: center; line-height: ${size}px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">🐱</div>`;
        } else {
            iconHtml = `<div data-spot-type="${spotTypeAttr}" data-spot-name="${spotNameAttr}" style="
                background-color: ${config.color};
                width: 100%; height: 100%;
                border-radius: 50%;
                border: 2px solid white;
                display: flex; align-items: center; justify-content: center;
                color: white; font-weight: bold; font-size: 10px;
                box-shadow: 0 0 10px ${config.color};">
                ${markerQuestData.rarity}
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

        questTitle.innerText = `${data.rarity}级文型任务`;
        questTitle.style.color = data.config.color;
        if (repairPointsChip) {
            repairPointsChip.innerText = `区域修复值 +${repairPoints}`;
        }
        preview.innerHTML = data.text.replace('[ ? ]', '<span class="slot-box">?</span>');

        state.activeQuest = {
            type: spot.type === 'npc_cat' ? 'NPC' : 'POI',
            rarity: data.rarity,
            text: data.text,
            grammar: data.grammar,
            instruction: data.instruction,
            level: data.level,
            requiredTag: data.requiredTag,
            rewardCount: data.rewardCount,
            spot,
            marker
        };

        document.querySelector('.location-tag').innerText = `${spot.emoji} ${spot.name}`;
        questLayer.classList.remove('hidden');
    }

    async function loadOSMData() {
        try {
            const response = await fetch('spotsData.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error("spotsData.json 格式不是数组");
            }

            allSpots = data;
            console.log(`✅ 成功加载了 ${allSpots.length} 个烘焙好的地标！`);
            updateVisibleSpots(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng);
        } catch (error) {
            console.error("加载数据失败", error);
            statusText.innerText = "地标数据加载失败，请检查 spotsData.json";
        }
    }

    function updateVisibleSpots(playerLat, playerLng) {
        if (allSpots.length === 0 || playerLat == null || playerLng == null) return;

        const playerLocation = L.latLng(playerLat, playerLng);
        dynamicMarkersLayer.clearLayers();

        const nearbySpots = allSpots
            .map(spot => ({ ...spot, distance: playerLocation.distanceTo([spot.lat, spot.lng]) }))
            .filter(spot => spot.distance < VISIBLE_SPOT_RADIUS_METERS)
            .sort((a, b) => a.distance - b.distance);

        const selectedSpots = [];
        const selectedByTag = {};

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

        function trySelectSpot(spot, { enforceAnyDistance = true, enforceSameTagDistance = true } = {}) {
            const tag = spot.questTag || spot.type || 'Other';
            selectedByTag[tag] = selectedByTag[tag] || 0;
            if (selectedSpots.length >= MAX_VISIBLE_SPOTS) return false;
            if (selectedByTag[tag] >= MAX_SPOTS_PER_TAG) return false;
            if (selectedSpots.some(selected => selected.lat === spot.lat && selected.lng === spot.lng)) return false;
            if (enforceAnyDistance && !isFarEnoughFromAllSpots(spot)) return false;
            if (enforceSameTagDistance && !isFarEnoughFromSameTag(spot)) return false;

            selectedSpots.push(spot);
            selectedByTag[tag]++;
            return true;
        }

        for (const spot of nearbySpots) {
            if (!selectedByTag[spot.questTag]) {
                trySelectSpot(spot, { enforceAnyDistance: true, enforceSameTagDistance: false });
            }
        }

        for (const spot of nearbySpots) {
            if (selectedSpots.length >= MAX_VISIBLE_SPOTS) break;
            if (spot.distance < CLOSE_SPOT_RADIUS_METERS) {
                trySelectSpot(spot);
            }
        }

        if (selectedSpots.length < 4) {
            for (const spot of nearbySpots) {
                if (selectedSpots.length >= 4 || selectedSpots.length >= MAX_VISIBLE_SPOTS) break;
                trySelectSpot(spot, { enforceAnyDistance: true, enforceSameTagDistance: false });
            }
        }

        state.visibleSpotsDebug = [];

        selectedSpots.forEach(spot => {
            const marker = createPoiMarker(spot);
            if (marker) {
                dynamicMarkersLayer.addLayer(marker);
                const point = map.latLngToContainerPoint([spot.lat, spot.lng]);
                state.visibleSpotsDebug.push({
                    type: spot.type,
                    name: spot.name,
                    questTag: spot.questTag,
                    x: Math.round(point.x),
                    y: Math.round(point.y)
                });
            }
        });

        console.log(`👀 雷达扫描：生成 ${selectedSpots.length} 个任务点`, selectedByTag);
    }

    function removeSpotFromPool(spot) {
        const spotIndex = allSpots.findIndex(s => s.lat === spot.lat && s.lng === spot.lng);
        if (spotIndex > -1) {
            allSpots.splice(spotIndex, 1);
        }
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

    function spawnTestCat() {
        if (!playerMarker) return;

        const playerPos = playerMarker.getLatLng();
        const catLat = playerPos.lat + 0.0002;
        const catLng = playerPos.lng + 0.0002;
        const spotKey = `cat_${Date.now()}`;

        const spotData = {
            lat: catLat,
            lng: catLng,
            type: 'npc_cat',
            id: spotKey,
            name: "流浪猫",
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
        marker.questData = markerQuestData;
        marker.on('click', () => {
            openQuestUI(marker.questData, spotData, marker);
        });
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
        updateVisibleSpots(lat, lng);
    }

    function initGeolocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.watchPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setPlayerPosition(lat, lng, 'gps');
                    updateMapBounds(lat, lng);

                    statusText.innerText = `坐标更新成功：\n纬度 ${lat.toFixed(4)}\n经度 ${lng.toFixed(4)}`;
                    if (!hasCenteredOnPlayer) {
                        map.setView([lat, lng], FOCUS_ZOOM);
                        hasCenteredOnPlayer = true;
                    }
                    if (state.devMode && !catSpawned) {
                        catSpawned = true;
                        spawnTestCat();
                    }

                    updateVisibleSpots(lat, lng);
                },
                (error) => {
                    console.warn("定位获取失败，使用默认演示位置:", error);
                    if (state.lastPlayerPosition?.source === 'gps') {
                        statusText.innerText = "GPS 暂时中断，已保留上次定位";
                        updateVisibleSpots(state.lastPlayerPosition.lat, state.lastPlayerPosition.lng);
                        return;
                    }

                    statusText.innerText = "GPS 定位失败，已切换到关西演示位置";
                    setPlayerPosition(DEFAULT_CENTER[0], DEFAULT_CENTER[1], 'demo');
                    updateMapBounds(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
                    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
                    updateVisibleSpots(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
                },
                { enableHighAccuracy: true, maximumAge: 0 }
            );
        } else {
            statusText.innerText = "你的设备不支持 GPS，已切换到关西演示位置";
            setPlayerPosition(DEFAULT_CENTER[0], DEFAULT_CENTER[1], 'demo');
            updateMapBounds(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
            updateVisibleSpots(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
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

    function init() {
        statusText = document.getElementById('status-text');
        state.defaultCenter = DEFAULT_CENTER;
        state.lastPlayerPosition = { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1], source: 'initial' };

        map = L.map('map', {
            zoomControl: false,
            minZoom: 16,
            maxZoom: 18,
            zoomSnap: 0.5,
            maxBoundsViscosity: 0.9,
            inertiaMaxSpeed: 600
        }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        dynamicMarkersLayer = L.layerGroup().addTo(map);
        initAreas();
        updateMapBounds(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);

        initUiToggle();
        initQuestButtons();
        initLocateButton();
        updateFloatingControlPositions();
        initGeolocation();
        loadOSMData();
    }

    SM.map = {
        init,
        get map() {
            return map;
        },
        openQuestUI,
        updateVisibleSpots,
        removeSpotFromPool,
        removeMarkerForSpot,
        focusOnPlayer,
        recordQuestComplete,
        spawnTestCat
    };
})();

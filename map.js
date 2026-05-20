(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const state = SM.state = SM.state || {};

    const DEFAULT_CENTER = [34.6937, 135.5023];
    const VISIBLE_SPOT_RADIUS_METERS = 900;
    const CLOSE_SPOT_RADIUS_METERS = 360;
    const MAX_VISIBLE_SPOTS = 8;
    const MAX_SPOTS_PER_TAG = 2;
    const MIN_ANY_SPOT_DISTANCE_METERS = 135;
    const MIN_SAME_TAG_DISTANCE_METERS = 180;
    let map = null;
    let playerMarker = null;
    let dynamicMarkersLayer = null;
    let allSpots = [];
    let catSpawned = false;
    let statusText = null;

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
        const preview = questLayer.querySelector('.sentence-preview');

        questTitle.innerText = `${data.rarity}级文型任务`;
        questTitle.style.color = data.config.color;
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

    function initGeolocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.watchPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    state.lastPlayerPosition = { lat, lng };

                    statusText.innerText = `坐标更新成功：\n纬度 ${lat.toFixed(4)}\n经度 ${lng.toFixed(4)}`;
                    map.setView([lat, lng], 16);
                    playerMarker.setLatLng([lat, lng]);

                    if (state.devMode && !catSpawned) {
                        catSpawned = true;
                        spawnTestCat();
                    }

                    updateVisibleSpots(lat, lng);
                },
                (error) => {
                    console.warn("定位获取失败，使用默认演示位置:", error);
                    statusText.innerText = "GPS 定位失败，已切换到关西演示位置";
                    map.setView(DEFAULT_CENTER, 16);
                    playerMarker.setLatLng(DEFAULT_CENTER);
                    updateVisibleSpots(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
                },
                { enableHighAccuracy: true, maximumAge: 0 }
            );
        } else {
            statusText.innerText = "你的设备不支持 GPS，已切换到关西演示位置";
            updateVisibleSpots(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
        }
    }

    function initUiToggle() {
        const uiLayer = document.getElementById('ui-layer');
        const uiToggleBtn = document.getElementById('ui-toggle-btn');
        if (!uiToggleBtn || !uiLayer) return;

        const collapsed = localStorage.getItem('uiLayerCollapsed') === '1';
        if (collapsed) uiLayer.classList.add('collapsed');
        uiToggleBtn.innerText = collapsed ? '▼' : '▲';

        uiToggleBtn.addEventListener('click', () => {
            const isCollapsed = uiLayer.classList.toggle('collapsed');
            uiToggleBtn.innerText = isCollapsed ? '▼' : '▲';
            localStorage.setItem('uiLayerCollapsed', isCollapsed ? '1' : '0');
        });
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
        state.lastPlayerPosition = { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };

        map = L.map('map', {
            zoomControl: false,
            minZoom: 16,
            maxZoom: 18,
            zoomSnap: 0.5
        }).setView(DEFAULT_CENTER, 17);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        playerMarker = L.marker(DEFAULT_CENTER).addTo(map);
        dynamicMarkersLayer = L.layerGroup().addTo(map);

        initUiToggle();
        initQuestButtons();
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
        spawnTestCat
    };
})();

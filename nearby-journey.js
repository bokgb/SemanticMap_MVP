(function(){
    const SM=window.SemanticMap=window.SemanticMap||{};
    const kinds=['shop','park','station'];
    const point=p=>!!p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180;
    let spotData;
    function validRoute(route){
        return !!route&&route.version===2&&route.source==='spotsData'&&[3000,10000].includes(route.radius)&&point(route.origin)&&Array.isArray(route.stops)&&route.stops.length===3&&route.stops.every((p,i)=>point(p)&&p.kind===kinds[i]&&typeof p.name==='string'&&p.name.length>0&&p.name.length<=120&&Number.isFinite(p.distance)&&p.distance>=0&&p.distance<=route.radius);
    }
    async function search(origin,radius,signal){
        if(!point(origin)||![3000,10000].includes(radius))throw Error('input');
        const checkAbort=()=>{if(signal?.aborted)throw new DOMException('Search cancelled','AbortError');};
        checkAbort();
        const {nearestSpots}=await import('./lib/nearby-places.js?v=free-map-1');
        checkAbort();
        if(!spotData){
            const response=await fetch('spotsData.json',{signal,cache:'no-cache'});
            if(!response.ok)throw Error('unavailable');
            const data=await response.json();
            checkAbort();
            if(!Array.isArray(data)||!data.some(p=>p&&['convenience','park','station'].includes(p.type)))throw Error('format');
            spotData=data;
        }
        checkAbort();
        const data=nearestSpots(spotData,origin,radius);
        const route={version:2,source:'spotsData',origin:{lat:origin.lat,lng:origin.lng},stops:data.stops,radius,createdAt:Date.now()};
        if(!data.missing.length&&!validRoute(route))throw Error('format');
        return {route,missing:data.missing};
    }
    function setupView(state,api){
        const {tr:t,icon}=api,loading=state.status==='loading'||state.locating;
        const names={shop:t('コンビニ','便利店'),park:t('公園','公园'),station:t('駅','车站')};
        const title=loading?t('近くの場所を探しています','正在寻找附近地点'):state.status==='missing'?t('近くで見つからない場所があります','附近有些地点尚未找到'):t('きみの街から、出発しよう','从你所在的城市出发吧');
        const line=state.status==='missing'?t(`半径${state.radius/1000}kmで「${state.missing.map(k=>names[k]).join('・')}」を見つけられませんでした。`,`现有地点数据中，${state.radius/1000}公里内未找到${state.missing.map(k=>names[k]).join('、')}。`):state.status==='error'?t('場所を読み込めませんでした。通信を確認して、もう一度試してね。','暂时无法加载地点，请检查网络后重试。'):state.coarse?t('位置が大きくずれています。屋外で現在地をもう一度確認してね。','定位偏差较大，请在室外重新获取位置。'):t('現在地の近くにあるコンビニ・公園・駅を探します。','寻找当前位置附近的便利店、公园和车站。');
        const locationAction=state.denied?'location-settings':state.hasPosition&&!state.coarse?'nearby-search':'location-request';
        const action=state.status==='missing'&&state.radius<10000?'nearby-wider':locationAction;
        const label=loading?t('確認中…','正在查找…'):action==='nearby-wider'?t('10kmまで広げて探す','扩大到10公里搜索'):state.denied?t('位置情報の設定をひらく','打开定位设置'):state.hasPosition&&!state.coarse?t('もう一度探す','重新搜索'):t('現在地から探す','从当前位置搜索');
        return {body:`<section class="nearby-setup"><div class="nearby-search-mark ${loading?'is-searching':''}">${icon('pin')}</div><p class="journey-eyebrow">${t('きみの街の配達ルート','你所在城市的送信路线')}</p><h2>${title}</h2><p class="nearby-setup-copy" role="status">${line}</p><div class="nearby-stop-list">${kinds.map(k=>`<span>${icon(k==='shop'?'drink':k==='park'?'leaf':'station')}${names[k]}</span>`).join('')}</div><p class="courier-footnote">${t('位置情報を許可してね。OICでは、キャンパス内でタスクを始められます。','请允许定位。在 OIC 校园内就能开始任务。')}</p></section>`,footer:`<button class="courier-primary" data-action="${action}" ${loading?'disabled':''}>${icon('pin')}<span>${label}</span>${icon('arrow')}</button>${SM.playRules.walkingOnly?'':`<button class="courier-text courier-restart" data-action="preview-mode">${t('その場で体験する','切换为原地体验')}</button>`}`};
    }
    async function candidates(origin,radius=3000,signal){
        if(!spotData)await search(origin,radius,signal);
        if(signal?.aborted)throw new DOMException('Search cancelled','AbortError');
        const {nearbyCandidates}=await import('./lib/nearby-places.js?v=free-map-1');
        return nearbyCandidates(spotData,origin,radius);
    }
    SM.nearby={validRoute,search,candidates,setupView};
})();

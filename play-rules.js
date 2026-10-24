(function(){
    const SM=window.SemanticMap=window.SemanticMap||{};
    const params=new URLSearchParams(location.search);
    // Keep indoor fixtures available only in explicit localhost development previews.
    const debug=['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&params.has('test')&&params.get('test')!=='before-play';
    const campus={lat:34.81036015042446,lng:135.5610787988949};
    const point=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
    function distance(a,b){const r=Math.PI/180,x=(a.lat-b.lat)*r,y=(a.lng-b.lng)*r;return 12742000*Math.asin(Math.sqrt(Math.min(1,Math.sin(x/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(y/2)**2)));}
    function campusPosition(p){return !!(point(p)&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&p.accuracy<=500&&Number.isFinite(p.at)&&Date.now()-p.at>=0&&Date.now()-p.at<120000&&distance(p,campus)<=500);}
    // A 500m campus area tolerates indoor GPS; nearby tasks cover the normal 3km search.
    function campusArrival(p,target){return !!(campusPosition(p)&&point(target)&&distance(target,campus)<=3500);}
    function firstDayRoute(route){
        if(!point(route?.origin)||distance(route.origin,campus)>500||!Array.isArray(route.stops)||route.stops.length!==3)return route;
        // The OIC exhibition delivery ends at JR Ibaraki, regardless of the nearest rail line.
        const station={kind:'station',lat:34.8152025,lng:135.5621314,name:'JR茨木駅',nameJa:'JR茨木駅',nameEn:'JR Ibaraki Station',spotId:'station:34.8152025,135.5621314'};
        station.distance=Math.round(distance(route.origin,station));
        if(station.distance>route.radius)return route;
        return {...route,stops:route.stops.map((stop,i)=>i===2?station:stop)};
    }
    SM.playRules=Object.freeze({walkingOnly:!debug,campusPosition,campusArrival,firstDayRoute});
})();

(function () {
    'use strict';
    const SM=window.SemanticMap=window.SemanticMap||{};
    const storageKey='kotoba-hunter-research-v1';
    const endpoint='https://lzjbxukiptyyzebbvrro.supabase.co/functions/v1/record-play';
    const appVersion='research-1';
    let current=null,pending=[],disabled=false,initialized=false,inFlight=null,timer,lastTick=0;
    const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
    const code=id=>'KH-'+id.replaceAll('-','').slice(0,12).toUpperCase();
    function valid(run) {
        return run&&/^[0-9a-f-]{36}$/.test(run.id)&&/^[0-9a-f]{64}$/.test(run.writeKey)&&
            typeof run.consent==='boolean'&&Number.isSafeInteger(run.seq)&&run.seq>0&&
            Number.isFinite(Date.parse(run.started_at))&&Number.isFinite(run.active_ms)&&
            ['active','completed','restarted'].includes(run.status);
    }
    function persist() {
        if(disabled)return;
        try {localStorage.setItem(storageKey,JSON.stringify({version:1,current,pending}));}catch {/* Gameplay still works when storage is full. */}
    }
    function create(consent,mode) {
        const bytes=crypto.getRandomValues(new Uint8Array(32));
        return {id:crypto.randomUUID(),writeKey:Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join(''),
            consent,seq:1,ackSeq:0,started_at:new Date().toISOString(),active_ms:0,
            mode:mode==='field'?'field':'preview',stage:'opening',completed_tasks:0,status:'active',
            survey_opened:false,is_test:local,consent_version:'research-1',app_version:appVersion};
    }
    function accrue() {
        const now=performance.now();
        if(lastTick&&current?.consent&&current.status==='active'&&!document.hidden){
            const elapsed=Math.round(Math.max(0,now-lastTick));
            if(elapsed){current.active_ms=Math.min(86400000,current.active_ms+elapsed);current.seq++;}
        }
        lastTick=!disabled&&!document.hidden&&current?.status==='active'?now:0;
    }
    function payload(run) {
        // Explicit allowlist: never serialize game state, cards, photos or locations.
        return {id:run.id,client_sequence:run.seq,started_at:run.started_at,active_ms:run.active_ms,
            mode:run.mode,stage:run.stage,completed_tasks:run.completed_tasks,status:run.status,
            survey_opened:run.survey_opened,is_test:run.is_test,consent_version:run.consent_version,app_version:run.app_version};
    }
    async function flush() {
        if(disabled||inFlight||navigator.onLine===false)return inFlight;
        const runs=[...pending,current].filter(run=>run?.consent&&run.seq>run.ackSeq);
        if(!runs.length)return;
        inFlight=(async()=>{
            for(const run of runs){
                const sequence=run.seq;
                try {
                    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+run.writeKey},body:JSON.stringify(payload(run)),signal:AbortSignal.timeout(8000),keepalive:true});
                    if(response.ok&&(await response.json()).ok){run.ackSeq=Math.max(run.ackSeq,sequence);}
                }catch {/* Retry cumulative data on the next heartbeat or when online. */}
            }
            pending=pending.filter(run=>run.seq>run.ackSeq);persist();
        })();
        try {await inFlight;}finally {inFlight=null;}
    }
    function init(options={}) {
        if(initialized)return;initialized=true;disabled=!!options.disabled;
        if(disabled)return;
        try {
            const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
            if(saved?.version===1){current=valid(saved.current)?saved.current:null;pending=(Array.isArray(saved.pending)?saved.pending:[]).filter(valid).slice(-20);}
        }catch {/* An unavailable or damaged record must not prevent playing. */}
        if(!options.resume&&current){finish();}
        if(options.resume&&!current){try {current=create(false,'preview');persist();}catch {}}
        lastTick=current?.status==='active'&&!document.hidden?performance.now():0;
        timer=setInterval(()=>{accrue();persist();void flush();},15000);
        document.addEventListener('visibilitychange',()=>{
            // visibilitychange fires after hidden changes, so accrue the preceding visible interval explicitly.
            if(document.hidden&&lastTick&&current?.consent&&current.status==='active'){
                current.active_ms=Math.min(86400000,current.active_ms+Math.round(Math.max(0,performance.now()-lastTick)));current.seq++;
            }
            lastTick=!document.hidden&&current?.status==='active'?performance.now():0;
            persist();void flush();
        });
        window.addEventListener('pagehide',()=>{accrue();persist();void flush();});
        window.addEventListener('pageshow',()=>{lastTick=!document.hidden&&current?.status==='active'?performance.now():0;void flush();});
        window.addEventListener('online',()=>void flush());
        void flush();
    }
    function finish() {
        if(disabled||!current)return;
        accrue();
        if(current.status==='active'){current.status='restarted';current.seq++;}
        if(current.consent&&current.seq>current.ackSeq)pending.push(current);
        pending=pending.slice(-20);current=null;lastTick=0;persist();void flush();
    }
    function start(consent,mode) {
        if(disabled)return;
        finish();
        try {current=create(!!consent,mode);lastTick=document.hidden?0:performance.now();persist();void flush();}catch {/* Secure random IDs are required; otherwise skip research. */}
    }
    function update({mode,stage,completedTasks,done}) {
        if(disabled||!current||current.status==='restarted')return;
        let changed=false;
        for(const [key,value] of Object.entries({mode,stage,completed_tasks:Math.max(current.completed_tasks,Math.min(4,Math.max(0,completedTasks))),status:done?'completed':current.status})){
            if(current[key]!==value){current[key]=value;changed=true;}
        }
        // Include the final foreground interval before stopping the clock.
        if(changed){
            if(done&&lastTick&&current.consent&&!document.hidden){current.active_ms=Math.min(86400000,current.active_ms+Math.round(Math.max(0,performance.now()-lastTick)));lastTick=0;}
            else accrue();
            current.seq++;persist();void flush();
        }
    }
    function surveyURL(base) {
        const url=new URL(base);
        if(!disabled&&current){url.searchParams.set('usp','pp_url');url.searchParams.set('entry.955941535',code(current.id));}
        return url.href;
    }
    function surveyOpened() {
        if(disabled||!current||current.survey_opened)return;
        accrue();current.survey_opened=true;current.seq++;persist();void flush();
    }
    function suspend() {disabled=true;lastTick=0;clearInterval(timer);}
    SM.research={init,start,update,restart:finish,surveyURL,surveyOpened,suspend};
})();

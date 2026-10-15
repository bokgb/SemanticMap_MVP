import assert from 'node:assert/strict';
import handler from '../api/gemini.js';

const originalFetch=globalThis.fetch,originalKey=process.env.GEMINI_API_KEY,originalNow=Date.now;
let time=2000000,calls=0;
Date.now=()=>time;process.env.GEMINI_API_KEY='test-only';
globalThis.fetch=async()=>{calls++;return {ok:true,status:200,headers:new Headers({'Content-Type':'application/json'}),json:async()=>({candidates:[]})};};
async function request(session,ip='192.0.2.100'){
    const headers={},res={statusCode:200,setHeader(k,v){headers[k]=v;},status(s){this.statusCode=s;return this;},json(data){this.body=data;return this;}};
    await handler({method:'POST',headers:{'x-forwarded-for':ip,...(session?{'x-game-session':session}:{})},body:{contents:[{parts:[{text:'test'}]}]}},res);
    return {...res,headers};
}
try{
    for(const player of ['classroom-player-01','classroom-player-02'])for(let i=0;i<12;i++)assert.equal((await request(player)).statusCode,200);
    const limited=await request('classroom-player-01');assert.equal(limited.statusCode,429);assert.equal(limited.headers['Retry-After'],'60');
    for(let i=0;i<96;i++)assert.equal((await request('classroom-guest-'+String(i).padStart(3,'0'))).statusCode,200);
    assert.equal((await request('classroom-new-player')).statusCode,429,'Overall Wi-Fi ceiling remains');
    assert.equal((await request('classroom-player-01','192.0.2.101')).statusCode,200);
    time+=60001;assert.equal((await request('classroom-player-01')).statusCode,200,'Quota expires');
    for(let i=0;i<5;i++)assert.equal((await request(null,'192.0.2.102')).statusCode,200);
    assert.equal((await request(null,'192.0.2.102')).statusCode,429,'Legacy clients still have an IP-based quota');
    console.log(`PASS: independent player quotas on shared Wi-Fi, per-IP ceiling, Retry-After, expiry and legacy requests (${calls} mocked provider calls; no real API use).`);
}finally{globalThis.fetch=originalFetch;Date.now=originalNow;if(originalKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalKey;}

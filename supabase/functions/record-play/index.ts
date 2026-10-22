// Public registration of a new random run; subsequent writes require its private capability.
// Database reads are never returned. The service-role key stays in the Edge runtime.
const allowedOrigins=new Set(['https://semantic-map-mvp.vercel.app','https://semantic-map-mvp-bokgbs-projects.vercel.app']);
const stages=new Set(['opening','letter','letter_done','departure','shop','park','station','complete']);
const fields=new Set(['id','client_sequence','started_at','active_ms','mode','stage','completed_tasks','status','survey_opened','is_test','consent_version','app_version']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const integer=(v:unknown,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max;
Deno.serve(async req=>{
  const origin=req.headers.get('origin')||'';
  const local=/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(origin);
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, content-type','Access-Control-Max-Age':'600','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
  if(!allowedOrigins.has(origin)&&!local)return reply(403,{error:'origin'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'method'});
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(!/^[a-f0-9]{64}$/.test(token))return reply(401,{error:'run_key'});
  if(Number(req.headers.get('content-length')||0)>2048)return reply(413,{error:'size'});
  try{
    const text=await req.text();if(text.length>2048)return reply(413,{error:'size'});
    const p=JSON.parse(text);
    if(!p||Array.isArray(p)||Object.keys(p).some(k=>!fields.has(k))||!uuid.test(p.id)||
      !integer(p.client_sequence,1e9)||p.client_sequence<1||!integer(p.active_ms,86400000)||
      !integer(p.completed_tasks,4)||!['preview','field'].includes(p.mode)||!stages.has(p.stage)||
      !['active','completed','restarted'].includes(p.status)||typeof p.survey_opened!=='boolean'||typeof p.is_test!=='boolean'||
      p.consent_version!=='research-1'||typeof p.app_version!=='string'||p.app_version.length>40||
      typeof p.started_at!=='string'||!Number.isFinite(Date.parse(p.started_at))||Date.parse(p.started_at)>Date.now()+300000||
      (p.status==='completed'&&(p.stage!=='complete'||p.completed_tasks!==4)))return reply(400,{error:'payload'});
    p.is_test=local||p.is_test;
    p.play_code='KH-'+p.id.replaceAll('-','').slice(0,12).toUpperCase();
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),n=>n.toString(16).padStart(2,'0')).join('');
    const api=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!api||!key)return reply(503,{error:'configuration'});
    const response=await fetch(api+'/rest/v1/rpc/record_play_session',{method:'POST',headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p,h:hash}),signal:AbortSignal.timeout(8000)});
    if(!response.ok)return reply(503,{error:'storage'});
    return await response.json()?reply(200,{ok:true}):reply(409,{error:'run_key'});
  }catch{return reply(400,{error:'request'});}
});

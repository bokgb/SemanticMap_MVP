-- Applied to the dedicated kotoba-hunter-research project, not the game's POI data.
create table public.play_sessions (
  id uuid primary key,
  play_code text not null unique check (play_code ~ '^KH-[A-F0-9]{12}$'),
  write_hash text not null check (length(write_hash)=64),
  client_sequence bigint not null check (client_sequence>0),
  started_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  completed_at timestamptz,
  ended_at timestamptz,
  active_ms bigint not null check (active_ms between 0 and 86400000),
  mode text not null check (mode in ('preview','field')),
  stage text not null check (stage in ('opening','letter','letter_done','departure','shop','park','station','complete')),
  completed_tasks integer not null check (completed_tasks between 0 and 4),
  status text not null check (status in ('active','completed','restarted')),
  survey_opened boolean not null default false,
  is_test boolean not null default false,
  consent_version text not null check (consent_version='research-1'),
  app_version text not null check (length(app_version)<=40)
);
alter table public.play_sessions enable row level security;
revoke all on public.play_sessions from anon, authenticated;
grant select, insert, update, delete on public.play_sessions to service_role;
create index play_sessions_last_seen_idx on public.play_sessions (last_seen_at desc);

-- SECURITY INVOKER: only the Edge Function's server-side service role can invoke.
create function public.record_play_session(p jsonb, h text) returns boolean
language plpgsql security invoker set search_path=''
as $$
declare changed integer;
begin
  insert into public.play_sessions as old (
    id,play_code,write_hash,client_sequence,started_at,active_ms,mode,stage,
    completed_tasks,status,survey_opened,is_test,consent_version,app_version,completed_at,ended_at
  ) values (
    (p->>'id')::uuid,p->>'play_code',h,(p->>'client_sequence')::bigint,(p->>'started_at')::timestamptz,
    (p->>'active_ms')::bigint,p->>'mode',p->>'stage',(p->>'completed_tasks')::integer,p->>'status',
    (p->>'survey_opened')::boolean,(p->>'is_test')::boolean,p->>'consent_version',p->>'app_version',
    case when p->>'status'='completed' then now() end,
    case when p->>'status' in ('completed','restarted') then now() end
  )
  on conflict (id) do update set
    client_sequence=excluded.client_sequence,last_seen_at=now(),
    active_ms=greatest(old.active_ms,excluded.active_ms),mode=excluded.mode,
    stage=case when old.status='completed' then old.stage else excluded.stage end,
    completed_tasks=greatest(old.completed_tasks,excluded.completed_tasks),
    status=case when old.status='completed' then old.status else excluded.status end,
    survey_opened=old.survey_opened or excluded.survey_opened,
    completed_at=coalesce(old.completed_at,excluded.completed_at),
    ended_at=coalesce(old.ended_at,excluded.ended_at)
  where old.write_hash=excluded.write_hash and old.client_sequence<excluded.client_sequence;
  get diagnostics changed = row_count;
  if changed>0 then return true; end if;
  -- A duplicate or stale retry with the correct per-run key is acknowledged safely.
  return exists(select 1 from public.play_sessions where id=(p->>'id')::uuid and write_hash=h);
end;
$$;
revoke all on function public.record_play_session(jsonb,text) from public,anon,authenticated;
grant execute on function public.record_play_session(jsonb,text) to service_role;

create view public.play_summary with (security_invoker=true) as
select play_code as "试玩编号",
  case mode when 'field' then '走路探索' else '原地体验' end as "探索方式",
  case stage when 'opening' then '开场／拍笔' when 'letter' then '写信中'
    when 'letter_done' then '写完信' when 'departure' then '准备出发'
    when 'shop' then '便利店' when 'park' then '公园' when 'station' then '车站'
    else '完成交付' end as "最后进度",
  completed_tasks as "完成阶段数（共4项）",
  round(active_ms/60000.0,2) as "前台游玩分钟",
  round(greatest(0,extract(epoch from (coalesce(ended_at,last_seen_at)-started_at)))/60.0,2) as "起止经过分钟",
  case status when 'completed' then '已完成' when 'restarted' then '已重新开始' else '进行中或已离开' end as "状态",
  survey_opened as "打开过问卷",started_at as "开始时间",last_seen_at as "最后收到数据",
  app_version as "版本"
from public.play_sessions where not is_test;
revoke all on public.play_summary from anon, authenticated;
grant select on public.play_summary to service_role;
comment on view public.play_summary is '正式试玩统计，不包含本地测试；打开问卷不代表提交问卷。';

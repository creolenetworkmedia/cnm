-- Additive CNM website services. Existing mobile article identifiers and fields remain intact.
-- This migration does not assign administrators, change Auth settings, or modify stream values.
create table if not exists private.cnm_web_drafts (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 article_id uuid, intended_article_id uuid not null default gen_random_uuid(), revision bigint not null default 1,
 base_updated_at timestamptz, snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists cnm_web_drafts_owner_idx on private.cnm_web_drafts(owner_id,updated_at desc);
create table if not exists private.cnm_web_receipts (
 scope text not null, request_id uuid not null, fingerprint text not null, action text not null, request_payload jsonb not null, response jsonb not null,
 created_at timestamptz not null default now(), primary key(scope,request_id)
);
create table if not exists private.cnm_web_limits (
 subject text not null, action text not null, window_at timestamptz not null,
 count integer not null default 1, primary key(subject,action,window_at)
);
create table if not exists private.cnm_web_media (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 purpose text not null check(purpose in('draft','submission')), scope_id uuid not null,
 source_path text not null unique, byte_length integer not null check(byte_length between 1 and 10485760),
 mime_type text not null check(mime_type in('image/jpeg','image/png','image/webp')),
 source_hash text, width integer, height integer, variants jsonb not null default '{}',
 status text not null default 'allocated' check(status in('allocated','processing','ready','failed')),
 expires_at timestamptz not null default (now()+interval '30 minutes'), created_at timestamptz not null default now()
);
create index if not exists cnm_web_media_owner_scope_idx on private.cnm_web_media(owner_id,purpose,scope_id);
create table if not exists private.cnm_web_inquiries (
 id uuid primary key default gen_random_uuid(), reference uuid not null unique default gen_random_uuid(),
 owner_id uuid references auth.users(id) on delete set null, name text not null, email text not null,
 category text not null check(category in('general','technical','sponsorship','editorial','correction','copyright')),
 locale text not null check(locale in('en','fr','ht','es')), message text not null,
 organization text, interest text, budget_range text, relevant_url text, policy_version text not null,
 status text not null default 'new' check(status in('new','discussing','agreed','closed')), note text not null default '',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists cnm_web_inquiries_status_idx on private.cnm_web_inquiries(status,created_at desc);
create table if not exists private.cnm_web_submissions (
 id uuid primary key references public.article_submissions(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade, reference uuid not null default gen_random_uuid() unique,
 scope_id uuid not null, photos jsonb not null default '[]', video jsonb, policy_version text not null,
 note text not null default '', updated_at timestamptz not null default now()
);
create index if not exists cnm_web_submissions_owner_idx on private.cnm_web_submissions(owner_id);
create table if not exists private.cnm_web_revisions (
 id bigint generated always as identity primary key, article_id uuid not null, actor_id uuid references auth.users(id) on delete set null,
 action text not null, snapshot jsonb, created_at timestamptz not null default now()
);
alter table private.cnm_web_drafts enable row level security;
alter table private.cnm_web_receipts enable row level security;
alter table private.cnm_web_limits enable row level security;
alter table private.cnm_web_media enable row level security;
alter table private.cnm_web_inquiries enable row level security;
alter table private.cnm_web_submissions enable row level security;
alter table private.cnm_web_revisions enable row level security;
revoke all on private.cnm_web_drafts,private.cnm_web_receipts,private.cnm_web_limits,private.cnm_web_media,private.cnm_web_inquiries,private.cnm_web_submissions,private.cnm_web_revisions from public,anon,authenticated;
-- All application access is through the narrow service RPC below, not exposed private-schema grants.
alter table public.articles add column if not exists public_revision bigint not null default 0;
alter table public.articles add column if not exists author_credit text;
alter table public.articles add column if not exists video jsonb;
alter table public.articles add column if not exists gallery_media_ids uuid[] not null default '{}';
alter table public.articles add column if not exists photo_metadata jsonb not null default '{}';
alter table public.articles add column if not exists content_blocks_i18n jsonb not null default '{}';
alter table public.articles add column if not exists is_sponsored boolean not null default false;
alter table public.articles add column if not exists sponsor_credit text;
-- Trusted publishers, not legacy editors, may alter public article images.
drop policy if exists media_assets_staff_manage on public.media_assets;
create policy media_assets_staff_manage on public.media_assets for all to authenticated
 using ((select private.is_admin())) with check ((select private.is_admin()));
-- Preserve existing app review access while limiting the new website's review queue to its owner and admins.
drop policy if exists article_submissions_staff_select on public.article_submissions;
create policy article_submissions_staff_select on public.article_submissions for select to authenticated
 using ((select private.is_admin()) or (source<>'web-v2' and (select private.is_staff())));
drop policy if exists article_submissions_staff_update on public.article_submissions;
create policy article_submissions_staff_update on public.article_submissions for update to authenticated
 using ((select private.is_admin()) or (source<>'web-v2' and (select private.is_staff())))
 with check ((select private.is_admin()) or (source<>'web-v2' and (select private.is_staff())));

create or replace function private.cnm_web_limit_v2(p_subject text,p_action text,p_limit int,p_seconds int)
returns void language plpgsql security invoker set search_path='' as $$
declare v_window timestamptz;v_count int;
begin
 v_window=to_timestamp(floor(extract(epoch from now())/p_seconds)*p_seconds);
 insert into private.cnm_web_limits(subject,action,window_at,count) values(p_subject,p_action,v_window,1)
 on conflict(subject,action,window_at) do update set count=private.cnm_web_limits.count+1 returning count into v_count;
 if v_count>p_limit then raise exception using errcode='P0001',message='rate_limited';end if;
end $$;
revoke all on function private.cnm_web_limit_v2(text,text,int,int) from public,anon,authenticated;

create or replace function private.cnm_web_draft_json_v2(d private.cnm_web_drafts)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',d.id,'articleId',d.article_id,'intendedArticleId',d.intended_article_id,'revision',d.revision,'baseUpdatedAt',d.base_updated_at,'updatedAt',d.updated_at,'snapshot',d.snapshot,'published',exists(select 1 from public.articles a where a.id=d.article_id and a.status='published'));
$$;
revoke all on function private.cnm_web_draft_json_v2(private.cnm_web_drafts) from public,anon,authenticated;

create or replace function public.cnm_web_service_v2(p_actor uuid,p_action text,p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_scope text=coalesce(p_actor::text,'guest');v_hash text;v_receipt private.cnm_web_receipts;v_result jsonb;
 v_admin boolean;v_id uuid;v_photo jsonb;v_media private.cnm_web_media;v_draft private.cnm_web_drafts;
 v_article public.articles;v_snapshot jsonb;v_asset jsonb;v_variants jsonb;v_variant jsonb;v_ids uuid[]='{}';
 v_photo_meta jsonb='{}';v_public_id uuid;v_reference uuid;v_revision bigint;v_current timestamptz;v_exists boolean;
 v_size text;v_kind text;v_row jsonb;v_email text;
begin
 if p_request_id is null or p_action is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>1048576 then raise exception using errcode='22023',message='invalid_request';end if;
 if p_actor is not null and not exists(select 1 from auth.users where id=p_actor) then raise exception using errcode='42501',message='not_authenticated';end if;
 v_admin=exists(select 1 from private.user_roles where user_id=p_actor and role in('admin','super_admin'));
 if p_action like 'draft.%' or p_action like 'article.%' or p_action='station.update' or p_action in('inquiry.list','inquiry.update','submission.list','submission.update','submission.media') then
  if not v_admin then raise exception using errcode='42501',message='forbidden';end if;
 elsif p_action<>'inquiry.submit' and p_actor is null then raise exception using errcode='42501',message='not_authenticated';end if;
 if p_action='draft.result' then
  select * into v_receipt from private.cnm_web_receipts where scope=v_scope and request_id=(p_payload->>'requestId')::uuid;
  if not found then return jsonb_build_object('found',false);end if;
  if v_receipt.action<>'draft.finalize' or (v_receipt.request_payload-'assets') is distinct from (p_payload-'requestId') then raise exception using errcode='40001',message='conflict';end if;
  return jsonb_build_object('found',true,'response',v_receipt.response);
 end if;
 v_hash=encode(sha256(convert_to(p_action||':'||p_payload::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(v_scope||p_request_id::text,0));
 select * into v_receipt from private.cnm_web_receipts where scope=v_scope and request_id=p_request_id;
 if found then if v_receipt.fingerprint<>v_hash then raise exception using errcode='40001',message='conflict';end if;return v_receipt.response;end if;
 -- Read responses are intentionally not retained as receipts; a role/ownership check is repeated each request.
 if p_action='draft.list' then
  select jsonb_build_object('drafts',coalesce(jsonb_agg(private.cnm_web_draft_json_v2(d)),'[]')) into v_result
  from (select * from private.cnm_web_drafts where owner_id=p_actor order by updated_at desc limit 100) d;return v_result;
 elsif p_action='draft.get' then
  select * into v_draft from private.cnm_web_drafts where id=(p_payload->>'id')::uuid and owner_id=p_actor;
  if not found then raise exception using errcode='42501',message='forbidden';end if;return private.cnm_web_draft_json_v2(v_draft);
 elsif p_action='draft.save' then
  perform private.cnm_web_limit_v2(v_scope,'draft.save',120,3600);
  v_id=(p_payload->>'id')::uuid;v_snapshot=p_payload->'snapshot';
  if v_id is null or jsonb_typeof(v_snapshot)<>'object' or jsonb_array_length(coalesce(v_snapshot->'photos','[]'))>11 then raise exception using errcode='22023',message='invalid_request';end if;
  select * into v_draft from private.cnm_web_drafts where id=v_id for update;v_exists=found;
  if v_exists and v_draft.owner_id<>p_actor then raise exception using errcode='42501',message='forbidden';end if;
  if (v_exists and v_draft.revision<>coalesce((p_payload->>'expectedRevision')::bigint,-1)) or (not v_exists and coalesce((p_payload->>'expectedRevision')::bigint,-1)<>0) then raise exception using errcode='40001',message='conflict';end if;
  for v_photo in select value from jsonb_array_elements(coalesce(v_snapshot->'photos','[]')) loop
   if v_photo ? 'uploadId' then
    if not exists(select 1 from private.cnm_web_media where id=(v_photo->>'uploadId')::uuid and owner_id=p_actor and purpose='draft' and scope_id=v_id and status='ready') then raise exception using errcode='42501',message='invalid_media';end if;
   elsif not exists(select 1 from public.media_assets where id=(v_photo->>'mediaId')::uuid and is_public and status='ready') then raise exception using errcode='42501',message='invalid_media';end if;
  end loop;
  if not v_exists then
   if nullif(p_payload->>'articleId','') is not null then
    select * into v_article from public.articles where id=(p_payload->>'articleId')::uuid for share;
    if not found or v_article.updated_at is distinct from (p_payload->>'baseUpdatedAt')::timestamptz then raise exception using errcode='40001',message='conflict';end if;
   end if;
   insert into private.cnm_web_drafts(id,owner_id,article_id,base_updated_at,snapshot) values(v_id,p_actor,v_article.id,v_article.updated_at,v_snapshot) returning * into v_draft;
  else
   update private.cnm_web_drafts set snapshot=v_snapshot,revision=revision+1,updated_at=clock_timestamp() where id=v_id returning * into v_draft;
  end if;
  v_result=private.cnm_web_draft_json_v2(v_draft);
 elsif p_action in('draft.prepare','draft.finalize') then
  select * into v_draft from private.cnm_web_drafts where id=(p_payload->>'id')::uuid and owner_id=p_actor for update;
  if not found then raise exception using errcode='42501',message='forbidden';end if;
  if v_draft.revision<>coalesce((p_payload->>'expectedRevision')::bigint,-1) or v_draft.base_updated_at is distinct from (p_payload->>'baseUpdatedAt')::timestamptz then raise exception using errcode='40001',message='conflict';end if;
  if v_draft.article_id is not null then
   select * into v_article from public.articles where id=v_draft.article_id for update;
   if not found or v_article.updated_at is distinct from v_draft.base_updated_at then raise exception using errcode='40001',message='conflict';end if;
  end if;
  v_snapshot=v_draft.snapshot;
  if coalesce(v_snapshot->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_snapshot->>'slug')>120 or length(trim(coalesce(v_snapshot->>'author_credit','')))=0 or (v_snapshot->>'author_credit')~'^[^ @]+@[^ @]+\.[^ @]+$' or not exists(select 1 from jsonb_each_text(v_snapshot->'title_i18n') x where x.key in('en','fr','ht','es') and length(trim(x.value))>0 and length(trim(coalesce(v_snapshot->'body_i18n'->>x.key,'')))>0) then raise exception using errcode='22023',message='invalid_content';end if;
  if coalesce((v_snapshot->>'is_sponsored')::boolean,false) and length(trim(coalesce(v_snapshot->>'sponsor_credit','')))=0 then raise exception using errcode='22023',message='invalid_content';end if;
  if exists(select 1 from public.articles where slug=v_snapshot->>'slug' and id<>coalesce(v_draft.article_id,v_draft.intended_article_id)) then raise exception using errcode='40001',message='conflict';end if;
  v_variants='[]';
  for v_photo in select value from jsonb_array_elements(v_snapshot->'photos') loop
   if v_photo ? 'uploadId' then
    select * into v_media from private.cnm_web_media where id=(v_photo->>'uploadId')::uuid and owner_id=p_actor and purpose='draft' and scope_id=v_draft.id and status='ready';
    if not found then raise exception using errcode='42501',message='invalid_media';end if;
    v_variants=v_variants||jsonb_build_array(to_jsonb(v_media));
   elsif not exists(select 1 from public.media_assets where id=(v_photo->>'mediaId')::uuid and is_public and status='ready') then raise exception using errcode='42501',message='invalid_media';end if;
  end loop;
  if p_action='draft.prepare' then return jsonb_build_object('draft',private.cnm_web_draft_json_v2(v_draft),'uploads',v_variants);end if;
  perform private.cnm_web_limit_v2(v_scope,'publish',100,3600);
  for v_photo in select value from jsonb_array_elements(v_snapshot->'photos') loop
   if v_photo ? 'uploadId' then
    v_public_id=(v_photo->>'uploadId')::uuid;
    select * into v_media from private.cnm_web_media where id=v_public_id;
    select value into v_asset from jsonb_array_elements(coalesce(p_payload->'assets','[]')) where value->>'uploadId'=v_public_id::text;
    if v_asset is null or v_asset->>'sourceHash' is distinct from v_media.source_hash then raise exception using errcode='22023',message='invalid_media';end if;
    -- Only deterministic server delivery paths derived from the verified private ticket are accepted.
    if v_asset->>'prefix'<>'web-v2/'||v_public_id::text||'/' then raise exception using errcode='22023',message='invalid_media';end if;
    insert into public.media_assets(id,kind,bucket,original_path,tiny_path,small_path,medium_path,large_path,alt_i18n,width,height,original_bytes,status,is_public,created_by)
    values(v_public_id,'image','cnm-media',(v_asset->>'prefix')||'1920.webp',(v_asset->>'prefix')||'320.webp',(v_asset->>'prefix')||'640.webp',(v_asset->>'prefix')||'1280.webp',(v_asset->>'prefix')||'1920.webp',coalesce(v_photo->'alt','{}'),v_media.width,v_media.height,(v_media.variants->'1920'->>'bytes')::bigint,'ready',true,p_actor)
    on conflict(id) do nothing;
   else v_public_id=(v_photo->>'mediaId')::uuid;end if;
   v_ids=array_append(v_ids,v_public_id);v_photo_meta=v_photo_meta||jsonb_build_object(v_public_id::text,jsonb_build_object('caption_i18n',coalesce(v_photo->'caption','{}'),'alt_i18n',coalesce(v_photo->'alt','{}'),'credit',coalesce(v_photo->>'credit','')));
  end loop;
  v_id=coalesce(v_draft.article_id,v_draft.intended_article_id);
  insert into public.articles(id,slug,category_id,title_i18n,excerpt_i18n,body_i18n,hero_media_id,author_user_id,status,published_at,updated_at,author_credit,public_revision,video,gallery_media_ids,photo_metadata,content_blocks_i18n,is_sponsored,sponsor_credit)
  values(v_id,v_snapshot->>'slug',nullif(v_snapshot->>'category_id','')::uuid,v_snapshot->'title_i18n',v_snapshot->'excerpt_i18n',v_snapshot->'body_i18n',v_ids[1],p_actor,'published',coalesce(v_article.published_at,now()),clock_timestamp(),v_snapshot->>'author_credit',coalesce(v_article.public_revision,0)+1,nullif(v_snapshot->'video','null'::jsonb),coalesce(v_ids[2:11],'{}'),v_photo_meta,'{}',coalesce((v_snapshot->>'is_sponsored')::boolean,false),v_snapshot->>'sponsor_credit')
  on conflict(id) do update set slug=excluded.slug,category_id=excluded.category_id,title_i18n=excluded.title_i18n,excerpt_i18n=excluded.excerpt_i18n,body_i18n=excluded.body_i18n,hero_media_id=excluded.hero_media_id,status=excluded.status,published_at=excluded.published_at,updated_at=excluded.updated_at,author_credit=excluded.author_credit,public_revision=excluded.public_revision,video=excluded.video,gallery_media_ids=excluded.gallery_media_ids,photo_metadata=excluded.photo_metadata,content_blocks_i18n='{}',is_sponsored=excluded.is_sponsored,sponsor_credit=excluded.sponsor_credit
  returning * into v_article;
  update private.cnm_web_drafts set article_id=v_id,base_updated_at=v_article.updated_at,updated_at=clock_timestamp() where id=v_draft.id;
  insert into private.cnm_web_revisions(article_id,actor_id,action,snapshot) values(v_id,p_actor,'publish',v_snapshot);
  v_result=jsonb_build_object('articleId',v_id,'updatedAt',v_article.updated_at,'publicRevision',v_article.public_revision);
 elsif p_action in('article.unpublish','article.delete') then
  v_id=(p_payload->>'id')::uuid;select * into v_article from public.articles where id=v_id for update;
  if not found or v_article.updated_at is distinct from (p_payload->>'expectedUpdatedAt')::timestamptz then raise exception using errcode='40001',message='conflict';end if;
  insert into private.cnm_web_revisions(article_id,actor_id,action) values(v_id,p_actor,p_action);
  if p_action='article.unpublish' then update public.articles set status='draft',updated_at=clock_timestamp(),public_revision=public_revision+1 where id=v_id;
  else delete from public.articles where id=v_id;end if;v_result=jsonb_build_object('ok',true);
 elsif p_action='inquiry.submit' then
  if length(trim(coalesce(p_payload->>'name','')))=0 or length(p_payload->>'name')>80 or length(p_payload->>'email')>254 or coalesce(p_payload->>'email','')!~'^[^ @]+@[^ @]+\.[^ @]+$' or length(trim(coalesce(p_payload->>'message','')))=0 or length(p_payload->>'message')>5000 or p_payload->>'policyVersion'<>'contact-notice-2026-10-05' then raise exception using errcode='22023',message='invalid_request';end if;
  perform private.cnm_web_limit_v2('global','inquiry',60,3600);
  perform private.cnm_web_limit_v2(encode(sha256(convert_to(lower(p_payload->>'email'),'UTF8')),'hex'),'inquiry',6,3600);
  insert into private.cnm_web_inquiries(owner_id,name,email,category,locale,message,organization,interest,budget_range,relevant_url,policy_version)
  values(p_actor,p_payload->>'name',p_payload->>'email',p_payload->>'category',p_payload->>'locale',p_payload->>'message',p_payload->>'organization',p_payload->>'interest',p_payload->>'budgetRange',p_payload->>'relevantUrl',p_payload->>'policyVersion') returning reference into v_reference;
  v_result=jsonb_build_object('stored',true,'reference',v_reference,'emailStatus','not-configured');
 elsif p_action='inquiry.list' then
  select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(q)),'[]')) into v_result from (select id,reference,name,email,category,locale,message,organization,interest,budget_range,relevant_url,status,note,created_at,updated_at from private.cnm_web_inquiries order by created_at desc limit 100) q;return v_result;
 elsif p_action='inquiry.update' then
  v_id=(p_payload->>'id')::uuid;
  if p_payload->>'status' not in('new','discussing','agreed','closed') or length(coalesce(p_payload->>'note',''))>5000 then raise exception using errcode='22023',message='invalid_request';end if;
  update private.cnm_web_inquiries set status=p_payload->>'status',note=coalesce(p_payload->>'note',''),updated_at=clock_timestamp() where id=v_id and updated_at=(p_payload->>'expectedUpdatedAt')::timestamptz;
  if not found then raise exception using errcode='40001',message='conflict';end if;v_result=jsonb_build_object('ok',true);
 elsif p_action='media.begin' then
  if p_payload->>'purpose' not in('draft','submission') or (p_payload->>'purpose'='draft' and not v_admin) then raise exception using errcode='42501',message='forbidden';end if;
  v_id=(p_payload->>'scopeId')::uuid;
  if exists(select 1 from private.cnm_web_drafts where id=v_id and owner_id<>p_actor) then raise exception using errcode='42501',message='forbidden';end if;
  perform private.cnm_web_limit_v2(v_scope,'upload',case when v_admin then 200 else 40 end,86400);
  perform private.cnm_web_limit_v2('global','upload',1000,86400);
  if (select count(*) from private.cnm_web_media where owner_id=p_actor and scope_id=v_id and purpose=p_payload->>'purpose' and status<>'failed')>=30 then raise exception using errcode='P0001',message='rate_limited';end if;
  v_public_id=gen_random_uuid();insert into private.cnm_web_media(id,owner_id,purpose,scope_id,source_path,byte_length,mime_type)
  values(v_public_id,p_actor,p_payload->>'purpose',v_id,p_actor::text||'/'||v_public_id::text||'/input',(p_payload->>'byteLength')::int,p_payload->>'mimeType') returning * into v_media;v_result=to_jsonb(v_media);
 elsif p_action in('media.get','media.variant','media.fail') then
  select * into v_media from private.cnm_web_media where id=(p_payload->>'id')::uuid and owner_id=p_actor for update;
  if not found or (v_media.purpose='draft' and not v_admin) then raise exception using errcode='42501',message='forbidden';end if;
  if v_media.expires_at<now() and v_media.status<>'ready' then raise exception using errcode='22023',message='upload_expired';end if;
  if p_action='media.get' then return to_jsonb(v_media);end if;
  if p_action='media.fail' then update private.cnm_web_media set status='failed' where id=v_media.id;return jsonb_build_object('ok',true);end if;
  v_size=p_payload->>'size';v_variant=p_payload->'variant';
  if v_size not in('320','640','1280','1920') or (p_payload->>'width')::int not between 1 and 1920 or (p_payload->>'height')::int not between 1 and 1920 or length(p_payload->>'sourceHash')<>64 or v_variant->>'path'<>p_actor::text||'/'||v_media.id::text||'/'||v_size||'.webp' then raise exception using errcode='22023',message='invalid_media';end if;
  if v_media.source_hash is not null and v_media.source_hash<>p_payload->>'sourceHash' then raise exception using errcode='40001',message='conflict';end if;
  v_variants=v_media.variants||jsonb_build_object(v_size,v_variant);
  update private.cnm_web_media set source_hash=p_payload->>'sourceHash',width=(p_payload->>'width')::int,height=(p_payload->>'height')::int,variants=v_variants,status=case when v_variants ?& array['320','640','1280','1920'] then 'ready' else 'processing' end where id=v_media.id returning * into v_media;
  v_result=to_jsonb(v_media);
 elsif p_action='submission.submit' then
  if p_payload->>'policyVersion'<>'submission-review-2026-10-05' or p_payload->>'rightsConfirmed'<>'true' or length(trim(coalesce(p_payload->>'title','')))=0 or length(p_payload->>'title')>250 or length(trim(coalesce(p_payload->>'body','')))=0 or length(p_payload->>'body')>50000 or jsonb_array_length(p_payload->'photos')>11 then raise exception using errcode='22023',message='invalid_request';end if;
  perform private.cnm_web_limit_v2(v_scope,'submission',8,3600);
  perform private.cnm_web_limit_v2('global','submission',100,3600);
  for v_photo in select value from jsonb_array_elements(p_payload->'photos') loop
   if not exists(select 1 from private.cnm_web_media where id=(v_photo->>'uploadId')::uuid and owner_id=p_actor and purpose='submission' and scope_id=(p_payload->>'scopeId')::uuid and status='ready') then raise exception using errcode='42501',message='invalid_media';end if;
  end loop;
  select email into v_email from auth.users where id=p_actor;
  insert into public.article_submissions(user_id,language,title,body,submitter_name,submitter_email,source,status) values(p_actor,p_payload->>'locale',p_payload->>'title',p_payload->>'body',p_payload->>'name',v_email,'web-v2','pending') returning id into v_id;
  insert into private.cnm_web_submissions(id,owner_id,scope_id,photos,video,policy_version) values(v_id,p_actor,(p_payload->>'scopeId')::uuid,p_payload->'photos',nullif(p_payload->'video','null'::jsonb),p_payload->>'policyVersion') returning reference into v_reference;
  v_result=jsonb_build_object('stored',true,'reference',v_reference);
 elsif p_action='submission.list' then
  select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(q)),'[]')) into v_result from (select s.id,w.reference,s.submitter_name as name,s.submitter_email as email,s.language as locale,s.title,s.body,s.status,s.created_at,w.updated_at,w.photos,w.video,w.note from public.article_submissions s join private.cnm_web_submissions w on w.id=s.id order by s.created_at desc limit 100) q;return v_result;
 elsif p_action='submission.update' then
  if p_payload->>'status' not in('pending','reviewing','accepted','rejected') or length(coalesce(p_payload->>'note',''))>5000 then raise exception using errcode='22023',message='invalid_request';end if;
  v_id=(p_payload->>'id')::uuid;update private.cnm_web_submissions set note=coalesce(p_payload->>'note',''),updated_at=clock_timestamp() where id=v_id and updated_at=(p_payload->>'expectedUpdatedAt')::timestamptz;
  if not found then raise exception using errcode='40001',message='conflict';end if;
  update public.article_submissions set status=p_payload->>'status',updated_at=clock_timestamp() where id=v_id;v_result=jsonb_build_object('ok',true);
 elsif p_action='submission.media' then
  select jsonb_build_object('media',coalesce(jsonb_agg(to_jsonb(m)),'[]')) into v_result from private.cnm_web_submissions s cross join lateral jsonb_array_elements(s.photos) p join private.cnm_web_media m on m.id=(p->>'uploadId')::uuid and m.owner_id=s.owner_id and m.scope_id=s.scope_id where s.id=(p_payload->>'id')::uuid;return v_result;
 elsif p_action='station.update' then
  update public.station_config set primary_stream_url=nullif(p_payload->>'primary_stream_url',''),low_data_stream_url=nullif(p_payload->>'low_data_stream_url',''),stream_enabled=coalesce((p_payload->>'stream_enabled')::boolean,false),donation_url=nullif(p_payload->>'donation_url',''),updated_at=clock_timestamp() where singleton=true;
  if not found then raise exception using errcode='22023',message='not_configured';end if;
  v_result=jsonb_build_object('ok',true);
 elsif p_action in('radio.song','radio.dedication') then
  perform private.cnm_web_limit_v2(v_scope,'radio',8,1800);perform private.cnm_web_limit_v2('global','radio',500,3600);
  select email into v_email from auth.users where id=p_actor;
  if p_action='radio.song' then insert into public.song_requests(user_id,requester_name,requester_email,language,song_title,artist,message,status) values(p_actor,p_payload->>'name',v_email,p_payload->>'locale',p_payload->>'title',nullif(p_payload->>'artist',''),nullif(p_payload->>'message',''),'pending');
  else insert into public.dedications(user_id,sender_name,sender_email,recipient_name,language,message,song_title,artist,status) values(p_actor,p_payload->>'name',v_email,p_payload->>'recipient',p_payload->>'locale',p_payload->>'message',nullif(p_payload->>'title',''),nullif(p_payload->>'artist',''),'pending');end if;
  v_result=jsonb_build_object('stored',true,'reference',gen_random_uuid());
 else raise exception using errcode='22023',message='invalid_action';end if;
 insert into private.cnm_web_receipts(scope,request_id,fingerprint,action,request_payload,response) values(v_scope,p_request_id,v_hash,p_action,p_payload,v_result);
 return v_result;
end $$;
revoke all on function public.cnm_web_service_v2(uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.cnm_web_service_v2(uuid,text,jsonb,uuid) to service_role;

-- New official delivery paths cannot be overwritten via the old client upload policy.
drop policy if exists cnm_media_admin_insert on storage.objects;
create policy cnm_media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='cnm-media' and name not like 'web-v2/%' and (select private.is_admin()));
drop policy if exists cnm_media_admin_update on storage.objects;
create policy cnm_media_admin_update on storage.objects for update to authenticated using(bucket_id='cnm-media' and name not like 'web-v2/%' and (select private.is_admin())) with check(bucket_id='cnm-media' and name not like 'web-v2/%' and (select private.is_admin()));
drop policy if exists cnm_media_admin_delete on storage.objects;
create policy cnm_media_admin_delete on storage.objects for delete to authenticated using(bucket_id='cnm-media' and name not like 'web-v2/%' and (select private.is_admin()));

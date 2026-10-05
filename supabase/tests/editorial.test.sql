\set ON_ERROR_STOP on
-- These records exist ONLY in the isolated CI database.
insert into auth.users(id,email) values
('10000000-0000-4000-8000-000000000001','ordinary-a@example.invalid'),
('10000000-0000-4000-8000-000000000002','ordinary-b@example.invalid'),
('10000000-0000-4000-8000-000000000003','editor@example.invalid'),
('10000000-0000-4000-8000-000000000004','admin-a@example.invalid'),
('10000000-0000-4000-8000-000000000005','admin-b@example.invalid');
insert into private.user_roles values('10000000-0000-4000-8000-000000000003','editor'),('10000000-0000-4000-8000-000000000004','admin'),('10000000-0000-4000-8000-000000000005','super_admin');
do $$ begin
 if has_function_privilege('authenticated','public.cnm_web_service_v2(uuid,text,jsonb,uuid)','execute') or has_function_privilege('anon','public.cnm_web_service_v2(uuid,text,jsonb,uuid)','execute') then raise exception 'Client can invoke privileged RPC';end if;
 if has_table_privilege('authenticated','private.cnm_web_drafts','select') then raise exception 'Client can read private drafts';end if;
end $$;
do $$ declare a uuid='10000000-0000-4000-8000-000000000004';b uuid='10000000-0000-4000-8000-000000000005';d uuid='20000000-0000-4000-8000-000000000001';r jsonb;replay jsonb;pub jsonb;snap jsonb='{"slug":"test-story","category_id":null,"author_credit":"Test author","title_i18n":{"en":"Test story"},"excerpt_i18n":{"en":"Summary"},"body_i18n":{"en":"Test body"},"photos":[],"video":null,"is_sponsored":false,"sponsor_credit":""}'; first_publication timestamptz;
begin
 begin perform public.cnm_web_service_v2('10000000-0000-4000-8000-000000000001','draft.list','{}',gen_random_uuid());raise exception 'ordinary user authorized';exception when insufficient_privilege then null;end;
 begin perform public.cnm_web_service_v2('10000000-0000-4000-8000-000000000003','draft.list','{}',gen_random_uuid());raise exception 'legacy editor authorized';exception when insufficient_privilege then null;end;
 r=public.cnm_web_service_v2(a,'draft.save',jsonb_build_object('id',d,'expectedRevision',0,'articleId',null,'baseUpdatedAt',null,'snapshot',snap),'30000000-0000-4000-8000-000000000001');
 replay=public.cnm_web_service_v2(a,'draft.save',jsonb_build_object('id',d,'expectedRevision',0,'articleId',null,'baseUpdatedAt',null,'snapshot',snap),'30000000-0000-4000-8000-000000000001');
 if r<>replay or (r->>'revision')::int<>1 then raise exception 'save not idempotent';end if;
 if exists(select 1 from public.articles) then raise exception 'private save publishes';end if;
 begin perform public.cnm_web_service_v2(b,'draft.get',jsonb_build_object('id',d),gen_random_uuid());raise exception 'other admin reads private draft';exception when insufficient_privilege then null;end;
 begin perform public.cnm_web_service_v2(a,'draft.save',jsonb_build_object('id',d,'expectedRevision',0,'articleId',null,'snapshot',snap),gen_random_uuid());raise exception 'stale save allowed';exception when serialization_failure then null;end;
 pub=public.cnm_web_service_v2(a,'draft.finalize',jsonb_build_object('id',d,'expectedRevision',1,'baseUpdatedAt',null,'assets','[]'::jsonb),'30000000-0000-4000-8000-000000000002');
 first_publication=(select published_at from public.articles where id=(pub->>'articleId')::uuid);
 if first_publication is null or (select body_i18n->>'en' from public.articles where id=(pub->>'articleId')::uuid)<>'Test body' then raise exception 'legacy article contract broken';end if;
 r=public.cnm_web_service_v2(a,'draft.get',jsonb_build_object('id',d),gen_random_uuid());
 snap=jsonb_set(snap,'{body_i18n,en}','"Private edit"');
 r=public.cnm_web_service_v2(a,'draft.save',jsonb_build_object('id',d,'expectedRevision',(r->>'revision')::int,'articleId',pub->>'articleId','baseUpdatedAt',r->>'baseUpdatedAt','snapshot',snap),gen_random_uuid());
 if (select body_i18n->>'en' from public.articles where id=(pub->>'articleId')::uuid)<>'Test body' then raise exception 'saving draft changes live content';end if;
 update public.articles set updated_at=updated_at+interval '1 second' where id=(pub->>'articleId')::uuid;
 begin perform public.cnm_web_service_v2(a,'draft.prepare',jsonb_build_object('id',d,'expectedRevision',(r->>'revision')::int,'baseUpdatedAt',r->>'baseUpdatedAt'),gen_random_uuid());raise exception 'legacy concurrent update overwritten';exception when serialization_failure then null;end;
 delete from private.user_roles where user_id=a;
 begin perform public.cnm_web_service_v2(a,'draft.get',jsonb_build_object('id',d),gen_random_uuid());raise exception 'revoked admin authorized';exception when insufficient_privilege then null;end;
end $$;
do $$ declare p jsonb='{"name":"Reader","email":"reader@example.invalid","category":"general","locale":"en","message":"Question","policyVersion":"contact-notice-2026-10-05"}';r jsonb;dup jsonb;begin
 r=public.cnm_web_service_v2(null,'inquiry.submit',p,'40000000-0000-4000-8000-000000000001');dup=public.cnm_web_service_v2(null,'inquiry.submit',p,'40000000-0000-4000-8000-000000000001');if r<>dup or (select count(*) from private.cnm_web_inquiries)<>1 then raise exception 'duplicate inquiry';end if;
 begin perform public.cnm_web_service_v2(null,'inquiry.list','{}',gen_random_uuid());raise exception 'guest reads inbox';exception when insufficient_privilege then null;end;
 begin perform public.cnm_web_service_v2(null,'inquiry.submit',jsonb_set(p,'{message}','"Changed"'),'40000000-0000-4000-8000-000000000001');raise exception 'idempotency payload reuse permitted';exception when serialization_failure then null;end;
end $$;
select 'CNM private role, draft, idempotency, revision and inbox tests passed' as result;

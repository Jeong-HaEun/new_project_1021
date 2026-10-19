-- 운영자 페이지 되돌리기 — 20261019010000_hanclass_admin.sql·20261019010100_hanclass_admin_functions.sql 적용 전 상태로 돌린다
-- 문제가 생겼을 때만 SQL Editor에서 실행한다. 운영자 명단·활동 기록·'취메' 표시는 지워지고, 글·댓글·신청 기록은 그대로 남는다

drop function if exists public.admin_delete_post(bigint, text);
drop function if exists public.admin_set_post_hidden(bigint, boolean, text);
drop function if exists public.admin_reported_posts();
drop function if exists public.admin_overview();

drop trigger if exists community_comments_official on public.community_comments;
drop trigger if exists community_posts_official on public.community_posts;
drop function if exists public.community_set_official();

alter table public.community_comments drop column if exists is_official;
alter table public.community_posts drop column if exists is_official;

drop table if exists public.hanclass_admin_log;
drop table if exists public.hanclass_admins;
drop function if exists public.hanclass_admin_role();
drop function if exists public.hanclass_admins_keep_super();

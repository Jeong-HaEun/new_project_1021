-- 공지 고정 되돌리기 — 20261020000000_community_pinned.sql 적용 전으로 (글은 남고 고정 표시만 사라진다)

drop trigger if exists community_posts_pin_guard on public.community_posts;
drop function if exists public.community_pin_guard();
revoke insert (is_pinned), update (is_pinned) on public.community_posts from authenticated;
alter table public.community_posts drop column if exists is_pinned;

-- 커뮤니티 보호 되돌리기 — 20261019000000_community_guard.sql 적용 전 상태로 돌린다
-- 문제가 생겼을 때만 SQL Editor에서 실행한다. 신고 기록은 지워지고, 숨겼던 글은 다시 모두 보인다. 글·댓글은 그대로 남는다

drop policy if exists "보이는 글의 댓글만 읽기" on public.community_comments;
create policy "커뮤니티 댓글은 누구나 읽기"
  on public.community_comments for select
  to anon, authenticated
  using (true);

drop policy if exists "숨기지 않은 글은 누구나, 숨긴 글은 본인만 읽기" on public.community_posts;
create policy "커뮤니티 글은 누구나 읽기"
  on public.community_posts for select
  to anon, authenticated
  using (true);

drop table if exists public.community_reports;
drop function if exists public.community_hide_reported();

drop trigger if exists community_comments_guard on public.community_comments;
drop function if exists public.community_comments_guard();
drop trigger if exists community_posts_guard on public.community_posts;
drop function if exists public.community_posts_guard();
drop function if exists public.community_has_personal_info(text);

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.community_set_updated_at();

alter table public.community_posts drop column if exists hidden;

-- 공지 고정 — 운영자(hanclass_admins)만 글을 커뮤니티 목록 맨 위에 고정한다 (SPEC.md '커뮤니티')
-- 운영자는 글쓰기·수정 화면의 [공지로 고정] 체크로 켜고 끈다. 본인 글만 수정할 수 있는 RLS는 그대로
-- 되돌리기: supabase/rollback/20261020000000_community_pinned_down.sql

alter table public.community_posts add column is_pinned boolean not null default false;

grant insert (is_pinned) on public.community_posts to authenticated;
grant update (is_pinned) on public.community_posts to authenticated;

-- 고정을 새로 켜는 건 운영자만. 이미 고정된 글을 수정하거나 고정을 푸는 건 막지 않는다
create function public.community_pin_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_pinned
    and (tg_op = 'INSERT' or not old.is_pinned)
    and public.hanclass_admin_role() is null then
    raise exception 'community_pin_admin_only';
  end if;
  return new;
end;
$$;

create trigger community_posts_pin_guard
  before insert or update of is_pinned on public.community_posts
  for each row execute function public.community_pin_guard();

revoke all on function public.community_pin_guard() from public, anon, authenticated;

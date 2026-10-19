-- 커뮤니티 보호 (SPEC.md '커뮤니티 보호') — 20261018000000_community.sql 다음에 적용
-- 1) 도배 방지: 한 사람이 10분에 글 5개·댓글 20개까지
-- 2) 서버 개인정보 검사: 전화번호·이메일이 든 글·댓글은 DB가 거절 (화면 검사를 건너뛴 요청도 막는다)
-- 3) 신고: 로그인한 사람이 남의 글을 한 번씩 신고, 3개가 쌓이면 숨김 (글쓴이 본인에게만 보임)
-- 기존 글·댓글은 지우지 않는다. 테이블 1개·칸 1개·함수·정책을 더하기만 한다. 되돌리기: supabase/rollback/20261019000000_community_guard_down.sql

-- 숨김 표시 — 글쓴이가 직접 바꿀 수 없다 (수정 가능한 칸 권한에 넣지 않음)
alter table public.community_posts add column hidden boolean not null default false;

-- 전화번호(휴대폰·지역번호·+82)·이메일이 있으면 true. 화면 규칙(src/lib/community.js)과 같은 기준
create function public.community_has_personal_info(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_text ~* '[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+'
      or p_text ~ '(^|[^0-9])(\+82[ -]?|0)(1[016789]|[2-6][0-9]?)[ .-]?[0-9]{3,4}[ .-]?[0-9]{4}([^0-9]|$)';
$$;

-- 글 보호: 추가 때 도배 방지, 추가·수정 때 개인정보 검사
create function public.community_posts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and (
    select count(*) from public.community_posts
    where user_id = (select auth.uid()) and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'community_rate_limited';
  end if;
  if public.community_has_personal_info(new.title || ' ' || new.body || ' ' || new.author_name) then
    raise exception 'community_personal_info';
  end if;
  return new;
end;
$$;

create trigger community_posts_guard
  before insert or update of title, body, author_name on public.community_posts
  for each row execute function public.community_posts_guard();

-- 댓글 보호: 추가 때 도배 방지·개인정보 검사 (댓글은 수정 기능이 없다)
create function public.community_comments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.community_comments
    where user_id = (select auth.uid()) and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'community_rate_limited';
  end if;
  if public.community_has_personal_info(new.body || ' ' || new.author_name) then
    raise exception 'community_personal_info';
  end if;
  return new;
end;
$$;

create trigger community_comments_guard
  before insert on public.community_comments
  for each row execute function public.community_comments_guard();

-- 수정 시각은 내용을 고쳤을 때만 바꾼다 (숨김 처리로 '수정됨'이 붙지 않게)
drop trigger community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
  before update of category, course_id, title, body, author_name on public.community_posts
  for each row execute function public.community_set_updated_at();

-- 신고
create table public.community_reports (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.community_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'personal', 'abuse', 'etc')),
  created_at timestamptz not null default now(),
  constraint community_reports_post_user_key unique (post_id, user_id)
);

comment on table public.community_reports is '한클래스 커뮤니티 신고 — 본인 신고만 조회, 남의 글만, 한 글에 한 번';

alter table public.community_reports enable row level security;
revoke all on public.community_reports from anon, authenticated;
grant select on public.community_reports to authenticated;
grant insert (post_id, reason) on public.community_reports to authenticated;

create policy "본인 신고만 조회"
  on public.community_reports for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "남의 글만 신고"
  on public.community_reports for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.community_posts p
      where p.id = community_reports.post_id and p.user_id = (select auth.uid())
    )
  );

-- 신고가 쌓이면 숨김 — 신고한 사람은 그 글의 주인이 아니라서 운영 권한(definer)으로 숨긴다
create function public.community_hide_reported()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.community_reports where post_id = new.post_id) >= 3 then
    update public.community_posts set hidden = true where id = new.post_id;
  end if;
  return new;
end;
$$;

revoke all on function public.community_hide_reported() from public, anon, authenticated;

create trigger community_reports_hide
  after insert on public.community_reports
  for each row execute function public.community_hide_reported();

-- 숨긴 글은 글쓴이 본인만 보인다. 그 글의 댓글도 함께 안 보인다
drop policy "커뮤니티 글은 누구나 읽기" on public.community_posts;
create policy "숨기지 않은 글은 누구나, 숨긴 글은 본인만 읽기"
  on public.community_posts for select
  to anon, authenticated
  using (not hidden or (select auth.uid()) = user_id);

drop policy "커뮤니티 댓글은 누구나 읽기" on public.community_comments;
create policy "보이는 글의 댓글만 읽기"
  on public.community_comments for select
  to anon, authenticated
  using (exists (select 1 from public.community_posts p where p.id = community_comments.post_id));

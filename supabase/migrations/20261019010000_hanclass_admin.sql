-- 운영자 페이지 (SPEC.md '운영자 페이지') — 20261019000000_community_guard.sql 다음에 적용
-- 1) 운영자 명단: 카카오 로그인만으로는 운영자가 되지 않는다. 최초 최고 관리자는 SQL Editor에서 사람이 직접 넣는다
-- 2) 운영자 글·댓글에 '취메' 표시 (브라우저가 보내지 않고 DB가 채운다), 일반 회원은 운영자처럼 보이는 닉네임 금지
-- 3) 회원 통계·신고 글 처리 함수는 다음 파일(20261019010100_hanclass_admin_functions.sql)
-- 4) 운영자 처리(숨김·해제·삭제)는 활동 기록(hanclass_admin_log)에 남긴다
-- 기존 글·댓글·신청 기록은 지우지 않는다. 테이블 2개·칸 2개·함수·트리거를 더하기만 한다
-- 되돌리기: supabase/rollback/20261019010000_hanclass_admin_down.sql (다음 파일 20261019010100_hanclass_admin_functions.sql까지 함께)

-- 운영자 명단 — 행이 없으면 일반 회원. 처음에는 최고 관리자(super_admin) 1명만 둔다
create table public.hanclass_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'super_admin' check (role in ('admin', 'super_admin')),
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);

comment on table public.hanclass_admins is '한클래스 운영자 명단 — 브라우저는 본인 행만 읽고, 쓰기는 SQL Editor로만';

alter table public.hanclass_admins enable row level security;
revoke all on public.hanclass_admins from anon, authenticated;
grant select on public.hanclass_admins to authenticated;

create policy "본인 운영자 정보만 조회"
  on public.hanclass_admins for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- 마지막 최고 관리자는 지우거나 낮출 수 없다
create function public.hanclass_admins_keep_super()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'super_admin' and (tg_op = 'DELETE' or new.role <> 'super_admin')
     and (select count(*) from public.hanclass_admins where role = 'super_admin') <= 1 then
    raise exception 'hanclass_last_super_admin';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger hanclass_admins_keep_super
  before update or delete on public.hanclass_admins
  for each row execute function public.hanclass_admins_keep_super();

-- 지금 로그인한 사람의 운영자 역할: null(일반 회원·비로그인) | 'admin' | 'super_admin'
-- 요청마다 명단을 읽으므로, 명단에서 빼면 기존 로그인으로도 바로 막힌다
create function public.hanclass_admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.hanclass_admins where user_id = (select auth.uid());
$$;

revoke all on function public.hanclass_admin_role() from public;
grant execute on function public.hanclass_admin_role() to anon, authenticated;

-- 운영자 활동 기록 — 함수 안에서만 쌓인다. 고치거나 지울 수 없다
create table public.hanclass_admin_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users (id) on delete set null,
  action text not null check (action in ('hide_post', 'unhide_post', 'delete_post')),
  target_id text not null,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);

alter table public.hanclass_admin_log enable row level security;
revoke all on public.hanclass_admin_log from anon, authenticated;
grant select on public.hanclass_admin_log to authenticated;

-- 최고 관리자는 전체, 운영자는 본인 기록만
create policy "운영자 활동 기록 조회"
  on public.hanclass_admin_log for select
  to authenticated
  using (public.hanclass_admin_role() = 'super_admin' or ((select auth.uid()) = actor and public.hanclass_admin_role() is not null));

-- '취메' 표시 — 운영자가 쓴 글·댓글. 브라우저에는 이 칸의 쓰기 권한이 없다
alter table public.community_posts add column is_official boolean not null default false;
alter table public.community_comments add column is_official boolean not null default false;

-- 추가 때 운영자 여부를 DB가 채운다. 일반 회원은 운영자처럼 보이는 닉네임을 쓸 수 없다
create function public.community_set_official()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_admin boolean := public.hanclass_admin_role() is not null;
begin
  if tg_op = 'INSERT' then
    new.is_official := is_admin;
  end if;
  if not is_admin and lower(regexp_replace(new.author_name, '\s', '', 'g')) ~ '(취메|취업메이트|운영자|운영진|관리자|한클래스|admin)' then
    raise exception 'community_reserved_name';
  end if;
  return new;
end;
$$;

create trigger community_posts_official
  before insert or update of author_name on public.community_posts
  for each row execute function public.community_set_official();

create trigger community_comments_official
  before insert on public.community_comments
  for each row execute function public.community_set_official();

revoke all on function public.hanclass_admins_keep_super() from public, anon, authenticated;
revoke all on function public.community_set_official() from public, anon, authenticated;

-- 최초 최고 관리자 지정 (두 파일을 적용한 뒤 SQL Editor에서 따로 한 번 실행)
-- 운영자 페이지(admin.html)에 로그인하면 보이는 '내 계정 ID'를 넣는다
-- insert into public.hanclass_admins (user_id, role) values ('내-계정-ID', 'super_admin');

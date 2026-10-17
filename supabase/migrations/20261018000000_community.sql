-- 커뮤니티 글·댓글 (SPEC.md '커뮤니티')
-- 세시드와 함께 쓰는 프로젝트라 다른 테이블(posts 등)과 겹치지 않게 community_ 이름을 쓴다
-- 읽기는 누구나, 쓰기는 로그인한 사람만, 수정·삭제는 본인 것만 (RLS)
-- 글쓴이 표시는 사용자가 직접 정한 닉네임(author_name)만. 카카오 이름·이메일은 저장하지 않는다

create table public.community_posts (
  id bigint generated always as identity primary key,
  -- 브라우저가 보내지 않는다. 로그인한 사용자의 id가 기본값으로 들어가고 RLS가 한 번 더 검증한다
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in ('outcome', 'question', 'free')),
  course_id text check (course_id ~ '^c[0-9]{3}$'),
  title text not null check (char_length(title) between 2 and 60),
  body text not null check (char_length(body) between 5 and 2000),
  author_name text not null check (char_length(author_name) between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_posts_created_at_idx on public.community_posts (created_at desc);

create table public.community_comments (
  id bigint generated always as identity primary key,
  -- 글이 지워지면 댓글도 함께 지워진다
  post_id bigint not null references public.community_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  author_name text not null check (char_length(author_name) between 1 and 12),
  created_at timestamptz not null default now()
);

create index community_comments_post_id_idx on public.community_comments (post_id, created_at);

comment on table public.community_posts is '한클래스 커뮤니티 글 — 읽기 공개, 쓰기 로그인, 수정·삭제 본인';
comment on table public.community_comments is '한클래스 커뮤니티 댓글 — 읽기 공개, 쓰기 로그인, 삭제 본인 (수정 없음)';

-- 수정 시각은 서버가 채운다 (브라우저가 보낸 값은 쓰지 않음)
create function public.community_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.community_set_updated_at();

-- 권한: 기본 권한을 모두 빼고 필요한 것만 준다
-- 추가·수정은 정해진 칸만 (user_id·created_at·updated_at은 브라우저가 바꿀 수 없다)
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

revoke all on public.community_posts from anon, authenticated;
revoke all on public.community_comments from anon, authenticated;

grant select on public.community_posts to anon, authenticated;
grant insert (category, course_id, title, body, author_name) on public.community_posts to authenticated;
grant update (category, course_id, title, body, author_name) on public.community_posts to authenticated;
grant delete on public.community_posts to authenticated;

grant select on public.community_comments to anon, authenticated;
grant insert (post_id, body, author_name) on public.community_comments to authenticated;
grant delete on public.community_comments to authenticated;

-- 글
create policy "커뮤니티 글은 누구나 읽기"
  on public.community_posts for select
  to anon, authenticated
  using (true);

create policy "로그인한 본인 이름으로만 글쓰기"
  on public.community_posts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "본인 글만 수정"
  on public.community_posts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "본인 글만 삭제"
  on public.community_posts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 댓글
create policy "커뮤니티 댓글은 누구나 읽기"
  on public.community_comments for select
  to anon, authenticated
  using (true);

create policy "로그인한 본인 이름으로만 댓글쓰기"
  on public.community_comments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "본인 댓글만 삭제"
  on public.community_comments for delete
  to authenticated
  using ((select auth.uid()) = user_id);

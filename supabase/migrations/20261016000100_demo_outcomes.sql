-- 결과물 완성 체크 (SPEC.md 5절) — 같은 계정이면 어느 기기에서나 같은 체크 상태
-- 본인이 데모 수강 신청한 강의만 체크할 수 있다 (서버에서 검증). 체크 취소는 행 삭제

create table public.demo_outcomes (
  id bigint generated always as identity primary key,
  -- 브라우저가 보내지 않는다. 로그인한 사용자의 id가 기본값으로 들어가고 RLS가 한 번 더 검증한다
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id text not null check (course_id ~ '^c[0-9]{3}$'),
  completed_at timestamptz not null default now(),
  constraint demo_outcomes_user_course_key unique (user_id, course_id)
);

comment on table public.demo_outcomes is '데모 결과물 완성 체크 — 본인이 데모 수강 신청한 강의만';

alter table public.demo_outcomes enable row level security;

revoke all on public.demo_outcomes from anon;
revoke all on public.demo_outcomes from authenticated;
grant select, insert, delete on public.demo_outcomes to authenticated;

create policy "본인 완성 체크만 조회"
  on public.demo_outcomes for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- 본인 + 본인이 데모 수강 신청한 강의일 때만 추가
create policy "신청한 강의만 완성 체크"
  on public.demo_outcomes for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.demo_enrollments e
      where e.user_id = (select auth.uid()) and e.course_id = demo_outcomes.course_id
    )
  );

create policy "본인 완성 체크만 취소"
  on public.demo_outcomes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

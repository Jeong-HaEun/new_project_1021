-- 데모 수강 신청 기록 (SPEC.md 5절)
-- 실제 결제가 없는 '데모 수강 신청'이다. 실제 구매·유료 콘텐츠 권한으로 쓰지 않는다
-- 사용자는 본인 기록만 조회·추가할 수 있다. 수정·삭제 정책은 두지 않는다 (필요해지면 따로 검토)

create table public.demo_enrollments (
  id bigint generated always as identity primary key,
  -- 브라우저가 보내지 않는다. 로그인한 사용자의 id가 기본값으로 들어가고 RLS가 한 번 더 검증한다
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id text not null check (course_id ~ '^c[0-9]{3}$'),
  enrolled_at timestamptz not null default now(),
  -- 같은 강의 중복 신청 방지
  constraint demo_enrollments_user_course_key unique (user_id, course_id)
);

comment on table public.demo_enrollments is '데모 수강 신청 기록 — 실제 결제·구매 아님. 유료 콘텐츠 권한으로 사용 금지';

alter table public.demo_enrollments enable row level security;

-- 로그인하지 않은 사용자(anon)는 아무것도 못 한다
revoke all on public.demo_enrollments from anon;
revoke all on public.demo_enrollments from authenticated;
grant select, insert on public.demo_enrollments to authenticated;

create policy "본인 데모 수강 기록만 조회"
  on public.demo_enrollments for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "본인 데모 수강 기록만 추가"
  on public.demo_enrollments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

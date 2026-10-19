-- 데모 수강 신청은 열린 강의만 (SPEC.md 5절) — 20261016000000_demo_enrollments.sql의 추가 정책을 바꾼다
-- 화면은 이미 열린 강의만 신청하게 하지만, API를 직접 부르면 제작 예정 강의도 신청돼 운영 통계가 오염될 수 있었다
-- 열린 강의 목록은 강의 데이터(src/data/courses의 status: 'open')와 같아야 한다 → tests/demoEnrollmentPolicy.test.js가 검사
-- 강의를 열거나 닫으면 이 목록을 고친 새 SQL을 적용한다. 이미 있는 신청 기록은 지우지 않는다
-- 되돌리기: supabase/rollback/20261019030000_demo_enrollments_open_only_down.sql

drop policy "본인 데모 수강 기록만 추가" on public.demo_enrollments;

create policy "본인 데모 수강 기록만 추가 (열린 강의만)"
  on public.demo_enrollments for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and course_id in ('c002', 'c003')
  );

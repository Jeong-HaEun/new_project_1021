-- 열린 강의만 신청 되돌리기 — 20261019030000_demo_enrollments_open_only.sql 적용 전 정책으로 돌린다

drop policy if exists "본인 데모 수강 기록만 추가 (열린 강의만)" on public.demo_enrollments;

create policy "본인 데모 수강 기록만 추가"
  on public.demo_enrollments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

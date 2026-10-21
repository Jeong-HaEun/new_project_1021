-- 데모 수강 취소 — 로그인한 사람이 본인의 데모 수강 기록만 지울 수 있게 한다 (SPEC.md '데모 수강 취소')
-- 실제 결제가 없는 데모라 돈을 돌려주는 환불이 아니다. 발표 시연을 다시 할 수 있게 기록만 지운다
-- 결과물 완성 체크(demo_outcomes)는 이미 본인 것만 지울 수 있다 (20261016000100_demo_outcomes.sql). 화면이 먼저 지운다
-- 운영자 회원 통계의 데모 신청 수는 취소한 만큼 줄어든다 (매출이 아니므로 그대로 둔다)
-- 되돌리기: supabase/rollback/20261021010000_demo_enrollments_cancel_down.sql

grant delete on public.demo_enrollments to authenticated;

create policy "본인 데모 수강 기록만 취소"
  on public.demo_enrollments for delete
  to authenticated
  using ((select auth.uid()) = user_id);

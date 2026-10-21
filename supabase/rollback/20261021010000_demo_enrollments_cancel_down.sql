-- 데모 수강 취소 되돌리기 — 본인 삭제 정책과 삭제 권한을 거둔다 (이미 지운 기록은 돌아오지 않는다)
drop policy if exists "본인 데모 수강 기록만 취소" on public.demo_enrollments;
revoke delete on public.demo_enrollments from authenticated;

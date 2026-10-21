-- 출석 포인트·회원 등급·월 쿠폰 되돌리기 (20261021000000_hanclass_rewards.sql)
-- ⚠ 출석·포인트·쿠폰 기록이 모두 지워진다. 다른 한클래스·세시드 표는 그대로
drop function if exists public.hanclass_use_order_rewards(text[], integer, boolean);
drop function if exists public.hanclass_check_in();
drop function if exists public.hanclass_get_rewards();
drop function if exists public.hanclass_tier_coupon(text);
drop function if exists public.hanclass_tier(integer);
drop table if exists public.hanclass_coupons;
drop table if exists public.hanclass_point_ledger;
drop table if exists public.hanclass_attendance;

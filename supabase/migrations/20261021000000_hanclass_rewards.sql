-- 출석 포인트·회원 등급·월 쿠폰 (SPEC.md '출석 포인트·회원 등급')
-- 세시드와 같은 프로젝트라 hanclass_ 이름으로 구분한다. 기존 표는 건드리지 않고 더하기만 한다
-- 브라우저는 세 표를 본인 것만 읽을 수 있고, 쓰기는 아래 security definer 함수로만 한다
-- (하루 1회·잔액 부족·쿠폰 중복 사용을 DB가 검사 → 브라우저를 조작해도 포인트를 만들 수 없다)
-- 숫자 기준은 src/lib/rewards.js와 같아야 한다 (tests/rewardsDb.test.js가 검사)
-- 날짜 기준은 한국 날짜. 포인트·쿠폰은 데모 할인이며 실제 돈이 아니다
-- 되돌리기: supabase/rollback/20261021000000_hanclass_rewards_down.sql

-- 출석: 한 사람이 하루(한국 날짜) 한 줄
create table public.hanclass_attendance (
  user_id uuid not null references auth.users (id) on delete cascade,
  attended_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, attended_on)
);

-- 포인트 장부: 적립(+)·사용(-) 기록을 쌓고, 잔액은 합계로 계산한다 (고치거나 지우지 않음)
create table public.hanclass_point_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (reason in ('attendance', 'order_use')),
  created_at timestamptz not null default now()
);
create index hanclass_point_ledger_user_idx on public.hanclass_point_ledger (user_id);

-- 쿠폰 사용 기록: 한 사람이 한 달에 한 장. 금액은 쓰는 순간의 등급으로 정한다
create table public.hanclass_coupons (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  coupon_month date not null check (extract(day from coupon_month) = 1),
  tier text not null check (tier in ('grow', 'pro', 'master')),
  amount integer not null check (amount in (100, 300, 500)),
  used_at timestamptz not null default now(),
  unique (user_id, coupon_month)
);

alter table public.hanclass_attendance enable row level security;
alter table public.hanclass_point_ledger enable row level security;
alter table public.hanclass_coupons enable row level security;

revoke all on public.hanclass_attendance from anon, authenticated;
revoke all on public.hanclass_point_ledger from anon, authenticated;
revoke all on public.hanclass_coupons from anon, authenticated;
grant select on public.hanclass_attendance to authenticated;
grant select on public.hanclass_point_ledger to authenticated;
grant select on public.hanclass_coupons to authenticated;

create policy "본인 출석만 조회"
  on public.hanclass_attendance for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "본인 포인트 장부만 조회"
  on public.hanclass_point_ledger for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "본인 쿠폰만 조회"
  on public.hanclass_coupons for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- 등급: 이번 달 출석일 수 → 새싹(0~4) / 성장(5~9) / 실무(10~19) / 마스터(20~)
create or replace function public.hanclass_tier(p_days integer)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_days >= 20 then 'master'
    when p_days >= 10 then 'pro'
    when p_days >= 5 then 'grow'
    else 'sprout'
  end;
$$;

-- 등급별 이번 달 쿠폰 금액(원). 새싹은 쿠폰 없음
create or replace function public.hanclass_tier_coupon(p_tier text)
returns integer language sql immutable set search_path = '' as $$
  select case p_tier
    when 'master' then 500
    when 'pro' then 300
    when 'grow' then 100
    else 0
  end;
$$;

-- 내 포인트·출석·등급·쿠폰 요약
create or replace function public.hanclass_get_rewards()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  month_start date := date_trunc('month', today)::date;
  days integer;
  v_tier text;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  select count(*) into days from public.hanclass_attendance
    where user_id = uid and attended_on between month_start and today;
  v_tier := public.hanclass_tier(days);
  return jsonb_build_object(
    'today', today,
    'balance', (select coalesce(sum(amount), 0) from public.hanclass_point_ledger where user_id = uid),
    'month_days', days,
    'attended_today', exists (select 1 from public.hanclass_attendance where user_id = uid and attended_on = today),
    'tier', v_tier,
    'coupon_amount', public.hanclass_tier_coupon(v_tier),
    'coupon_used', exists (select 1 from public.hanclass_coupons where user_id = uid and coupon_month = month_start)
  );
end;
$$;

-- 출석 체크: 오늘 처음이면 출석 + 10P. 이미 했으면 아무것도 바꾸지 않는다 (checked_in = false)
create or replace function public.hanclass_check_in()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  added boolean;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  perform pg_advisory_xact_lock(hashtext('hanclass_rewards'), hashtext(uid::text));
  insert into public.hanclass_attendance (user_id, attended_on) values (uid, today)
    on conflict (user_id, attended_on) do nothing;
  added := found;
  if added then
    insert into public.hanclass_point_ledger (user_id, amount, reason) values (uid, 10, 'attendance');
  end if;
  return public.hanclass_get_rewards() || jsonb_build_object('checked_in', added);
end;
$$;

-- 데모 주문에 쿠폰·포인트 쓰기. 금액은 브라우저가 보낸 값이 아니라 아래 가격표로 다시 계산한다
-- 가격표 = 데모 주문할 수 있는 열린 강의(src/data/courses의 status: 'open')와 가격. 강의를 열거나 가격을 바꾸면 새 SQL 필요
-- 하나라도 거절되면(잔액 부족·쿠폰 이미 씀 등) 전부 취소된다
create or replace function public.hanclass_use_order_rewards(p_course_ids text[], p_points integer, p_use_coupon boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
  month_start date := date_trunc('month', today)::date;
  ids text[];
  matched integer;
  total integer;
  v_tier text;
  coupon integer := 0;
  balance integer;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if p_points is null or p_points < 0 then
    raise exception 'invalid_points';
  end if;
  select array_agg(distinct id) into ids from unnest(p_course_ids) as id;
  if ids is null or cardinality(ids) > 10 then
    raise exception 'invalid_order';
  end if;
  select count(*), coalesce(sum(p.price), 0) into matched, total
    from unnest(ids) as i (id)
    join (values ('c002', 1000), ('c003', 2000)) as p (id, price) using (id);
  if matched <> cardinality(ids) then
    raise exception 'invalid_order';
  end if;

  perform pg_advisory_xact_lock(hashtext('hanclass_rewards'), hashtext(uid::text));

  if p_use_coupon then
    select public.hanclass_tier(count(*)::integer) into v_tier from public.hanclass_attendance
      where user_id = uid and attended_on between month_start and today;
    if public.hanclass_tier_coupon(v_tier) = 0 then
      raise exception 'coupon_unavailable';
    end if;
    insert into public.hanclass_coupons (user_id, coupon_month, tier, amount)
      values (uid, month_start, v_tier, public.hanclass_tier_coupon(v_tier))
      on conflict (user_id, coupon_month) do nothing;
    if not found then
      raise exception 'coupon_used';
    end if;
    coupon := least(public.hanclass_tier_coupon(v_tier), total);
  end if;

  if p_points > total - coupon then
    raise exception 'points_over_total';
  end if;
  select coalesce(sum(amount), 0) into balance from public.hanclass_point_ledger where user_id = uid;
  if p_points > balance then
    raise exception 'insufficient_points';
  end if;
  if p_points > 0 then
    insert into public.hanclass_point_ledger (user_id, amount, reason) values (uid, -p_points, 'order_use');
  end if;

  return jsonb_build_object(
    'total', total,
    'coupon_discount', coupon,
    'points_used', p_points,
    'final_total', total - coupon - p_points,
    'balance', balance - p_points
  );
end;
$$;

revoke all on function public.hanclass_get_rewards() from public, anon;
revoke all on function public.hanclass_check_in() from public, anon;
revoke all on function public.hanclass_use_order_rewards(text[], integer, boolean) from public, anon;
grant execute on function public.hanclass_get_rewards() to authenticated;
grant execute on function public.hanclass_check_in() to authenticated;
grant execute on function public.hanclass_use_order_rewards(text[], integer, boolean) to authenticated;

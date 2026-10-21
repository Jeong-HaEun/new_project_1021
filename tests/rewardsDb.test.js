// 출석 포인트·등급·쿠폰 DB 규칙 — 본인만 읽기, 쓰기는 DB 함수로만, 숫자 기준이 화면과 같다 (SPEC.md '출석 포인트·회원 등급')
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ATTENDANCE_POINTS, TIERS } from '../src/lib/rewards.js';
import { COURSES } from '../src/data/courses/index.js';

const read = (name) => readFileSync(join(import.meta.dirname, '..', 'supabase', name), 'utf8').toLowerCase();
const sql = read('migrations/20261021000000_hanclass_rewards.sql');
const rollback = read('rollback/20261021000000_hanclass_rewards_down.sql');
const TABLES = ['hanclass_attendance', 'hanclass_point_ledger', 'hanclass_coupons'];
const FUNCTIONS = ['hanclass_get_rewards()', 'hanclass_check_in()', 'hanclass_use_order_rewards(text[], integer, boolean)'];

describe('표 권한', () => {
  it.each(TABLES)('%s — RLS, anon 없음, 로그인한 사람은 조회만', (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toContain(`revoke all on public.${table} from anon, authenticated`);
    expect(sql).toContain(`grant select on public.${table} to authenticated`);
    expect(sql).not.toMatch(new RegExp(`grant (insert|update|delete|all)[^;]*public\\.${table}`));
  });
  it('조회 정책 3개 모두 본인만, 쓰기 정책은 없다', () => {
    expect(sql.match(/for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/g).length).toBe(3);
    expect(sql).not.toMatch(/for (insert|update|delete|all)/);
  });
  it('하루 출석 1번, 한 달 쿠폰 1장 (DB 제약)', () => {
    expect(sql).toContain('primary key (user_id, attended_on)');
    expect(sql).toContain('unique (user_id, coupon_month)');
  });
  it('기존 데이터를 지우지 않는다', () => {
    expect(sql).not.toMatch(/drop table|truncate|delete from/);
  });
});

describe('DB 함수', () => {
  it.each(FUNCTIONS)('%s — 로그인한 사람만 실행', (fn) => {
    expect(sql).toContain(`revoke all on function public.${fn} from public, anon`);
    expect(sql).toContain(`grant execute on function public.${fn} to authenticated`);
  });
  it('쓰기 함수는 security definer, 검색 경로 고정, 로그인 확인', () => {
    expect(sql.match(/security definer set search_path = ''/g).length).toBe(3);
    expect(sql.match(/raise exception 'not_signed_in'/g).length).toBe(3);
  });
  it('한국 날짜 기준', () => {
    expect(sql.match(/now\(\) at time zone 'asia\/seoul'/g).length).toBe(3);
  });
  it('출석 적립은 화면과 같은 포인트', () => {
    expect(sql).toContain(`values (uid, ${ATTENDANCE_POINTS}, 'attendance')`);
  });
  it('잔액 부족·결제 금액 초과·쿠폰 중복·쿠폰 없는 등급을 DB가 거절', () => {
    ['insufficient_points', 'points_over_total', 'coupon_used', 'coupon_unavailable', 'invalid_order', 'invalid_points'].forEach((code) =>
      expect(sql).toContain(`raise exception '${code}'`),
    );
  });
  it('같은 사람의 요청이 겹쳐도 한 번씩 처리 (잠금)', () => {
    expect(sql.match(/pg_advisory_xact_lock\(hashtext\('hanclass_rewards'\), hashtext\(uid::text\)\)/g).length).toBe(2);
  });
});

describe('숫자 기준이 화면(rewards.js)과 같다', () => {
  it('등급 출석일 기준', () => {
    TIERS.filter((tier) => tier.minDays > 0).forEach((tier) => {
      expect(sql).toContain(`when p_days >= ${tier.minDays} then '${tier.id}'`);
    });
    expect(sql).toContain("else 'sprout'");
  });
  it('등급별 쿠폰 금액', () => {
    TIERS.filter((tier) => tier.coupon > 0).forEach((tier) => {
      expect(sql).toContain(`when '${tier.id}' then ${tier.coupon}`);
    });
    const amounts = TIERS.filter((tier) => tier.coupon > 0).map((tier) => tier.coupon).join(', ');
    expect(sql).toContain(`check (amount in (${amounts}))`);
  });
  it('주문 가격표 = 열린 강의와 가격', () => {
    const expected = COURSES.filter((course) => course.status === 'open').map((course) => `('${course.id}', ${course.price})`).join(', ');
    expect(sql).toContain(`join (values ${expected}) as p (id, price)`);
  });
});

describe('되돌리기', () => {
  it('함수 5개와 표 3개만 지운다', () => {
    expect(rollback.match(/drop function if exists/g).length).toBe(5);
    TABLES.forEach((table) => expect(rollback).toContain(`drop table if exists public.${table}`));
    expect(rollback.match(/drop table/g).length).toBe(3);
  });
});

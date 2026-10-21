// 출석 포인트·회원 등급·월 쿠폰 순수 로직 (SPEC.md '출석 포인트·회원 등급')
import { describe, it, expect } from 'vitest';
import {
  ATTENDANCE_POINTS,
  calcOrderDiscount,
  getNextTier,
  getTierRange,
  getTier,
  normalizeRewards,
  rewardErrorText,
  TIERS,
  toKstDate,
} from '../src/lib/rewards.js';

describe('출석 포인트', () => {
  it('하루 출석은 10P', () => {
    expect(ATTENDANCE_POINTS).toBe(10);
  });
});

describe('getTier — 이번 달 출석일 수로 등급', () => {
  it.each([
    [0, 'sprout', '새싹', 0],
    [4, 'sprout', '새싹', 0],
    [5, 'grow', '성장', 100],
    [9, 'grow', '성장', 100],
    [10, 'pro', '실무', 300],
    [19, 'pro', '실무', 300],
    [20, 'master', '마스터', 500],
    [31, 'master', '마스터', 500],
  ])('%i일 → %s', (days, id, label, coupon) => {
    expect(getTier(days)).toMatchObject({ id, label, coupon });
  });

  it('이상한 값(음수·숫자 아님)은 새싹', () => {
    expect(getTier(-3).id).toBe('sprout');
    expect(getTier('abc').id).toBe('sprout');
    expect(getTier(undefined).id).toBe('sprout');
  });

  it('등급은 4단계, 출석일 기준이 커지는 순서', () => {
    expect(TIERS.map((tier) => tier.minDays)).toEqual([0, 5, 10, 20]);
  });
});

describe('getTierRange — 등급 안내의 출석일 범위', () => {
  it.each([
    ['sprout', '0~4일'],
    ['grow', '5~9일'],
    ['pro', '10~19일'],
    ['master', '20일 이상'],
  ])('%s → %s', (id, text) => {
    expect(getTierRange(TIERS.find((tier) => tier.id === id))).toBe(text);
  });
});

describe('getNextTier — 다음 등급까지 남은 출석일', () => {
  it('새싹 3일 → 성장까지 2일', () => {
    expect(getNextTier(3)).toMatchObject({ tier: { id: 'grow' }, daysLeft: 2 });
  });
  it('실무 12일 → 마스터까지 8일', () => {
    expect(getNextTier(12)).toMatchObject({ tier: { id: 'master' }, daysLeft: 8 });
  });
  it('마스터면 다음 등급 없음', () => {
    expect(getNextTier(25)).toBeNull();
  });
});

describe('toKstDate — 한국 날짜', () => {
  it('UTC 15:00 이후는 한국에서 다음 날', () => {
    expect(toKstDate(new Date('2026-10-20T15:00:00Z'))).toBe('2026-10-21');
    expect(toKstDate(new Date('2026-10-20T14:59:59Z'))).toBe('2026-10-20');
  });
  it('달이 바뀌는 순간', () => {
    expect(toKstDate(new Date('2026-10-31T15:00:00Z'))).toBe('2026-11-01');
  });
});

describe('calcOrderDiscount — 쿠폰 먼저, 그다음 포인트', () => {
  const base = { total: 3000, balance: 120, couponAmount: 300, couponUsed: false };

  it('할인 없음', () => {
    expect(calcOrderDiscount({ ...base, points: 0, useCoupon: false })).toEqual({
      coupon: 0, points: 0, finalTotal: 3000, maxPoints: 120,
    });
  });

  it('쿠폰 + 포인트', () => {
    expect(calcOrderDiscount({ ...base, points: 50, useCoupon: true })).toEqual({
      coupon: 300, points: 50, finalTotal: 2650, maxPoints: 120,
    });
  });

  it('잔액보다 많이 못 쓴다', () => {
    expect(calcOrderDiscount({ ...base, points: 999, useCoupon: false }).points).toBe(120);
  });

  it('결제 금액보다 많이 못 쓰고, 0원 아래로 안 내려간다', () => {
    const result = calcOrderDiscount({ total: 1000, balance: 5000, couponAmount: 500, couponUsed: false, points: 5000, useCoupon: true });
    expect(result).toEqual({ coupon: 500, points: 500, finalTotal: 0, maxPoints: 500 });
  });

  it('쿠폰이 결제 금액보다 크면 결제 금액까지만', () => {
    expect(calcOrderDiscount({ total: 200, balance: 0, couponAmount: 300, couponUsed: false, points: 0, useCoupon: true }).coupon).toBe(200);
  });

  it('이미 쓴 쿠폰·쿠폰 없는 등급은 적용하지 않는다', () => {
    expect(calcOrderDiscount({ ...base, couponUsed: true, points: 0, useCoupon: true }).coupon).toBe(0);
    expect(calcOrderDiscount({ ...base, couponAmount: 0, points: 0, useCoupon: true }).coupon).toBe(0);
  });

  it('소수·음수·글자 포인트는 정수로 내리거나 0', () => {
    expect(calcOrderDiscount({ ...base, points: 10.7, useCoupon: false }).points).toBe(10);
    expect(calcOrderDiscount({ ...base, points: -5, useCoupon: false }).points).toBe(0);
    expect(calcOrderDiscount({ ...base, points: 'abc', useCoupon: false }).points).toBe(0);
  });
});

describe('normalizeRewards — 서버 응답 정리', () => {
  it('정상 응답', () => {
    const rewards = normalizeRewards({
      today: '2026-10-21', balance: 30, month_days: 5, attended_today: true, coupon_amount: 100, coupon_used: false, checked_in: true,
    });
    expect(rewards).toEqual({
      today: '2026-10-21', balance: 30, monthDays: 5, attendedToday: true, tier: getTier(5), couponAmount: 100, couponUsed: false, checkedIn: true,
    });
  });
  it('빠지거나 깨진 값은 안전한 기본값', () => {
    expect(normalizeRewards(null)).toMatchObject({ balance: 0, monthDays: 0, attendedToday: false, couponAmount: 0, couponUsed: false, checkedIn: false });
    expect(normalizeRewards({ balance: -5, month_days: 'x' })).toMatchObject({ balance: 0, monthDays: 0 });
  });
});

describe('rewardErrorText — 서버 거절을 쉬운 말로', () => {
  it.each([
    ['insufficient_points', '포인트가 부족해요'],
    ['points_over_total', '결제 금액보다 많이 쓸 수 없어요'],
    ['coupon_used', '이번 달 쿠폰은 이미 썼어요'],
    ['coupon_unavailable', '지금 등급에는 쿠폰이 없어요'],
    ['not_signed_in', '로그인이 필요해요'],
  ])('%s', (code, text) => {
    expect(rewardErrorText({ message: code })).toContain(text);
  });
  it('모르는 오류는 서버 원문을 숨긴다', () => {
    const text = rewardErrorText({ message: 'relation "x" does not exist' });
    expect(text).not.toContain('relation');
    expect(text).toContain('다시 시도');
  });
});

describe('formatHeaderRewards — 헤더 등급·포인트 문구', () => {
  it('등급 이름과 잔액을 함께 보여 준다', async () => {
    const { formatHeaderRewards } = await import('../src/lib/rewards.js');
    expect(formatHeaderRewards({ tier: 'grow', balance: 40 })).toBe('성장 · 40P');
    expect(formatHeaderRewards({ tier: 'master', balance: 1250 })).toBe('마스터 · 1,250P');
  });

  it('모르는 등급은 새싹, 잔액이 이상하면 0P', async () => {
    const { formatHeaderRewards } = await import('../src/lib/rewards.js');
    expect(formatHeaderRewards({ tier: 'unknown', balance: -5 })).toBe('새싹 · 0P');
  });
});

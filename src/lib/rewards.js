// 출석 포인트·회원 등급·월 쿠폰 — 순수 함수 (SPEC.md '출석 포인트·회원 등급')
// 실제 적립·차감·쿠폰 사용은 서버(DB 함수)가 다시 검사한다. 여기 계산은 화면 표시용
// 숫자 기준은 supabase/migrations/20261021000000_hanclass_rewards.sql과 같아야 한다 (tests/rewardsDb.test.js)

export const ATTENDANCE_POINTS = 10;

// 이번 달(한국 날짜) 출석일 수 기준. coupon: 이번 달 쿠폰 1장 금액(원), 0이면 쿠폰 없음
export const TIERS = [
  { id: 'sprout', label: '새싹', minDays: 0, coupon: 0 },
  { id: 'grow', label: '성장', minDays: 5, coupon: 100 },
  { id: 'pro', label: '실무', minDays: 10, coupon: 300 },
  { id: 'master', label: '마스터', minDays: 20, coupon: 500 },
];

export const REWARDS_DEMO_NOTE = '포인트·쿠폰은 데모 할인이에요. 실제 돈이 아니고 현금으로 바꿀 수 없어요.';
export const REWARDS_MORE_NOTE = '서류 도우미·광고 보고서에서도 쓸 수 있게 사용처를 넓힐 예정이에요.';

const toCount = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Math.floor(Number(value)) : 0);

export function getTier(days) {
  const count = toCount(days);
  return [...TIERS].reverse().find((tier) => count >= tier.minDays);
}

// 다음 등급과 남은 출석일. 마스터면 null
export function getNextTier(days) {
  const count = toCount(days);
  const tier = TIERS.find((item) => item.minDays > count);
  return tier ? { tier, daysLeft: tier.minDays - count } : null;
}

// 등급 안내용 출석일 범위 — '5~9일', 가장 높은 등급은 '20일 이상'
export function getTierRange(tier) {
  const next = TIERS[TIERS.findIndex((item) => item.id === tier.id) + 1];
  return next ? `${tier.minDays}~${next.minDays - 1}일` : `${tier.minDays}일 이상`;
}

// 한국 날짜 'YYYY-MM-DD' (한국은 서머타임이 없어 +9시간 고정)
export function toKstDate(date = new Date()) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// 주문 할인 — 쿠폰을 먼저 빼고, 남은 금액 안에서 포인트(1P = 1원). 0원 아래로 내려가지 않는다
export function calcOrderDiscount({ total, balance, couponAmount, couponUsed, points, useCoupon }) {
  const coupon = useCoupon && !couponUsed ? Math.min(toCount(couponAmount), total) : 0;
  const maxPoints = Math.min(toCount(balance), total - coupon);
  const used = Math.min(toCount(points), maxPoints);
  return { coupon, points: used, finalTotal: total - coupon - used, maxPoints };
}

// 서버 응답(hanclass_get_rewards·hanclass_check_in) → 화면용 값
export function normalizeRewards(row) {
  const data = row && typeof row === 'object' ? row : {};
  const monthDays = toCount(data.month_days);
  return {
    today: typeof data.today === 'string' ? data.today : toKstDate(),
    balance: toCount(data.balance),
    monthDays,
    attendedToday: data.attended_today === true,
    tier: getTier(monthDays),
    couponAmount: toCount(data.coupon_amount),
    couponUsed: data.coupon_used === true,
    checkedIn: data.checked_in === true,
  };
}

// DB 함수가 raise exception으로 보내는 거절 표시 → 쉬운 말 (서버 원문은 보여 주지 않는다)
const ERROR_TEXTS = {
  not_signed_in: '로그인이 필요해요. 다시 로그인해 주세요.',
  insufficient_points: '포인트가 부족해요. 잔액을 확인해 주세요.',
  points_over_total: '결제 금액보다 많이 쓸 수 없어요.',
  invalid_points: '포인트는 0 이상의 숫자로 적어 주세요.',
  coupon_used: '이번 달 쿠폰은 이미 썼어요.',
  coupon_unavailable: '지금 등급에는 쿠폰이 없어요.',
  invalid_order: '주문할 강의를 확인하지 못했어요. 새로고침해 주세요.',
};

export function rewardErrorText(error) {
  const message = String(error?.message ?? '');
  const code = Object.keys(ERROR_TEXTS).find((key) => message.includes(key));
  return code ? ERROR_TEXTS[code] : '포인트·쿠폰을 적용하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

// 헤더 문구 — '성장 · 40P'. 모르는 등급은 새싹, 잔액이 이상하면 0P
export function formatHeaderRewards({ tier, balance }) {
  const label = (TIERS.find((item) => item.id === tier) ?? TIERS[0]).label;
  return `${label} · ${toCount(balance).toLocaleString('ko-KR')}P`;
}

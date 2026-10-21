// 개발용 가짜 서버 응답 — DB 적용 전에 화면만 확인한다 (?rewards_mock=1, 개발 서버에서만 불러옴)
// 새로고침하면 처음 값으로 돌아간다. 실제 기록이 아니다
import { getTier, toKstDate } from './rewards.js';

const PRICES = { c002: 1000, c003: 2000 };
const state = { balance: 40, monthDays: 6, attendedToday: false, couponUsed: false };

function summary(extra = {}) {
  const tier = getTier(state.monthDays);
  return {
    today: toKstDate(),
    balance: state.balance,
    month_days: state.monthDays,
    attended_today: state.attendedToday,
    tier: tier.id,
    coupon_amount: tier.coupon,
    coupon_used: state.couponUsed,
    ...extra,
  };
}

const wait = () => new Promise((resolve) => setTimeout(resolve, 300));

export async function mockRpc(name, args = {}) {
  await wait();
  if (name === 'hanclass_get_rewards') return summary();
  if (name === 'hanclass_check_in') {
    const added = !state.attendedToday;
    if (added) Object.assign(state, { attendedToday: true, monthDays: state.monthDays + 1, balance: state.balance + 10 });
    return summary({ checked_in: added });
  }
  if (name === 'hanclass_use_order_rewards') {
    const total = args.p_course_ids.reduce((sum, id) => sum + (PRICES[id] ?? 0), 0);
    const tier = getTier(state.monthDays);
    if (args.p_use_coupon && state.couponUsed) throw new Error('coupon_used');
    const coupon = args.p_use_coupon ? Math.min(tier.coupon, total) : 0;
    if (args.p_points > state.balance) throw new Error('insufficient_points');
    if (args.p_points > total - coupon) throw new Error('points_over_total');
    state.balance -= args.p_points;
    if (args.p_use_coupon) state.couponUsed = true;
    return { total, coupon_discount: coupon, points_used: args.p_points, final_total: total - coupon - args.p_points, balance: state.balance };
  }
  throw new Error('unknown');
}

// 출석 포인트·등급·쿠폰 서버 호출 — 모두 DB 함수(RPC)로만. 잔액은 브라우저에 저장하지 않는다
// (supabase/migrations/20261021000000_hanclass_rewards.sql)
// 개발 서버에서 주소에 ?rewards_mock=1 을 붙이면 가짜 응답으로 화면만 확인한다 (배포 빌드에는 들어가지 않음)
import { getServerClient } from './server.js';
import { normalizeRewards } from './rewards.js';

// DB 함수가 아직 서버에 없을 때(SQL 적용 전) PostgREST가 주는 표시
const MISSING_CODES = ['PGRST202', '42883'];

// 출석·주문 할인으로 잔액이 바뀌면 알린다 (헤더 등급·포인트 표시가 다시 읽음)
export const REWARDS_CHANGE_EVENT = 'hanclass:rewards-change';
const notifyRewards = () => window.dispatchEvent(new CustomEvent(REWARDS_CHANGE_EVENT));

export function isRewardsMissing(error) {
  return MISSING_CODES.includes(error?.code);
}

export function isRewardsMock() {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).has('rewards_mock');
}

async function rpc(name, args) {
  if (import.meta.env.DEV && isRewardsMock()) return (await import('./rewardsMock.js')).mockRpc(name, args);
  const client = await getServerClient();
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data;
}

// 내 요약 { balance, monthDays, attendedToday, tier, couponAmount, couponUsed, today }
// 헤더 등 다른 화면에서 잔액을 보여 줄 때도 이 함수를 쓴다
export async function fetchRewards() {
  return normalizeRewards(await rpc('hanclass_get_rewards'));
}

// 출석 체크 — 오늘 이미 했으면 checkedIn: false (포인트 그대로)
export async function checkIn() {
  const rewards = normalizeRewards(await rpc('hanclass_check_in'));
  notifyRewards();
  return rewards;
}

// 데모 주문 할인 — 서버가 가격표로 다시 계산해 { total, coupon_discount, points_used, final_total, balance }를 돌려준다
export async function applyOrderRewards(courseIds, points, useCoupon) {
  const result = await rpc('hanclass_use_order_rewards', { p_course_ids: courseIds, p_points: points, p_use_coupon: useCoupon });
  notifyRewards();
  return result;
}

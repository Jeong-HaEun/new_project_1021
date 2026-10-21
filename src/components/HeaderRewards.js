// 헤더 등급·포인트 — 회원 별명 옆에 '성장 · 40P'. 로그인했고 서버 기록을 읽었을 때만 보인다
// 로그아웃·DB 적용 전·조회 실패면 숨긴다 (인증·이름 로직은 HeaderAccount가 맡고 여기서는 다시 만들지 않음)
import { el } from '../lib/dom.js';
import { getCurrentUser, onAuthChange } from '../lib/account.js';
import { formatHeaderRewards } from '../lib/rewards.js';
import { fetchRewards, REWARDS_CHANGE_EVENT } from '../lib/rewardsApi.js';

export function HeaderRewards() {
  const badge = el('a', { href: 'myclass.html', className: 'header-rewards', title: '출석 포인트·등급 (내 강의실)' });
  badge.hidden = true;
  let request = 0;

  // 늦게 도착한 이전 조회 결과는 버린다 (로그아웃·계정 변경 직후)
  async function refresh(user) {
    const current = (request += 1);
    if (!user) {
      badge.hidden = true;
      return;
    }
    try {
      const rewards = await fetchRewards();
      if (current !== request) return;
      badge.textContent = formatHeaderRewards(rewards);
      badge.setAttribute('aria-label', `회원 등급·포인트: ${badge.textContent}`);
      badge.hidden = false;
    } catch {
      if (current === request) badge.hidden = true;
    }
  }

  const handleAuth = (user) => refresh(user);
  const handleRewardsChange = () => getCurrentUser().then(refresh).catch(() => {});

  onAuthChange(handleAuth).catch(() => {});
  window.addEventListener(REWARDS_CHANGE_EVENT, handleRewardsChange);
  handleRewardsChange();
  return badge;
}

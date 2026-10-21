// 내 강의실의 출석 포인트·회원 등급·이번 달 쿠폰 — 로그인했을 때만 보인다 (SPEC.md '출석 포인트·회원 등급')
// 숫자는 서버(DB 함수)에서만 받아 온다. 브라우저에 저장하지 않는다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { formatPrice } from '../lib/price.js';
import { ATTENDANCE_POINTS, getNextTier, REWARDS_DEMO_NOTE, REWARDS_MORE_NOTE, TIERS } from '../lib/rewards.js';
import { checkIn, fetchRewards, isRewardsMissing } from '../lib/rewardsApi.js';
import { showToast } from './Toast.js';

const formatPoints = (points) => `${points.toLocaleString('ko-KR')}P`;

function Stat(label, value) {
  return el('div', { className: 'rewards-stat' }, [
    el('dt', { className: 'rewards-stat__label', text: label }),
    el('dd', { className: 'rewards-stat__value', text: value }),
  ]);
}

function couponText({ tier, couponUsed }) {
  if (tier.coupon === 0) return '없음 (성장 등급부터)';
  return couponUsed ? `${formatPrice(tier.coupon)} · 이번 달 사용함` : `${formatPrice(tier.coupon)} 1장`;
}

function nextTierText(monthDays) {
  const next = getNextTier(monthDays);
  return next ? `${next.daysLeft}일 더 출석하면 ${next.tier.label} 등급이에요` : '가장 높은 등급이에요';
}

// 등급 기준표 — 지금 등급을 진하게
function TierGuide(current) {
  return el('ul', { className: 'rewards-tiers', 'aria-label': '등급 기준' }, TIERS.map((tier) =>
    el('li', { className: `rewards-tier${tier.id === current.id ? ' is-current' : ''}` }, [
      el('strong', { text: tier.label }),
      el('span', { text: `${tier.minDays}일~` }),
      el('span', { text: tier.coupon ? `쿠폰 ${formatPrice(tier.coupon)}` : '쿠폰 없음' }),
    ]),
  ));
}

export function RewardsPanel() {
  const box = el('section', { className: 'myclass-section rewards', 'aria-labelledby': 'rewards-title' });
  const title = el('h2', { id: 'rewards-title', className: 'myclass-section__title', text: '출석 포인트·회원 등급' });
  const show = (children) => box.replaceChildren(title, ...children);

  function renderReady(rewards) {
    const button = el('button', {
      type: 'button',
      className: 'button button--primary rewards-checkin',
      onClick: () => handleCheckIn(button),
      text: rewards.attendedToday ? '오늘 출석 완료' : `출석 체크 +${ATTENDANCE_POINTS}P`,
    });
    if (rewards.attendedToday) button.disabled = true;
    show([
      el('div', { className: 'rewards-card' }, [
        el('div', { className: 'rewards-head' }, [
          el('span', { className: `rewards-badge rewards-badge--${rewards.tier.id}`, text: `${rewards.tier.label} 등급` }),
          el('span', { className: 'rewards-next', text: nextTierText(rewards.monthDays) }),
        ]),
        el('dl', { className: 'rewards-stats' }, [
          Stat('포인트 잔액', formatPoints(rewards.balance)),
          Stat('이번 달 출석', `${rewards.monthDays}일`),
          Stat('이번 달 쿠폰', couponText(rewards)),
        ]),
        button,
        el('p', { className: 'myclass-note', text: `하루 한 번(한국 날짜) ${ATTENDANCE_POINTS}P. 포인트는 1P = 1원으로 데모 주문에서 할인에 써요.` }),
      ]),
      TierGuide(rewards.tier),
      el('a', { href: 'tiers.html', className: 'rewards-tiers-link', text: '등급·쿠폰 안내 자세히 보기' }),
      el('p', { className: 'rewards-demo', text: REWARDS_DEMO_NOTE }),
      el('p', { className: 'myclass-note', text: REWARDS_MORE_NOTE }),
    ]);
  }

  async function handleCheckIn(button) {
    button.disabled = true;
    button.textContent = '출석 확인 중…';
    try {
      const rewards = await checkIn();
      renderReady(rewards);
      showToast(rewards.checkedIn ? `출석했어요 +${ATTENDANCE_POINTS}P` : '오늘은 이미 출석했어요');
    } catch {
      button.disabled = false;
      button.textContent = `출석 체크 +${ATTENDANCE_POINTS}P`;
      showToast('출석 체크에 실패했어요. 다시 눌러 주세요.');
    }
  }

  async function load() {
    show([el('p', { className: 'text-muted', role: 'status', text: '포인트를 불러오는 중이에요…' })]);
    try {
      renderReady(await fetchRewards());
    } catch (error) {
      if (isRewardsMissing(error)) {
        show([el('p', { className: 'text-muted' }, [icon('lock', 16), ' 출석 포인트는 서버 준비 중이에요.'])]);
        return;
      }
      show([
        el('p', { className: 'text-muted', role: 'alert', text: '포인트를 불러오지 못했어요.' }),
        el('button', { type: 'button', className: 'button button--ghost', onClick: load, text: '다시 시도' }),
      ]);
    }
  }

  load();
  return box;
}

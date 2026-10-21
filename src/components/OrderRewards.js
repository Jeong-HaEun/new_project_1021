// 주문 화면의 출석 포인트·이번 달 쿠폰 적용 (데모 할인, 실제 돈 아님) — SPEC.md '출석 포인트·회원 등급'
// 화면 계산(calcOrderDiscount)은 미리 보기용. 결제할 때 서버가 가격표·잔액·쿠폰을 다시 검사한다
import { el } from '../lib/dom.js';
import { isServerConfigured } from '../lib/server.js';
import { getCurrentUser } from '../lib/account.js';
import { calcOrderDiscount, REWARDS_DEMO_NOTE, REWARDS_MORE_NOTE } from '../lib/rewards.js';
import { fetchRewards, isRewardsMissing, isRewardsMock } from '../lib/rewardsApi.js';

const won = (amount) => `${amount.toLocaleString('ko-KR')}원`;
const NO_DISCOUNT = { coupon: 0, points: 0, useCoupon: false };

// 요약 상자의 할인 줄 — update(discount, total)로 바꾼다
export function DiscountRows(total) {
  const coupon = el('dd', { text: '-0원' });
  const points = el('dd', { text: '-0원' });
  const final = el('dd', { className: 'price cart-summary__total', text: won(total) });
  const node = el('dl', { className: 'cart-summary__rows' }, [
    el('dt', { text: '쿠폰 할인' }), coupon,
    el('dt', { text: '포인트 사용' }), points,
    el('dt', { text: '최종 금액 (데모)' }), final,
  ]);
  function update(discount) {
    coupon.textContent = `-${won(discount.coupon)}`;
    points.textContent = `-${won(discount.points)}`;
    final.textContent = won(total - discount.coupon - discount.points);
  }
  return { node, update };
}

// onChange(discount): 할인 미리 보기가 바뀔 때. getSelection(): 결제할 때 서버에 보낼 값
export function OrderRewards(total, onChange) {
  const box = el('section', { className: 'order-section order-rewards', 'aria-labelledby': 'order-rewards-title' });
  const title = el('h2', { id: 'order-rewards-title', className: 'order-section__title', text: '포인트·쿠폰 (데모 할인)' });
  const show = (children) => box.replaceChildren(title, ...children);
  let selection = NO_DISCOUNT;

  function setSelection(next) {
    selection = next;
    onChange(selection);
  }

  function renderReady(rewards) {
    const canCoupon = rewards.couponAmount > 0 && !rewards.couponUsed;
    const couponBox = el('input', { type: 'checkbox', name: 'use-coupon' });
    const pointsInput = el('input', { type: 'number', name: 'points', min: '0', step: '1', inputmode: 'numeric', value: '0', 'aria-label': '사용할 포인트' });
    const hint = el('p', { className: 'order-rewards__hint' });

    function recalc() {
      const useCoupon = canCoupon && couponBox.checked;
      const discount = calcOrderDiscount({ ...rewards, total, points: pointsInput.value, useCoupon });
      pointsInput.max = String(discount.maxPoints);
      hint.textContent = `잔액 ${rewards.balance.toLocaleString('ko-KR')}P · 이번 주문에 최대 ${discount.maxPoints.toLocaleString('ko-KR')}P (1P = 1원)`;
      setSelection({ coupon: discount.coupon, points: discount.points, useCoupon });
      return discount;
    }
    // 입력을 마치면 실제로 쓸 수 있는 값으로 맞춘다 (잔액·결제 금액 초과, 소수·음수)
    function handlePointsChange() {
      pointsInput.value = String(recalc().points);
    }
    function handleUseAll() {
      pointsInput.value = String(calcOrderDiscount({ ...rewards, total, points: rewards.balance, useCoupon: canCoupon && couponBox.checked }).points);
      recalc();
    }

    const couponLine = canCoupon
      ? el('label', { className: 'order-rewards__coupon' }, [couponBox, el('span', { text: `이번 달 쿠폰 · ${rewards.tier.label} 등급 ${won(rewards.couponAmount)} 할인` })])
      : el('p', { className: 'order-rewards__hint', text: rewards.couponUsed ? '이번 달 쿠폰은 이미 썼어요.' : '쿠폰은 이번 달 5일 이상 출석(성장 등급)하면 생겨요.' });
    couponBox.addEventListener('change', handlePointsChange);
    pointsInput.addEventListener('input', recalc);
    pointsInput.addEventListener('change', handlePointsChange);

    show([
      couponLine,
      el('div', { className: 'order-rewards__points' }, [
        pointsInput,
        el('span', { text: 'P 사용' }),
        el('button', { type: 'button', className: 'button button--ghost', onClick: handleUseAll, text: '전액 사용' }),
      ]),
      hint,
      el('p', { className: 'rewards-demo', text: REWARDS_DEMO_NOTE }),
      el('p', { className: 'order-rewards__hint', text: REWARDS_MORE_NOTE }),
    ]);
    recalc();
  }

  async function load() {
    setSelection(NO_DISCOUNT);
    show([el('p', { className: 'text-muted', role: 'status', text: '포인트를 불러오는 중이에요…' })]);
    try {
      const signedIn = isRewardsMock() || (isServerConfigured() && (await getCurrentUser()));
      if (!signedIn) {
        show([
          el('p', { className: 'order-rewards__hint', text: '로그인하면 출석 포인트와 이번 달 쿠폰으로 할인받을 수 있어요.' }),
          el('a', { href: 'myclass.html', className: 'button button--ghost', text: '내 강의실에서 로그인·출석하기' }),
        ]);
        return;
      }
      renderReady(await fetchRewards());
    } catch (error) {
      if (isRewardsMissing(error)) {
        show([el('p', { className: 'order-rewards__hint', text: '포인트·쿠폰은 서버 준비 중이에요. 할인 없이 주문할 수 있어요.' })]);
        return;
      }
      show([
        el('p', { className: 'order-rewards__hint', role: 'alert', text: '포인트를 불러오지 못했어요. 할인 없이 주문하거나 다시 시도해 주세요.' }),
        el('button', { type: 'button', className: 'button button--ghost', onClick: load, text: '다시 시도' }),
      ]);
    }
  }

  load();
  return { node: box, getSelection: () => selection, reload: load };
}

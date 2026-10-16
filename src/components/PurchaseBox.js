// 가격·구매 영역 — 넓은 화면은 오른쪽 고정 상자, 모바일은 하단 바(compact)
// 장바구니가 바뀌면(이 화면이든 다른 탭이든) 버튼 상태를 다시 그린다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { formatPrice } from '../lib/price.js';
import { getCourseBadge } from '../lib/enrollment.js';
import { addCourseToCart, CART_CHANGE_EVENT, getCourseAddStatus } from '../lib/cartStore.js';
import { SoonButton } from './ComingSoon.js';
import { showToast } from './Toast.js';

// 담을 수 없는 이유별 버튼 문구
const BLOCKED_LABELS = { planned: '제작 예정', upcoming: '모집 예정', closed: '모집 마감', owned: '구매한 강의' };

function handleAddClick(course) {
  const status = addCourseToCart(course);
  if (status === 'ok') showToast('장바구니에 담았어요');
  else if (status === 'in-cart') showToast('이미 담긴 강의예요');
}

// 장바구니 버튼 — 상태에 따라 [담기] / [장바구니 보기] / 비활성
function CartAction(course, compact) {
  const status = getCourseAddStatus(course);
  if (status === 'ok') {
    return el('button', { type: 'button', className: 'button button--ghost', onClick: () => handleAddClick(course) }, [
      icon('cart', 18),
      el('span', { text: compact ? '담기' : '장바구니 담기' }),
    ]);
  }
  if (status === 'in-cart') {
    return el('a', { href: 'cart.html', className: 'button button--ghost button--done' }, [
      icon('check', 18),
      el('span', { text: compact ? '담김' : '장바구니 보기' }),
    ]);
  }
  return el('button', { type: 'button', className: 'button button--ghost', disabled: '', text: BLOCKED_LABELS[status] ?? '담을 수 없음' });
}

// 바로 구매 버튼 — 살 수 있으면 주문 확인(order.html?id=…), 구매했으면 [수강하기·준비 중], 그 밖에는 비활성
function BuyAction(course) {
  const status = getCourseAddStatus(course);
  if (status === 'ok' || status === 'in-cart') {
    return el('a', { href: `order.html?id=${course.id}`, className: 'button button--primary', text: '바로 구매' });
  }
  if (status === 'owned') return SoonButton({ label: '수강하기', className: 'button button--primary' });
  return el('button', { type: 'button', className: 'button button--primary', disabled: '', text: BLOCKED_LABELS[status] ?? '구매할 수 없음' });
}

export function PurchaseBox(course, { compact = false } = {}) {
  const badge = getCourseBadge(course);
  const blocked = badge && badge.tone !== 'green' ? badge.label : null;
  const actions = el('div', { className: 'purchase__actions' });

  function render() {
    actions.replaceChildren(CartAction(course, compact), BuyAction(course));
  }

  render();
  window.addEventListener(CART_CHANGE_EVENT, render);

  return el('div', { className: compact ? 'purchase-bar' : 'purchase-box' }, [
    el('div', { className: 'purchase__price' }, [
      el('strong', { className: 'price', text: formatPrice(course.price) }),
      el('span', { className: 'text-muted', text: blocked ? `${blocked} · 구독 없이 한 강` : '구독 없이 한 강' }),
    ]),
    actions,
    compact
      ? null
      : el('p', { className: 'purchase__note', text: '데모 결제입니다. 실제로 결제되지 않습니다.' }),
  ]);
}

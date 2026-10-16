// 장바구니 링크 + 담긴 개수 — 헤더 아이콘과 하단 탭바에서 사용. 장바구니가 바뀌면 숫자가 바로 바뀐다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { CART_CHANGE_EVENT, readOwnedState } from '../lib/cartStore.js';

export function CartLink({ className, iconSize = 24, showLabel = false, active = false }) {
  const count = el('span', { className: 'cart-count', 'aria-hidden': 'true' });
  const link = el('a', { href: 'cart.html', className: `cart-link ${className}`, ...(active && { 'aria-current': 'page' }) }, [
    el('span', { className: 'cart-link__icon' }, [icon('cart', iconSize), count]),
    showLabel ? el('span', { text: '장바구니' }) : null,
  ]);

  function update() {
    const total = readOwnedState().cart.length;
    count.textContent = total ? String(total) : '';
    count.hidden = total === 0;
    link.setAttribute('aria-label', `장바구니, 강의 ${total}개`);
  }

  update();
  window.addEventListener(CART_CHANGE_EVENT, update);
  return link;
}

// 모바일 하단 탭바 — 넓은 화면(768px~)에서는 CSS로 숨긴다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { SoonButton } from './ComingSoon.js';
import { CartLink } from './CartLink.js';

export function BottomNav({ active }) {
  const tab = (href, label, iconName, key) =>
    el('a', { href, className: 'bottom-nav__item', ...(active === key && { 'aria-current': 'page' }) }, [
      icon(iconName, 22),
      el('span', { text: label }),
    ]);

  return el('nav', { className: 'bottom-nav', 'aria-label': '하단 메뉴' }, [
    tab('index.html', '홈', 'home', 'home'),
    tab('courses.html', '강의 찾기', 'grid', 'courses'),
    CartLink({ className: 'bottom-nav__item', iconSize: 22, showLabel: true, active: active === 'cart' }),
    SoonButton({ label: '내 강의실', iconNode: icon('book', 22), className: 'bottom-nav__item' }),
  ]);
}

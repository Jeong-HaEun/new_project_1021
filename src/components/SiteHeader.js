// 상단 헤더 — 로고, (넓은 화면) 메뉴, 검색·장바구니·내 강의실(로그인)
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { SITE_NAME } from '../lib/site.js';
import { HeaderAccount } from './HeaderAccount.js';
import { HeaderRewards } from './HeaderRewards.js';
import { CartLink } from './CartLink.js';

export function SiteHeader({ active }) {
  const navLink = (href, label, key) =>
    el('a', { href, className: 'site-nav__link', text: label, ...(active === key && { 'aria-current': 'page' }) });

  return el('header', { className: 'site-header' }, [
    el('div', { className: 'site-header__inner' }, [
      el('a', { href: 'index.html', className: 'logo', 'aria-label': `${SITE_NAME} 홈` }, [
        el('span', { className: 'logo__mark', text: '한' }),
        el('span', { className: 'logo__text', text: SITE_NAME }),
      ]),
      el('nav', { className: 'site-nav', 'aria-label': '주요 메뉴' }, [
        navLink('courses.html', '강의 찾기', 'courses'),
        navLink('report.html', '광고 보고서', 'report'),
        navLink('helper.html', '서류 도우미', 'helper'),
        navLink('community.html', '커뮤니티', 'community'),
      ]),
      el('div', { className: 'site-header__actions' }, [
        el('a', { href: 'courses.html', className: 'icon-button', 'aria-label': '강의 검색' }, [icon('search')]),
        CartLink({ className: 'icon-button', active: active === 'cart' }),
        HeaderAccount({ active }),
        HeaderRewards(),
      ]),
    ]),
  ]);
}

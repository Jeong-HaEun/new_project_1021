// 모든 페이지 공통 틀 — 헤더 + 본문 + 하단 고정 영역(데모 고지, 탭바)
// 새 페이지는 반드시 renderPage를 써서 데모 고지가 빠지지 않게 한다 (tests/siteRules.test.js에서 검사)
import '../styles/variables.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/course-card.css';
import { el } from '../lib/dom.js';
import { SITE_NAME } from '../lib/site.js';
import { SiteHeader } from './SiteHeader.js';
import { BottomNav } from './BottomNav.js';
import { DemoNotice } from './DemoNotice.js';

export function renderPage({ active, title, content, bottomBar = null }) {
  document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

  const main = el('main', { id: 'main', className: 'page' }, content);
  const bottom = el('div', { className: 'bottom-stack' }, [bottomBar, DemoNotice(), BottomNav({ active })]);
  if (bottomBar) document.body.classList.add('has-bottom-bar');

  document.querySelector('#app').replaceChildren(SiteHeader({ active }), main, bottom);
  return main;
}

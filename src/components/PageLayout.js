// 모든 페이지 공통 틀 — 헤더 + 본문 + 하단 고정 영역(데모 고지, 탭바)
// 새 페이지는 반드시 renderPage를 써서 데모 고지가 빠지지 않게 한다 (tests/siteRules.test.js에서 검사)
import '../styles/variables.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/course-card.css';
import '../styles/cart-ui.css';
import { el } from '../lib/dom.js';
import { SITE_NAME } from '../lib/site.js';
import { syncAccountEnrollments } from '../lib/accountSync.js';
import { initAnalytics } from '../lib/analytics.js';
import { SiteHeader } from './SiteHeader.js';
import { BottomNav } from './BottomNav.js';
import { DemoNotice } from './DemoNotice.js';
import { VisitNotice } from './VisitNotice.js';

// syncAccount: 로그인한 계정의 데모 수강 기록을 읽어 수강 상태에 반영 (내 강의실은 직접 읽으므로 false)
// pageType: 방문 통계의 페이지 종류 (기본은 active. 상세·주문처럼 메뉴와 다른 페이지는 따로 넘긴다)
// lead: 본문 폭 밖, 헤더 바로 아래에 꽉 차게 넣을 요소 (메인 A안의 큰 이미지)
export function renderPage({ active, title, content, bottomBar = null, syncAccount = true, pageType = active ?? 'other', lead = null }) {
  document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

  const main = el('main', { id: 'main', className: 'page' }, [...[].concat(content), VisitNotice()]);
  const bottom = el('div', { className: 'bottom-stack' }, [bottomBar, DemoNotice(), BottomNav({ active })]);
  if (bottomBar) document.body.classList.add('has-bottom-bar');

  document.querySelector('#app').replaceChildren(...[SiteHeader({ active }), lead, main, bottom].filter(Boolean));
  document.body.dataset.pageType = pageType;
  initAnalytics(pageType);
  if (syncAccount) syncAccountEnrollments();
  return main;
}

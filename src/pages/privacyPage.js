// 방문 통계 안내 — privacy.html. GA4로 무엇을 모으고 무엇을 모으지 않는지, 거부하는 방법
// 실제 판매 전에는 개인정보 처리방침 전체를 따로 갖추고 법적 요건을 다시 확인한다
import { el } from '../lib/dom.js';
import { isAnalyticsConfigured } from '../lib/analytics.js';
import { renderPage } from '../components/PageLayout.js';
import '../styles/courses.css';
import '../styles/privacy.css';

const section = (title, items) =>
  el('section', { className: 'privacy-section' }, [
    el('h2', { className: 'privacy-section__title', text: title }),
    el('ul', { className: 'bullet-list' }, items.map((item) => el('li', { text: item }))),
  ]);

const status = isAnalyticsConfigured()
  ? '한클래스는 더 나은 서비스를 위해 Google Analytics(GA4)로 방문 통계를 수집해요.'
  : '지금은 방문 통계를 수집하지 않아요. 연결하면 아래 기준으로 수집해요.';

renderPage({
  active: 'privacy',
  title: '방문 통계 안내',
  content: [
    el('h1', { className: 'page-title', text: '방문 통계 안내' }),
    el('p', { className: 'page-desc text-muted', text: status }),
    section('수집하는 정보', [
      '방문한 페이지와 머문 시간',
      '누른 버튼과 강의(예: 강의 상세 보기, 장바구니 담기, 데모 주문 완료)',
      '기기·브라우저 종류, 대략적인 지역(도시 단위)',
    ]),
    section('수집하지 않는 정보', [
      '이름, 이메일, 카카오 계정 정보',
      '검색어 원문과 입력창에 쓴 내용 (검색은 글자 수만 기록해요)',
      '결제 정보 (실제 결제가 없는 데모 사이트예요)',
    ]),
    section('쿠키와 보관 기간', [
      '방문을 구분하기 위해 브라우저에 Google Analytics 쿠키를 저장해요.',
      '수집한 통계는 2개월 동안 보관한 뒤 자동으로 지워져요.',
      '통계는 강의와 화면을 개선하는 데만 쓰고, 광고에 쓰지 않아요.',
    ]),
    el('section', { className: 'privacy-section' }, [
      el('h2', { className: 'privacy-section__title', text: '수집을 원하지 않으면' }),
      el('ul', { className: 'bullet-list' }, [
        el('li', { text: '브라우저 설정에서 쿠키를 차단하거나 삭제할 수 있어요.' }),
        el('li', {}, [
          el('span', { text: 'Google에서 제공하는 ' }),
          el('a', {
            href: 'https://tools.google.com/dlpage/gaoptout?hl=ko', target: '_blank', rel: 'noopener noreferrer',
            className: 'privacy-link', text: 'Google 애널리틱스 차단 부가기능 ↗',
          }),
          el('span', { text: '을 설치하면 수집되지 않아요.' }),
        ]),
      ]),
    ]),
  ],
});

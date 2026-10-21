// 회원 등급 안내 — tiers.html. 출석 포인트·등급 기준·월 쿠폰 쓰는 법 (SPEC.md '출석 포인트·회원 등급')
// 숫자는 모두 rewards.js에서 가져온다 (기준이 바뀌면 이 페이지도 함께 바뀜). 누구나 볼 수 있고 서버를 부르지 않는다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { formatPrice } from '../lib/price.js';
import { ATTENDANCE_POINTS, getTierRange, REWARDS_DEMO_NOTE, REWARDS_MORE_NOTE, TIERS } from '../lib/rewards.js';
import { renderPage } from '../components/PageLayout.js';
import '../styles/courses.css';
import '../styles/detail.css';
import '../styles/rewards.css';
import '../styles/tiers.css';

function TierCard(tier) {
  return el('li', { className: 'tiers-card' }, [
    el('span', { className: `rewards-badge rewards-badge--${tier.id}`, text: tier.label }),
    el('p', { className: 'tiers-card__range', text: `출석 ${getTierRange(tier)}` }),
    el('p', { className: 'tiers-card__coupon', text: tier.coupon ? `매달 쿠폰 ${formatPrice(tier.coupon)} 1장` : '쿠폰 없음' }),
  ]);
}

const section = (title, items) =>
  el('section', { className: 'tiers-section' }, [
    el('h2', { className: 'tiers-section__title', text: title }),
    el('ul', { className: 'bullet-list' }, items.map((item) => el('li', { text: item }))),
  ]);

const firstCoupon = TIERS.find((tier) => tier.coupon > 0);

renderPage({
  active: 'myclass',
  pageType: 'tiers',
  title: '회원 등급 안내',
  content: [
    el('a', { href: 'myclass.html', className: 'back-link' }, [icon('back', 18), el('span', { text: '내 강의실' })]),
    el('h1', { className: 'page-title', text: '회원 등급 안내' }),
    el('p', { className: 'page-desc text-muted', text: '이번 달에 출석한 날이 많을수록 등급이 올라가고, 등급마다 매달 할인 쿠폰 1장을 드려요.' }),
    el('ul', { className: 'tiers-grid', 'aria-label': '등급별 기준과 쿠폰' }, TIERS.map(TierCard)),
    section('출석 포인트', [
      `로그인하고 내 강의실에서 [출석 체크]를 누르면 하루 한 번 ${ATTENDANCE_POINTS}P를 받아요.`,
      '날짜는 한국 시간 자정에 바뀌어요. 같은 날 두 번 눌러도 한 번만 쌓여요.',
      '포인트는 1P = 1원으로 데모 주문에서 할인에 써요. 쓰지 않은 포인트는 다음 달에도 남아요.',
    ]),
    section('등급과 매달 쿠폰', [
      '등급은 이번 달(한국 날짜) 출석한 날 수로 정해져요. 매달 1일에 0일부터 다시 세요.',
      `${firstCoupon.label} 등급부터 이번 달 쿠폰 1장이 생겨요. 한 번 쓰면 그달 쿠폰은 끝나요.`,
      '쿠폰 금액은 쓰는 순간의 등급으로 정해져요. 등급이 오른 뒤에 쓰면 더 큰 쿠폰이 돼요.',
    ]),
    section('주문할 때 쓰는 법', [
      '주문 확인 화면의 \'포인트·쿠폰\'에서 쿠폰을 체크하고, 쓸 포인트를 적어요.',
      '쿠폰을 먼저 빼고, 남은 금액 안에서 포인트를 써요. 결제 금액은 0원 아래로 내려가지 않아요.',
      '잔액이 부족하거나 쿠폰을 이미 썼다면 서버가 확인해 주문 전에 알려 줘요.',
    ]),
    el('p', { className: 'rewards-demo tiers-note', text: REWARDS_DEMO_NOTE }),
    el('p', { className: 'tiers-note tiers-more', text: REWARDS_MORE_NOTE }),
    el('div', { className: 'tiers-actions' }, [
      el('a', { href: 'myclass.html', className: 'button button--primary', text: '내 강의실에서 출석하기' }),
      el('a', { href: 'courses.html', className: 'button button--ghost', text: '강의 둘러보기' }),
    ]),
  ],
});

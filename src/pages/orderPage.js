// 주문 확인·결제수단 선택 (데모) — order.html(장바구니 전체), order.html?id=c002(바로 구매) (SPEC.md 5절)
// 실제 결제는 하지 않는다. [데모 결제하기]를 누르면 구매 기록만 이 브라우저에 남긴다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { readParam } from '../lib/paths.js';
import { formatPrice } from '../lib/price.js';
import { getOrderDraft, validateOrder } from '../lib/order.js';
import { completeDemoOrder, readCartState } from '../lib/cartStore.js';
import { ACCESS_PERIOD, REFUND_POLICY } from '../data/policy.js';
import { COURSES } from '../data/courses/index.js';
import { renderPage } from '../components/PageLayout.js';
import { DEMO_PAYMENT_NOTE, OrderComplete, OrderItem, PaymentMethods, SkippedNotice } from '../components/OrderParts.js';
import '../styles/courses.css';
import '../styles/detail.css';
import '../styles/cart-page.css';
import '../styles/order.css';

const courseId = readParam('id');
const body = el('div', { className: 'order-body' });

function readDraft() {
  return getOrderDraft({ courseId, ...readCartState(), courses: COURSES });
}

function BackLink() {
  const href = courseId ? `course.html?id=${encodeURIComponent(courseId)}` : 'cart.html';
  return el('a', { href, className: 'back-link' }, [icon('back', 18), el('span', { text: courseId ? '강의 상세' : '장바구니' })]);
}

function EmptyOrder(draft) {
  return el('div', { className: 'empty-state' }, [
    el('strong', { text: '주문할 강의가 없어요' }),
    SkippedNotice(draft.skipped, COURSES),
    el('a', { href: 'cart.html', className: 'button button--ghost', text: '장바구니 보기' }),
    el('a', { href: 'courses.html', className: 'button button--primary', text: '강의 둘러보기' }),
  ]);
}

function PolicyCheck() {
  return el('section', { className: 'order-section' }, [
    el('h2', { className: 'order-section__title', text: '구매 전 확인' }),
    el('dl', { className: 'order-policy' }, [
      el('dt', { text: '수강 기간' }),
      el('dd', { text: ACCESS_PERIOD }),
      el('dt', { text: '환불 규정' }),
      el('dd', { text: REFUND_POLICY }),
    ]),
  ]);
}

function Summary(draft, error) {
  return el('aside', { className: 'cart-summary' }, [
    el('dl', { className: 'cart-summary__rows' }, [
      el('dt', { text: '강의' }),
      el('dd', { text: `${draft.items.length}개` }),
      el('dt', { text: '합계' }),
      el('dd', { className: 'price cart-summary__total', text: formatPrice(draft.total) }),
    ]),
    error,
    el('button', { type: 'submit', className: 'button button--primary cart-summary__order', text: '데모 결제하기' }),
    el('p', { className: 'order-demo-note', text: DEMO_PAYMENT_NOTE }),
  ]);
}

// 결제수단을 고르면 오류 문구를 지운다
function handleMethodChange(error) {
  error.textContent = '';
}

function handleSubmit(event, draft, error) {
  event.preventDefault();
  const methodId = new FormData(event.currentTarget).get('method');
  if (validateOrder(draft, methodId) === 'no-method') {
    error.textContent = '결제수단을 골라 주세요';
    event.currentTarget.querySelector('input[name="method"]').focus();
    return;
  }
  const added = completeDemoOrder(draft, methodId);
  if (added.length === 0) {
    render(); // 그사이 다른 탭에서 샀거나 살 수 없게 된 경우 — 현재 상태로 다시 그린다
    return;
  }
  body.replaceChildren(OrderComplete(added.map((id) => COURSES.find((course) => course.id === id))));
  body.querySelector('.order-complete__title').focus();
}

function render() {
  const draft = readDraft();
  if (draft.items.length === 0) {
    body.replaceChildren(EmptyOrder(draft));
    return;
  }
  const error = el('p', { className: 'order-error', role: 'alert' });
  body.replaceChildren(
    el('form', {
      className: 'cart-layout',
      novalidate: '',
      onSubmit: (event) => handleSubmit(event, draft, error),
      onChange: () => handleMethodChange(error),
    }, [
      el('div', { className: 'order-main' }, [
        el('section', { className: 'order-section' }, [
          el('h2', { className: 'order-section__title', text: draft.mode === 'direct' ? '바로 구매할 강의' : '주문할 강의' }),
          el('ul', { className: 'cart-list' }, draft.items.map(OrderItem)),
          SkippedNotice(draft.skipped, COURSES),
        ]),
        PolicyCheck(),
        PaymentMethods(),
      ]),
      Summary(draft, error),
    ]),
  );
}

renderPage({
  active: courseId ? 'courses' : 'cart',
  title: '주문 확인',
  content: [
    BackLink(),
    el('h1', { className: 'page-title', text: '주문 확인' }),
    el('p', { className: 'page-desc text-muted', text: DEMO_PAYMENT_NOTE }),
    body,
  ],
});

render();

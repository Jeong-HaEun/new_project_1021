// 주문 확인·결제수단 선택 (데모) — order.html(장바구니 전체), order.html?id=c002(바로 구매) (SPEC.md 5절)
// 실제 결제는 하지 않는다. [데모 결제하기]를 누르면 구매 기록만 이 브라우저에 남긴다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { readParam } from '../lib/paths.js';
import { formatPrice } from '../lib/price.js';
import { getOrderDraft, validateOrder } from '../lib/order.js';
import { completeDemoOrder, readOwnedState } from '../lib/cartStore.js';
import { whenAccountSynced } from '../lib/accountSync.js';
import { track } from '../lib/analytics.js';
import { rewardErrorText } from '../lib/rewards.js';
import { applyOrderRewards } from '../lib/rewardsApi.js';
import { ACCESS_PERIOD, REFUND_POLICY } from '../data/policy.js';
import { COURSES } from '../data/courses/index.js';
import { renderPage } from '../components/PageLayout.js';
import { DEMO_PAYMENT_NOTE, OrderComplete, OrderItem, PaymentMethods, SkippedNotice } from '../components/OrderParts.js';
import { DiscountRows, OrderRewards } from '../components/OrderRewards.js';
import '../styles/courses.css';
import '../styles/detail.css';
import '../styles/cart-page.css';
import '../styles/order.css';
import '../styles/rewards.css';

const courseId = readParam('id');
const body = el('div', { className: 'order-body' });

function readDraft() {
  return getOrderDraft({ courseId, ...readOwnedState(), courses: COURSES });
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

// discountRows: 쿠폰·포인트 할인과 최종 금액
function Summary(draft, error, discountRows) {
  return el('aside', { className: 'cart-summary' }, [
    el('dl', { className: 'cart-summary__rows' }, [
      el('dt', { text: '강의' }),
      el('dd', { text: `${draft.items.length}개` }),
      el('dt', { text: '합계' }),
      el('dd', { className: 'price cart-summary__total', text: formatPrice(draft.total) }),
    ]),
    discountRows.node,
    error,
    el('button', { type: 'submit', className: 'button button--primary cart-summary__order', text: '데모 결제하기' }),
    el('p', { className: 'order-demo-note', text: DEMO_PAYMENT_NOTE }),
  ]);
}

// 결제수단을 고르면 오류 문구를 지운다
function handleMethodChange(error) {
  error.textContent = '';
}

const sameItems = (a, b) => a.items.map((c) => c.id).join() === b.items.map((c) => c.id).join();

// 포인트·쿠폰을 골랐으면 서버가 먼저 검사·차감한다. 거절되면 주문하지 않고 이유를 보여 준다
async function spendRewards(draft, rewards, error, button) {
  const { coupon, points, useCoupon } = rewards.getSelection();
  if (coupon === 0 && points === 0) return { ok: true, result: null };
  if (!sameItems(draft, readDraft())) return { ok: false }; // 그사이 다른 탭에서 주문이 바뀜 → 다시 그린다
  button.disabled = true;
  try {
    return { ok: true, result: await applyOrderRewards(draft.items.map((course) => course.id), points, useCoupon) };
  } catch (failure) {
    error.textContent = rewardErrorText(failure);
    button.disabled = false;
    rewards.reload(); // 잔액·쿠폰을 서버 기준으로 다시 불러온다
    return { ok: false, shown: true };
  }
}

async function handleSubmit(event, draft, error, rewards) {
  event.preventDefault();
  const form = event.currentTarget;
  const methodId = new FormData(form).get('method');
  if (validateOrder(draft, methodId) === 'no-method') {
    error.textContent = '결제수단을 골라 주세요';
    form.querySelector('input[name="method"]').focus();
    return;
  }
  const spent = await spendRewards(draft, rewards, error, form.querySelector('button[type="submit"]'));
  if (!spent.ok) {
    if (!spent.shown) render();
    return;
  }
  const added = completeDemoOrder(draft, methodId);
  if (added.length > 0) track('demo_order_complete', { item_count: added.length, order_mode: draft.mode, payment_method: methodId });
  if (added.length === 0) {
    render(); // 그사이 다른 탭에서 샀거나 살 수 없게 된 경우 — 현재 상태로 다시 그린다
    return;
  }
  body.replaceChildren(OrderComplete(added.map((id) => COURSES.find((course) => course.id === id)), spent.result));
  body.querySelector('.order-complete__title').focus();
}

let checkoutTracked = false; // 주문 화면을 연 것은 한 번만 기록

function render() {
  const draft = readDraft();
  if (draft.items.length === 0) {
    body.replaceChildren(EmptyOrder(draft));
    return;
  }
  if (!checkoutTracked) {
    checkoutTracked = true;
    track('demo_begin_checkout', { item_count: draft.items.length, order_mode: draft.mode });
  }
  const error = el('p', { className: 'order-error', role: 'alert' });
  const discountRows = DiscountRows(draft.total);
  // 오류 문구는 폼의 change에서 지운다 (할인을 다시 불러올 때 거절 이유가 지워지지 않게)
  const rewards = OrderRewards(draft.total, discountRows.update);
  body.replaceChildren(
    el('form', {
      className: 'cart-layout',
      novalidate: '',
      onSubmit: (event) => handleSubmit(event, draft, error, rewards),
      onChange: () => handleMethodChange(error),
    }, [
      el('div', { className: 'order-main' }, [
        el('section', { className: 'order-section' }, [
          el('h2', { className: 'order-section__title', text: draft.mode === 'direct' ? '바로 구매할 강의' : '주문할 강의' }),
          el('ul', { className: 'cart-list' }, draft.items.map(OrderItem)),
          SkippedNotice(draft.skipped, COURSES),
        ]),
        rewards.node,
        PolicyCheck(),
        PaymentMethods(),
      ]),
      Summary(draft, error, discountRows),
    ]),
  );
}

renderPage({
  active: courseId ? 'courses' : 'cart',
  pageType: 'order',
  title: '주문 확인',
  content: [
    BackLink(),
    el('h1', { className: 'page-title', text: '주문 확인' }),
    el('p', { className: 'page-desc text-muted', text: DEMO_PAYMENT_NOTE }),
    body,
  ],
});

// 계정 기록을 먼저 확인해야 이미 신청한 강의를 주문에서 뺄 수 있다 (서버 연결 전이면 바로 그림)
body.replaceChildren(el('p', { className: 'text-muted', role: 'status', text: '불러오는 중이에요…' }));
whenAccountSynced().finally(render);

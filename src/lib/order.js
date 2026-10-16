// 주문 확인·결제수단 선택 (데모) — 순수 함수 (SPEC.md 5절)
// 실제 결제·결제 정보 입력은 없다. 결제수단은 이름만 고르고 저장하지 않는다
import { getAddStatus } from './cart.js';
import { sumPrices } from './price.js';
import { buyNow } from './purchase.js';

export const PAYMENT_METHODS = [
  { id: 'card', label: '신용·체크카드' },
  { id: 'transfer', label: '계좌이체' },
  { id: 'easy-pay', label: '간편결제' },
];

// 주문에서 빠진 이유 (getAddStatus의 상태값과 같다)
export const SKIP_REASONS = {
  unknown: '없는 강의',
  planned: '제작 예정',
  owned: '이미 구매한 강의',
  upcoming: '모집 예정',
  closed: '모집 마감',
};

// 주문 대상 — courseId가 있으면 그 강의 1개(바로 구매), 없으면 장바구니 전체
// items: 살 수 있는 강의, skipped: [{ id, reason }] 빠진 강의와 이유, total: 합계
export function getOrderDraft({ courseId, cart, purchases, courses, now = new Date() }) {
  const mode = courseId ? 'direct' : 'cart';
  const requested = courseId ? [courseId] : Array.isArray(cart) ? cart : [];
  const items = [];
  const skipped = [];
  [...new Set(requested)].forEach((id) => {
    const course = courses.find((item) => item.id === id);
    const status = getAddStatus([], course, purchases, now);
    if (status === 'ok') items.push(course);
    else skipped.push({ id, reason: status });
  });
  return { mode, items, skipped, total: sumPrices(items) };
}

// 결제 전 확인: 'ok' | 'empty'(살 강의 없음) | 'no-method'(결제수단 안 고름)
export function validateOrder(draft, methodId) {
  if (draft.items.length === 0) return 'empty';
  if (!PAYMENT_METHODS.some((method) => method.id === methodId)) return 'no-method';
  return 'ok';
}

// 데모 결제 — 주문 강의를 구매 기록에 넣고 장바구니에서 뺀다. added: 이번에 새로 산 강의 id
// 주문 화면을 연 뒤 다른 탭에서 산 강의는 buyNow가 다시 사지 않는다
export function placeDemoOrder(state, draft, methodId, purchasedAt, now = new Date()) {
  if (validateOrder(draft, methodId) !== 'ok') return { ...state, added: [] };
  const added = [];
  const next = draft.items.reduce((current, course) => {
    const bought = buyNow(current, course, purchasedAt, now);
    if (bought !== current) added.push(course.id);
    return bought;
  }, state);
  return { cart: next.cart, purchases: next.purchases, added };
}

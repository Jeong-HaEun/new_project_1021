// 화면에서 쓰는 장바구니 창구 — 순수 로직(cart.js)과 저장(cartStorage.js)을 브라우저에 연결한다
// 장바구니가 바뀌면 CART_CHANGE_EVENT를 보내 헤더 개수·상세 버튼·장바구니 페이지가 함께 갱신된다
import { COURSES } from '../data/courses/index.js';
import { addToCart, getAddStatus, removeFromCart } from './cart.js';
import { CART_KEY, createSafeStorage, loadCart, loadPurchases, PURCHASES_KEY, saveCart, savePurchases } from './cartStorage.js';
import { placeDemoOrder } from './order.js';

export const CART_CHANGE_EVENT = 'hanclass:cart-change';

const storage = createSafeStorage(() => window.localStorage);

function notify() {
  window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT));
}

// 현재 장바구니·구매 기록 (깨진 값·담을 수 없는 강의는 불러올 때 정리됨)
export function readCartState() {
  const purchases = loadPurchases(storage, COURSES);
  return { cart: loadCart(storage, COURSES, purchases), purchases };
}

export function getCourseAddStatus(course) {
  const { cart, purchases } = readCartState();
  return getAddStatus(cart, course, purchases);
}

// 담기 — 결과 상태를 돌려준다 ('ok'면 담김, 나머지는 담지 않은 이유)
export function addCourseToCart(course) {
  const { cart, purchases } = readCartState();
  const status = getAddStatus(cart, course, purchases);
  if (status === 'ok') {
    saveCart(storage, addToCart(cart, course, purchases));
    notify();
  }
  return status;
}

export function removeCourseFromCart(courseId) {
  saveCart(storage, removeFromCart(readCartState().cart, courseId));
  notify();
}

// 데모 결제 — 구매 기록·장바구니를 저장하고 이번에 새로 산 강의 id를 돌려준다 (실제 결제 없음)
export function completeDemoOrder(draft, methodId) {
  const result = placeDemoOrder(readCartState(), draft, methodId, new Date().toISOString());
  if (result.added.length > 0) {
    savePurchases(storage, result.purchases);
    saveCart(storage, result.cart);
    notify();
  }
  return result.added;
}

// 브라우저를 닫아도 장바구니가 남는지 (사생활 보호 모드 등에서는 false)
export function isCartPersistent() {
  return storage.isPersistent();
}

// 다른 탭에서 장바구니를 바꿔도 이 탭에 반영
window.addEventListener('storage', (event) => {
  if (event.key === CART_KEY || event.key === PURCHASES_KEY) notify();
});

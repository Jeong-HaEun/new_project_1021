// 화면에서 쓰는 장바구니 창구 — 순수 로직(cart.js)과 저장(cartStorage.js)을 브라우저에 연결한다
// 장바구니가 바뀌면 CART_CHANGE_EVENT를 보내 헤더 개수·상세 버튼·장바구니 페이지가 함께 갱신된다
import { COURSES } from '../data/courses/index.js';
import { addToCart, getAddStatus, removeFromCart } from './cart.js';
import {
  CART_KEY,
  createSafeStorage,
  loadCart,
  loadOutcomes,
  loadPurchases,
  OUTCOMES_KEY,
  PURCHASES_KEY,
  resetDemoData,
  saveCart,
  saveOutcomes,
  savePurchases,
} from './cartStorage.js';
import { toggleOutcome } from './learn.js';
import { getOutcomeTarget, mergeOutcomes, mergePurchases } from './myClassroom.js';
import { unmarkOutcome } from './purchase.js';
import { removeOutcome, saveOutcome } from './enrollmentApi.js';
import { placeDemoOrder } from './order.js';

export const CART_CHANGE_EVENT = 'hanclass:cart-change';

const storage = createSafeStorage(() => window.localStorage);

// 로그인한 계정의 기록 — 메모리에만 둔다 (브라우저에 저장하지 않아 로그아웃 후 남지 않음)
let accountPurchases = []; // 데모 수강 신청 [{ courseId, purchasedAt }]
let accountOutcomes = []; // 결과물 완성 체크한 강의 id

function notify() {
  window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT));
}

// 이 브라우저에 저장된 장바구니·구매 기록만 (저장할 때 쓴다. 깨진 값·담을 수 없는 강의는 불러올 때 정리됨)
export function readCartState() {
  const purchases = loadPurchases(storage, COURSES);
  return { cart: loadCart(storage, COURSES, purchases), purchases };
}

// 화면 판단용 — 브라우저 기록 + 로그인한 계정 기록. 같은 계정이면 어느 기기에서나 같은 수강 상태
export function readOwnedState() {
  const purchases = mergePurchases(loadPurchases(storage, COURSES), accountPurchases);
  return { cart: loadCart(storage, COURSES, purchases), purchases };
}

// 계정 기록 바꾸기 (accountSync.js·내 강의실에서 호출). 로그아웃이면 빈 값
export function setAccountRecords({ purchases = [], outcomes = [] } = {}) {
  accountPurchases = purchases;
  accountOutcomes = outcomes;
  notify();
}

export function getCourseAddStatus(course) {
  const { cart, purchases } = readOwnedState();
  return getAddStatus(cart, course, purchases);
}

// 담기 — 결과 상태를 돌려준다 ('ok'면 담김, 나머지는 담지 않은 이유)
export function addCourseToCart(course) {
  const { cart, purchases } = readOwnedState();
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

// 이 브라우저에 저장된 완성 체크 (수강 중인 강의만 남김)
function readLocalOutcomes() {
  return loadOutcomes(storage, COURSES, readOwnedState().purchases);
}

// 결과물 완성 체크 목록 — 브라우저 체크 + 계정 체크
export function readOutcomes() {
  return mergeOutcomes(readLocalOutcomes(), accountOutcomes);
}

// 결과물 완성 체크 켜고 끄기 — 계정에 신청한 강의는 서버에, 이 브라우저에서만 산 강의는 브라우저에 저장
// 서버 저장이 실패하면 오류를 던지고 화면 상태는 바꾸지 않는다
export async function toggleCourseOutcome(course) {
  const done = readOutcomes().includes(course.id);
  if (getOutcomeTarget(course.id, accountPurchases) === 'account') {
    await (done ? removeOutcome(course.id) : saveOutcome(course.id));
    accountOutcomes = done ? accountOutcomes.filter((id) => id !== course.id) : [...accountOutcomes, course.id];
    saveOutcomes(storage, unmarkOutcome(readLocalOutcomes(), course.id)); // 계정 기준으로 통일
  } else {
    saveOutcomes(storage, toggleOutcome(readLocalOutcomes(), course, readOwnedState().purchases));
  }
  notify();
}

// 데모 초기화 — 장바구니·구매 기록·결과물 체크를 모두 비운다 (발표 시연 반복용)
export function resetDemo() {
  resetDemoData(storage);
  notify();
}

// 브라우저를 닫아도 장바구니가 남는지 (사생활 보호 모드 등에서는 false)
export function isCartPersistent() {
  return storage.isPersistent();
}

// 다른 탭에서 장바구니를 바꿔도 이 탭에 반영
window.addEventListener('storage', (event) => {
  if ([CART_KEY, PURCHASES_KEY, OUTCOMES_KEY].includes(event.key)) notify();
});

// 데모 구매·수강 가능 여부·결과물 완성 체크 — 순수 함수 (SPEC.md 5절)
// 실제 결제는 하지 않는다. 구매 기록 [{ courseId, purchasedAt }]만 브라우저에 남긴다
// 상태는 { cart, purchases } 묶음으로 받고, 원래 값을 바꾸지 않고 새 묶음을 돌려준다
import { removeFromCart } from './cart.js';

export function hasPurchased(courseId, purchases) {
  return purchases.some((purchase) => purchase.courseId === courseId);
}

// 살 수 있는 강의인지: 있는 강의 + 열린 강의 + 아직 안 산 강의
function canBuy(course, purchases) {
  return Boolean(course) && course.status === 'open' && !hasPurchased(course.id, purchases);
}

// 바로 구매 — 강의 1개를 구매 기록에 추가, 장바구니에 있었다면 뺀다. now: 구매 시각(ISO 문자열)
export function buyNow(state, course, now) {
  if (!canBuy(course, state.purchases)) return state;
  return {
    cart: removeFromCart(state.cart, course.id),
    purchases: [...state.purchases, { courseId: course.id, purchasedAt: now }],
  };
}

// 장바구니 결제 — 살 수 있는 강의만 구매 기록에 추가하고 장바구니는 비운다
// added: 이번에 새로 산 강의 id (주문 완료 화면에서 사용)
export function checkoutCart(state, courses, now) {
  const added = [];
  const purchases = state.cart.reduce((list, id) => {
    const course = courses.find((item) => item.id === id);
    if (!canBuy(course, list)) return list;
    added.push(id);
    return [...list, { courseId: id, purchasedAt: now }];
  }, state.purchases);
  return { cart: state.cart.length ? [] : state.cart, purchases, added };
}

// 차시를 볼 수 있는지: 'owned'(구매함, 모두 열림) | 'preview'(맛보기) | 'locked'(구매 후 열림)
export function getLessonAccess(course, lesson, purchases) {
  if (hasPurchased(course.id, purchases)) return 'owned';
  return lesson.isPreview ? 'preview' : 'locked';
}

// 결과물 완성 체크 — 구매한 강의만, 강의당 1번
export function markOutcomeDone(outcomes, course, purchases) {
  if (!course || !hasPurchased(course.id, purchases) || outcomes.includes(course.id)) return outcomes;
  return [...outcomes, course.id];
}

export function unmarkOutcome(outcomes, courseId) {
  return outcomes.filter((id) => id !== courseId);
}

// 저장된 완성 체크 정리 — 깨진 값·없는 강의·구매 안 한 강의·중복을 버린다
export function cleanOutcomes(raw, courses, purchases) {
  if (!Array.isArray(raw)) return [];
  return raw.reduce((outcomes, id) => {
    const course = typeof id === 'string' ? courses.find((item) => item.id === id) : null;
    return markOutcomeDone(outcomes, course, purchases);
  }, []);
}

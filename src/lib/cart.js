import { getEnrollmentStatus } from './enrollment.js';

// 장바구니 순수 로직 — localStorage를 직접 건드리지 않는다 (저장은 cartStorage.js)
// 장바구니는 강의 id 배열. 함수들은 원래 배열을 바꾸지 않고 새 배열을 돌려준다 (SPEC.md 5절)

const isOwned = (courseId, purchases) => purchases.some((purchase) => purchase.courseId === courseId);

// 담을 수 있는지 판단: 'ok' | 'in-cart'(이미 담김) | 'owned'(구매함) | 'planned'(제작 예정)
//   | 'upcoming'(모집 예정) | 'closed'(모집 마감) | 'unknown'(없는 강의)
// now: 모집 기간 판단 기준 시각 (테스트에서 고정)
export function getAddStatus(cart, course, purchases, now = new Date()) {
  if (!course) return 'unknown';
  if (course.status === 'planned') return 'planned';
  if (isOwned(course.id, purchases)) return 'owned'; // 산 강좌는 마감돼도 계속 수강
  const enrollment = getEnrollmentStatus(course, now);
  if (enrollment === 'yellow') return 'upcoming';
  if (enrollment === 'red') return 'closed';
  if (cart.includes(course.id)) return 'in-cart';
  return 'ok';
}

// 담기 — 담을 수 없는 경우에는 원래 장바구니를 그대로 돌려준다
export function addToCart(cart, course, purchases, now = new Date()) {
  return getAddStatus(cart, course, purchases, now) === 'ok' ? [...cart, course.id] : cart;
}

// 빼기
export function removeFromCart(cart, courseId) {
  return cart.filter((id) => id !== courseId);
}

// 담은 순서대로 강의 정보 (없는 id는 건너뜀)
export function getCartCourses(cart, courses) {
  return cart.map((id) => courses.find((course) => course.id === id)).filter(Boolean);
}

// 합계 = 가격의 합. 묶음 할인 없음
export function getCartTotal(cart, courses) {
  return getCartCourses(cart, courses).reduce((sum, course) => sum + course.price, 0);
}

// 저장된 값 정리 — 깨진 값, 없는 강의, 중복, 제작 예정·모집 기간 밖·구매한 강의를 버린다
export function cleanCart(raw, courses, purchases, now = new Date()) {
  if (!Array.isArray(raw)) return [];
  return raw.reduce((cart, id) => {
    const course = typeof id === 'string' ? courses.find((item) => item.id === id) : null;
    return addToCart(cart, course, purchases, now);
  }, []);
}

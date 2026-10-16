// 가격 표기 도우미 — 사이트 전체에서 "1,000원" 형식으로 통일한다
export function formatPrice(won) {
  if (!Number.isInteger(won) || won < 0) {
    throw new Error(`가격은 0 이상의 정수(원)여야 합니다: ${won}`);
  }
  if (won === 0) return '무료';
  return `${won.toLocaleString('ko-KR')}원`;
}

// 장바구니 합계 — 강의 목록의 price를 모두 더한다
export function sumPrices(courses) {
  return courses.reduce((total, course) => total + course.price, 0);
}

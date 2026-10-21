// 데모 수강 취소 — 순수 함수와 안내 문구 (SPEC.md '데모 수강 취소')
// 실제 결제가 없어 돈을 돌려주는 환불이 아니다. 기록만 지워 다시 신청·시연할 수 있게 한다
// 주문에서 쓴 포인트·쿠폰은 돌려주지 않는다 (서버 장부를 되돌리는 일은 다음 단계)

export const CANCEL_NOTE = '데모 수강 기록만 지워요. 실제 결제가 아니라 환불할 돈은 없고, 주문에서 쓴 포인트·쿠폰은 돌려주지 않아요.';

// 이 브라우저의 구매 기록·결과물 완성 체크에서 한 강의를 뺀 새 값 (원래 값은 그대로)
export function cancelLocalPurchase({ purchases, outcomes }, courseId) {
  return {
    purchases: purchases.filter((record) => record.courseId !== courseId),
    outcomes: outcomes.filter((id) => id !== courseId),
  };
}

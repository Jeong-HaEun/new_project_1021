// 수강 화면 상태 — 순수 함수 (SPEC.md 5절)
// 열린 차시도 제목·길이만 보여 준다. 유료 본문은 서버 권한 검증 전까지 사이트에 올리지 않는다
import { getLessonAccess, hasPurchased, markOutcomeDone, unmarkOutcome } from './purchase.js';

// state: 'owned'(구매함) | 'preview'(구매 전, 맛보기만) | 'planned'(제작 예정)
// lessons: 차시마다 access('owned' | 'preview' | 'locked')를 붙인 새 배열
export function getLearnView(course, purchases, outcomes) {
  const owned = hasPurchased(course.id, purchases);
  const lessons = course.lessons.map((lesson) => ({ ...lesson, access: getLessonAccess(course, lesson, purchases) }));
  let state = 'preview';
  if (owned) state = 'owned';
  else if (course.status === 'planned') state = 'planned';
  return {
    state,
    lessons,
    openCount: lessons.filter((lesson) => lesson.access !== 'locked').length,
    canCheckOutcome: owned,
    outcomeDone: owned && outcomes.includes(course.id),
  };
}

// 결과물 완성 체크 켜고 끄기 — 구매한 강의만 체크된다
export function toggleOutcome(outcomes, course, purchases) {
  if (outcomes.includes(course.id)) return unmarkOutcome(outcomes, course.id);
  return markOutcomeDone(outcomes, course, purchases);
}

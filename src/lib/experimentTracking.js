// 메인 A/B 측정 — 집계 단위는 '탭 세션'(sessionStorage 수명). GA4 기본 세션과 다르다
// 주 지표: 메인 노출(experiment_home_exposure) 뒤 같은 탭에서 강의 상세에 도달(experiment_course_open)
//   - 노출: 화면이 1초 연속 보일 때 탭당 1회. 이미지 로드 여부는 조건이 아니다
//   - 상세 도달: 노출 뒤 메인 카드·추천 순서·목록에서 클릭한 강의의 상세에 처음 도달했을 때 1회
//   - 메인 노출 없이 바로 들어온 상세는 제외. 외부 보고서는 별도 지표
// 기준: planning/home-ab-v2 브랜치의 claude-development-brief.md
import { HOME_EXPERIMENT_ID } from './homeExperiment.js';

const CONTEXT_KEY = 'hanclass.homeExpContext.v1';
const EXPOSURE_DELAY_MS = 1000;

function readContext(session) {
  try {
    const ctx = JSON.parse(session.getItem(CONTEXT_KEY));
    return ctx && ctx.id === HOME_EXPERIMENT_ID ? ctx : null;
  } catch {
    return null;
  }
}

function writeContext(session, ctx) {
  try {
    session.setItem(CONTEXT_KEY, JSON.stringify(ctx));
    return true;
  } catch {
    return false;
  }
}

const baseParams = (ctx, placement) => ({ experiment_id: ctx.id, variant: ctx.variant, mode: ctx.mode, placement });

// 메인 노출 — 처음이면 보낼 값, 이미 했거나 측정 대상이 아니면 null
// 탭 저장소를 못 쓰면 중복을 막을 수 없으므로 보내지 않는다
export function recordExposure(session, assignment) {
  if (!assignment.measured || readContext(session)) return null;
  const ctx = { id: HOME_EXPERIMENT_ID, variant: assignment.variant, mode: assignment.mode, converted: false, pending: null, classesViewed: false };
  return writeContext(session, ctx) ? baseParams(ctx, 'home') : null;
}

// 상세로 가는 링크를 눌렀을 때 — 노출 뒤이고 아직 도달 기록 전이면 어느 강의·어느 경로인지 적어 둔다
// source: 'home_card' | 'home_path' | 'course_list'
export function setPendingCourse(session, { courseId, source }) {
  const ctx = readContext(session);
  if (!ctx || ctx.converted) return false;
  return writeContext(session, { ...ctx, pending: { courseId, source } });
}

// 강의 상세를 열었을 때 — 적어 둔 강의와 같으면 1회 기록할 값, 아니면 null
export function consumeCourseOpen(session, courseId) {
  const ctx = readContext(session);
  if (!ctx || ctx.converted || ctx.pending?.courseId !== courseId) return null;
  if (!writeContext(session, { ...ctx, converted: true, pending: null })) return null;
  return { ...baseParams(ctx, 'course'), course_id: courseId, source: ctx.pending.source };
}

// 보조 지표: 메인의 강의 구역(#classes)이 화면에 나타남 — 노출 뒤 탭당 1회
export function markClassesView(session) {
  const ctx = readContext(session);
  if (!ctx || ctx.classesViewed) return null;
  return writeContext(session, { ...ctx, classesViewed: true }) ? baseParams(ctx, 'home') : null;
}

// 화면이 1초 연속 보이면 onExpose 한 번. 다른 탭으로 가면 취소하고, 다시 보이면 처음부터 1초
export function createExposureWatcher({ doc = document, onExpose, delayMs = EXPOSURE_DELAY_MS }) {
  let timer = null;
  let done = false;

  function handleVisibility() {
    clearTimeout(timer);
    if (done || doc.visibilityState !== 'visible') return;
    timer = setTimeout(() => {
      done = true;
      doc.removeEventListener('visibilitychange', handleVisibility);
      onExpose();
    }, delayMs);
  }

  doc.addEventListener('visibilitychange', handleVisibility);
  handleVisibility();
}

// 브라우저 저장소 — 사생활 보호 모드 등에서 접근 자체가 실패하면 null
export function browserStorage(name) {
  try {
    return window[name];
  } catch {
    return null;
  }
}

// 메인 A/B — A 감성 몰입형(큰 이미지·메시지 먼저) vs B 정보 탐색형(검색·강의·가격 먼저)
// 기준: planning/home-ab-v2 브랜치의 claude-development-brief.md
// 시연: ?ab_preview=A/B (측정 제외, 저장된 배정을 건드리지 않음)
// 실험 켬: ID별 50:50 무작위 배정 → localStorage(안 되면 sessionStorage)에 저장해 같은 브라우저는 같은 안
//          저장을 못 하면 B + 측정 제외. 실험 끔: 모두 B + 측정 안 함

export const HOME_EXPERIMENT_ID = 'hc_home_strategy_v1';
export const DEFAULT_HOME_VARIANT = 'B';
// ⚠ 실험 스위치 — false로 바꾸면 모든 방문자에게 B, 실험 이벤트 중지. 화면 버전을 바꾸면 새 ID로 (기존 결과와 섞지 않음)
export const HOME_EXPERIMENT_ACTIVE = true;
// 실험 배정 저장 키 — { 실험ID: 'A' | 'B' } 하나에 ID별로 모아 둔다
export const ASSIGNMENT_KEY = 'hanclass.experiments.v1';
const VARIANTS = ['A', 'B'];

function readAssignments(storage) {
  const raw = storage.getItem(ASSIGNMENT_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// 저장소 하나에서 배정을 읽거나 새로 정해 저장한다. 저장소를 못 쓰면 null
function assignWith(storage, random) {
  if (!storage) return null;
  try {
    const all = readAssignments(storage);
    if (VARIANTS.includes(all[HOME_EXPERIMENT_ID])) return all[HOME_EXPERIMENT_ID];
    const variant = random() < 0.5 ? 'A' : 'B';
    storage.setItem(ASSIGNMENT_KEY, JSON.stringify({ ...all, [HOME_EXPERIMENT_ID]: variant }));
    return variant;
  } catch {
    return null;
  }
}

// { variant: 'A' | 'B', mode: 'preview' | 'default' | 'experiment' | 'fallback', measured }
// 첫 화면을 그리기 전에 한 번 부른다. local·session: 저장소(못 쓰면 null), random: 0~1 난수 (테스트에서 고정)
export function resolveHomeVariant(search, { active = false, local = null, session = null, random = Math.random } = {}) {
  const preview = (new URLSearchParams(search).get('ab_preview') ?? '').toUpperCase();
  if (VARIANTS.includes(preview)) return { variant: preview, mode: 'preview', measured: false };
  if (!active) return { variant: DEFAULT_HOME_VARIANT, mode: 'default', measured: false };
  const variant = assignWith(local, random) ?? assignWith(session, random);
  if (!variant) return { variant: DEFAULT_HOME_VARIANT, mode: 'fallback', measured: false };
  return { variant, mode: 'experiment', measured: true };
}

// 시연 중인 탭 표시 — 시연에서 상세로 이동해도 GA4를 켜지 않기 위해 (sessionStorage = 탭이 닫히면 사라짐)
export const PREVIEW_SESSION_KEY = 'hanclass.abPreview';

export function markPreviewSession(storage = globalThis.sessionStorage) {
  try {
    storage.setItem(PREVIEW_SESSION_KEY, '1');
  } catch {
    // 저장소를 못 쓰는 브라우저 — 시연 주소 자체에서는 측정이 막혀 있다 (analytics.js)
  }
}

export function isPreviewSession(storage = globalThis.sessionStorage) {
  try {
    return storage.getItem(PREVIEW_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

// 서류 도우미 입력 임시 저장 — 이 탭에만(sessionStorage). 새로고침해도 남고, 탭을 닫거나 [모두 지우기]를 누르면 사라진다
// 공용 PC에서 다음 사람이 보지 않도록 브라우저에 오래 남기지 않는다. 서버로는 보내지 않는다
import { MODES } from '../../supabase/functions/_shared/docHelperRules.js';

const DRAFT_KEY = 'hanclass.helperDraft.v1';

function readAll(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(DRAFT_KEY));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// 이 길잡이에서 받는 칸의 문자열 값만 남긴다
function pickFields(mode, values = {}) {
  const allowed = MODES[mode]?.fields ?? [];
  return Object.fromEntries(allowed.filter((name) => typeof values[name] === 'string').map((name) => [name, values[name]]));
}

export function loadDraft(storage, mode) {
  return pickFields(mode, readAll(storage)[mode]);
}

export function saveDraft(storage, mode, values) {
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify({ ...readAll(storage), [mode]: pickFields(mode, values) }));
  } catch {
    // 저장소를 못 쓰면 임시 저장만 건너뛴다
  }
}

export function clearDrafts(storage) {
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    // 지울 것이 없거나 저장소를 못 쓰는 경우
  }
}

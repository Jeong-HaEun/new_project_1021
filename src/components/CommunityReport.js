// 커뮤니티 신고 영역과 숨긴 글 안내
// state: getReportState 결과 ('hidden' | 'reported' | 'can-report')
import { el } from '../lib/dom.js';
import { REPORT_HIDE_COUNT, REPORT_REASONS, getReportState, guardText, serverProblem, validateReport } from '../lib/communityGuard.js';
import { fetchMyReport, reportPost } from '../lib/communityApi.js';
import { showToast } from './Toast.js';
import { ErrorText } from './CommunityForm.js';

export function ReportBox({ state, open, error, busy, onOpen, onCancel, onSubmit }) {
  if (state === 'hidden') return null;
  if (state === 'reported') {
    return el('p', { className: 'community-hint community-report', text: `신고한 글이에요. 신고가 ${REPORT_HIDE_COUNT}개 쌓이면 다른 사람에게 보이지 않게 숨겨져요.` });
  }
  if (!open) {
    return el('div', { className: 'community-report' }, [
      el('button', { type: 'button', className: 'community-link-button', onClick: onOpen, text: '신고' }),
    ]);
  }
  return el('form', { className: 'community-report community-report__form', novalidate: '', onSubmit }, [
    el('fieldset', { className: 'community-picker' }, [
      el('legend', { className: 'helper-field__label', text: '어떤 문제인가요?' }),
      ...REPORT_REASONS.map((item) => el('label', { className: 'community-report__reason' }, [
        el('input', { type: 'radio', name: 'reason', value: item.id }),
        el('span', { text: item.label }),
      ])),
    ]),
    ErrorText(error),
    el('div', { className: 'community-actions' }, [
      el('button', { type: 'submit', className: 'button button--primary', ...(busy && { disabled: '' }), text: busy ? '보내는 중…' : '신고하기' }),
      el('button', { type: 'button', className: 'button button--ghost', onClick: onCancel, text: '취소' }),
    ]),
  ]);
}

// 글쓴이 본인에게만 보이는 안내 (다른 사람에게는 숨긴 글 자체가 내려오지 않는다)
export function HiddenNotice() {
  return el('p', { className: 'helper-notice', role: 'note', text: '신고가 쌓여 다른 사람에게는 숨겨진 글이에요. 지금은 나만 볼 수 있어요.' });
}

// 신고 상태·처리 묶음 — 페이지는 load(글 보기·로그인 때)와 Area(화면 조각)만 쓴다
// reported: null(모름·신고 기능 없음 → 버튼 숨김) | false | true
export function createReport({ postId, rerender }) {
  const state = { reported: null, open: false, error: null, busy: false };
  const set = (changes) => { Object.assign(state, changes); rerender(); };

  // canCheck: 로그인했고 남의 글을 보는 중. 못 읽으면(보호 SQL 적용 전 등) 버튼을 숨긴다
  async function load(canCheck) {
    state.reported = null;
    if (!canCheck) return;
    try {
      state.reported = await fetchMyReport(postId);
    } catch {
      state.reported = null;
    }
    rerender();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const checked = validateReport(new FormData(event.currentTarget).get('reason'));
    if (!checked.ok) return set({ error: '신고 이유를 골라 주세요.' });
    set({ busy: true, error: null });
    try {
      await reportPost(postId, checked.reason);
      set({ busy: false, open: false, reported: true });
      showToast('신고했어요. 확인해 볼게요.');
    } catch (error) {
      const problem = serverProblem(error);
      set(problem === 'already-reported' ? { busy: false, open: false, reported: true } : { busy: false, error: guardText(problem, 'report') });
    }
  }

  function Area({ user, post }) {
    const shown = state.reported === null ? 'hidden' : getReportState({ user, post, reported: state.reported });
    return ReportBox({
      state: shown, open: state.open, error: state.error, busy: state.busy, onSubmit: handleSubmit,
      onOpen: () => set({ open: true, error: null }), onCancel: () => set({ open: false, error: null }),
    });
  }

  return { load, Area };
}

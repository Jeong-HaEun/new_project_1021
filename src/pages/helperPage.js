// 서류 도우미 — helper.html?mode=cover_letter|interview|edit (SPEC.md '서류 도우미')
import { el } from '../lib/dom.js';
import { pageUrl, readParam } from '../lib/paths.js';
import { isServerConfigured } from '../lib/server.js';
import { getCurrentUser, onAuthChange } from '../lib/account.js';
import { callDocHelper, fetchHelperStatus } from '../lib/docHelperApi.js';
import { clearDrafts, loadDraft, saveDraft } from '../lib/docHelperDraft.js';
import { browserStorage } from '../lib/experimentTracking.js';
import { track } from '../lib/analytics.js';
import { keepHeightWhile, scrollToStartSmoothly } from '../lib/smoothScroll.js';
import { buildEditPrompt, DAILY_LIMIT, MODES, validateFields } from '../../supabase/functions/_shared/docHelperRules.js';
import { HELPER_EXAMPLES } from '../data/helperExamples.js';
import { renderPage } from '../components/PageLayout.js';
import { errorText, ExperienceGuideSection, Field, MODE_INTRO, Notice, ResultBox, Tabs } from '../components/HelperParts.js';
import { showToast } from '../components/Toast.js';
import { LoginButtons } from '../components/LoginButtons.js';
import '../styles/courses.css';
import '../styles/myclass.css';
import '../styles/helper.css';

const session = browserStorage('sessionStorage');
const configured = isServerConfigured();
const startMode = readParam('mode');
const EXP_INIT = () => ({ input: '', loading: false, result: null, error: null });
const state = { mode: MODES[startMode] ? startMode : 'cover_letter', user: undefined, status: null, loading: false, result: null, error: null, exp: EXP_INIT() };
const body = el('div', { className: 'helper-body' });

function handleSelect(mode) {
  Object.assign(state, { mode, result: null, error: null, exp: EXP_INIT() });
  history.replaceState(null, '', pageUrl('helper.html', { mode }));
  track('helper_tab_select', { helper_mode: mode });
  keepHeightWhile(body, render);
  scrollToStartSmoothly(body);
}

function handleInput(event) {
  saveDraft(session, state.mode, Object.fromEntries(new FormData(event.currentTarget)));
}

function handleExample() {
  saveDraft(session, state.mode, HELPER_EXAMPLES[state.mode]);
  Object.assign(state, { result: null, error: null });
  render();
}

function handleClear() {
  clearDrafts(session);
  Object.assign(state, { result: null, error: null });
  render();
  showToast('입력한 내용을 모두 지웠어요');
}

async function handleCopy(text) {
  await navigator.clipboard.writeText(text).then(
    () => { showToast('복사했어요'); track('helper_copy', { helper_mode: state.mode }); },
    () => showToast('복사하지 못했어요. 글을 직접 선택해 복사해 주세요.'),
  );
}

async function handleSubmit(event) {
  event.preventDefault();
  const mode = state.mode;
  const checked = validateFields(mode, Object.fromEntries(new FormData(event.currentTarget)));
  if (!checked.ok) {
    Object.assign(state, { error: errorText(checked), result: null });
    render();
    body.querySelector(`[name="${checked.field}"]`)?.focus();
    return;
  }
  if (!MODES[mode].usesAi) {
    Object.assign(state, { error: null, result: { title: '내 AI에 붙여 넣을 첨삭 프롬프트', text: buildEditPrompt(checked.fields) } });
    render();
    return;
  }
  Object.assign(state, { loading: true, error: null, result: null });
  render();
  const response = await callDocHelper({ mode, fields: checked.fields });
  state.loading = false;
  if (response.ok) {
    state.result = { title: `${MODES[mode].label} 결과`, text: response.data.text };
    state.status = { ...state.status, remaining: response.data.remaining };
    state.exp = EXP_INIT();
  } else {
    state.error = errorText(response);
    if (response.error === 'closed') state.status = { ...state.status, open: false };
    if (Number.isInteger(response.remaining)) state.status = { ...state.status, remaining: response.remaining };
  }
  track('helper_generate', { helper_mode: mode, result: response.ok ? 'ok' : response.error });
  render();
  body.querySelector('.helper-result, .helper-notice--error')?.scrollIntoView({ block: 'nearest' });
}

async function handleExpSubmit() {
  const experiences = state.exp.input.trim();
  if (!experiences) return;
  state.exp = { input: state.exp.input, loading: true, result: null, error: null };
  render();
  const r = await callDocHelper({ mode: 'experience_guide', fields: { ...loadDraft(session, 'cover_letter'), experiences } });
  state.exp = { input: state.exp.input, loading: false, result: r.ok ? r.data.text : null, error: r.ok ? null : errorText(r) };
  if (r.ok) state.status = { ...state.status, remaining: r.data.remaining };
  track('helper_generate', { helper_mode: 'experience_guide', result: r.ok ? 'ok' : r.error });
  render();
}

// AI 길잡이를 쓸 수 없는 상태면 안내를 돌려준다 (쓸 수 있으면 null)
function AiGate() {
  if (!configured) return Notice('AI 답변 서버를 준비하고 있어요. 첨삭 길잡이는 지금 쓸 수 있어요.');
  if (state.user === undefined) return Notice('로그인 상태를 확인하고 있어요…');
  if (state.user === null) {
    return el('div', { className: 'empty-state myclass-panel' }, [
      el('strong', { text: '로그인하면 하루 3번 AI 답변을 받을 수 있어요' }),
      el('p', { className: 'text-muted', text: '실습 기간 동안 무료예요. 첨삭 길잡이는 로그인 없이 쓸 수 있어요.' }),
      ...LoginButtons('helper.html'),
    ]);
  }
  if (!state.status) return el('div', {}, [Notice('이용 횟수를 확인하지 못했어요.', 'error'), el('button', { type: 'button', className: 'button button--ghost', onClick: refreshStatus, text: '다시 시도' })]);
  if (state.status.unreachable) {
    return el('div', { className: 'helper-actions' }, [
      Notice('AI 답변 서버에 연결하지 못했어요. 준비 중이거나 연결이 잠시 불안정해요. 첨삭 길잡이는 지금 쓸 수 있어요.'),
      el('button', { type: 'button', className: 'button button--ghost', onClick: refreshStatus, text: '다시 시도' }),
    ]);
  }
  if (!state.status.open) return Notice(errorText({ error: 'closed' }));
  return null;
}

function Form() {
  const mode = state.mode;
  const usesAi = MODES[mode].usesAi;
  const values = loadDraft(session, mode);
  const noneLeft = usesAi && state.status?.remaining === 0;
  const submitText = state.loading ? '답변을 만드는 중이에요… (최대 1분)' : usesAi ? '길잡이 받기' : '프롬프트 만들기';
  return el('form', { className: 'helper-form', novalidate: '', onSubmit: handleSubmit, onInput: handleInput, 'aria-busy': String(state.loading) }, [
    ...MODES[mode].fields.map((name) => Field(mode, name, values[name])),
    usesAi ? el('p', { className: 'helper-quota', text: `오늘 남은 횟수 ${state.status.remaining} / ${DAILY_LIMIT}` }) : null,
    el('div', { className: 'helper-actions' }, [
      el('button', { type: 'submit', className: 'button button--primary', text: submitText, ...((state.loading || noneLeft) && { disabled: '' }) }),
      el('button', { type: 'button', className: 'button button--ghost', onClick: handleExample, text: '예시로 채우기' }),
      el('button', { type: 'button', className: 'button button--ghost', onClick: handleClear, text: '모두 지우기' }),
    ]),
    el('p', { className: 'helper-privacy', text: usesAi
      ? '입력한 내용은 답변을 만들기 위해 Google(Gemini)로 보내져요. 무료 버전이라 Google이 서비스 개선에 쓰거나 사람이 검토할 수 있으니, 이름·연락처·학교 같은 개인정보는 빼고 넣어 주세요. 한클래스는 내용을 저장하지 않고 이용 횟수만 기록해요. AI 답변은 참고용이니 사실은 직접 확인해 주세요.'
      : '입력한 내용은 이 브라우저에서만 프롬프트로 바뀌고, 어디로도 보내지 않아요.' }),
  ]);
}

function Result() {
  if (!state.result) return null;
  const { title, text } = state.result;
  const actions = [el('button', { type: 'button', className: 'button button--primary', onClick: () => handleCopy(text), text: '복사하기' })];
  if (!MODES[state.mode].usesAi) actions.push(el('a', { href: 'https://chatgpt.com/', target: '_blank', rel: 'noopener noreferrer', className: 'button button--ghost', text: 'ChatGPT 열기 ↗', onClick: () => track('helper_open_ai', { helper_mode: state.mode }) }));
  const box = ResultBox(title, text, actions);
  if (state.mode !== 'cover_letter') return box;
  return el('div', { className: 'helper-result-group' }, [box, ExperienceGuideSection(state.exp, (e) => { state.exp = { ...state.exp, input: e.target.value }; }, handleExpSubmit, () => { state.exp = { ...state.exp, result: null, error: null }; render(); })]);
}

function render() {
  const gate = MODES[state.mode].usesAi ? AiGate() : null;
  body.replaceChildren(
    Tabs(state.mode, handleSelect),
    el('div', { id: 'helper-panel', role: 'tabpanel', 'aria-labelledby': `tab-${state.mode}`, className: 'helper-panel' }, [
      el('p', { className: 'helper-intro', text: MODE_INTRO[state.mode] }),
      gate ?? Form(),
      state.error ? Notice(state.error, 'error') : null,
      Result(),
    ].filter(Boolean)),
  );
}

async function refreshStatus() {
  state.status = state.user ? await fetchHelperStatus() : null;
  render();
}

renderPage({
  active: 'helper',
  title: '서류 도우미',
  content: [
    el('h1', { className: 'page-title', text: '서류 도우미' }),
    el('p', { className: 'page-desc text-muted', text: '자소서 문항 분석과 면접 예상 질문은 AI가 바로 답하고, 첨삭은 내 AI에 붙여 넣을 질문을 만들어 드려요.' }),
    body,
  ],
});

render();
if (configured) {
  getCurrentUser().then((user) => {
    state.user = user;
    refreshStatus();
  }).catch(() => {
    state.user = null;
    render();
  });
  onAuthChange((user) => {
    if ((user?.id ?? null) === (state.user?.id ?? null)) return;
    state.user = user;
    refreshStatus();
  });
}

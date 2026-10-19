// 로그인 — login.html?next=myclass.html|helper.html|report.html|community.html
// 카카오 또는 이메일·비밀번호. 이메일 가입은 인증 메일의 링크를 눌러야 끝난다 (SPEC.md '로그인')
// 비밀번호 찾기: 재설정 메일 → 링크(login.html?reset=1) → 새 비밀번호 저장 → next로 이동
import { el } from '../lib/dom.js';
import { readParam } from '../lib/paths.js';
import { isServerConfigured } from '../lib/server.js';
import { getCurrentUser, sendPasswordReset, signInWithEmail, signInWithKakao, signUpWithEmail, updatePassword } from '../lib/account.js';
import { authErrorText, getRecoveryState, MIN_PASSWORD_LENGTH, safeNextPage, validateAuthForm } from '../lib/emailAuth.js';
import { renderPage } from '../components/PageLayout.js';
import { Notice } from '../components/HelperParts.js';
import '../styles/courses.css';
import '../styles/myclass.css';
import '../styles/helper.css';
import '../styles/login.css';

const next = safeNextPage(readParam('next'));
// 서버 라이브러리가 주소의 # 뒤를 지우기 전에 재설정 링크로 왔는지 먼저 읽어 둔다
const recovery = getRecoveryState(window.location.search, window.location.hash);
// mode: 'login' | 'signup' | 'forgot' | 'reset'. values: 입력값은 화면을 다시 그려도 남도록 메모리에만 둔다 (저장하지 않음)
const state = { mode: recovery === 'none' ? 'login' : 'reset', busy: false, error: null, sent: false, done: false, user: undefined, values: {} };
const body = el('div', { className: 'login-body' });

const NEW_PASSWORD = [['password', `새 비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`, 'password', 'new-password'], ['passwordConfirm', '새 비밀번호 확인', 'password', 'new-password']];
const FIELDS = {
  login: [['email', '이메일', 'email', 'email'], ['password', '비밀번호', 'password', 'current-password']],
  signup: [['email', '이메일', 'email', 'email'], ['password', `비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`, 'password', 'new-password'], ['passwordConfirm', '비밀번호 확인', 'password', 'new-password']],
  forgot: [['email', '가입한 이메일', 'email', 'email']],
  reset: NEW_PASSWORD,
};
const SUBMIT_TEXT = { login: '이메일로 로그인', signup: '가입하고 인증 메일 받기', forgot: '재설정 메일 받기', reset: '새 비밀번호 저장' };
const SENT_TEXT = {
  signup: '인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 끝나고 로그인돼요. 메일이 없으면 스팸함을 확인해 주세요. 이미 가입한 이메일이면 로그인해 주세요.',
  forgot: '가입한 이메일이면 비밀번호 재설정 메일이 가요. 메일의 링크를 누르면 새 비밀번호를 정할 수 있어요. 메일이 없으면 스팸함을 확인해 주세요.',
};

function handleMode(mode) {
  Object.assign(state, { mode, error: null, sent: false });
  render();
}

async function handleKakao() {
  try {
    await signInWithKakao(next);
  } catch {
    state.error = '카카오 로그인을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
    render();
  }
}

// 모드별 서버 요청. 끝나면 화면 상태만 바꾼다 (로그인은 바로 이동)
async function submit({ email, password }) {
  if (state.mode === 'login') {
    await signInWithEmail(email, password);
    window.location.href = next;
  } else if (state.mode === 'signup') {
    await signUpWithEmail(email, password, next);
    state.sent = true;
  } else if (state.mode === 'forgot') {
    await sendPasswordReset(email, next);
    state.sent = true;
  } else {
    await updatePassword(password);
    state.done = true;
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const checked = validateAuthForm(state.mode, Object.fromEntries(new FormData(event.currentTarget)));
  if (!checked.ok) {
    state.error = checked.message;
    render();
    body.querySelector(`[name="${checked.field}"]`)?.focus();
    return;
  }
  Object.assign(state, { busy: true, error: null });
  render();
  try {
    await submit(checked);
  } catch (error) {
    state.error = authErrorText(error);
  }
  state.busy = false;
  render();
}

function Field([name, label, type, autocomplete]) {
  const id = `login-${name}`;
  const input = el('input', { id, name, type, autocomplete, className: 'helper-input', required: '', ...(type === 'email' && { inputmode: 'email' }) });
  input.value = state.values[name] ?? '';
  return el('label', { className: 'helper-field', for: id }, [
    el('span', { className: 'helper-field__label', text: label }),
    input,
  ]);
}

const linkButton = (text, onClick) => el('button', { type: 'button', className: 'login-text-button', onClick, text });

function EmailForm() {
  if (state.sent) return Notice(SENT_TEXT[state.mode]);
  return el('form', { className: 'helper-form', novalidate: '', onSubmit: handleSubmit, onInput: (e) => { state.values[e.target.name] = e.target.value; }, 'aria-busy': String(state.busy) }, [
    ...FIELDS[state.mode].map(Field),
    el('button', { type: 'submit', className: 'button button--primary login-submit', text: state.busy ? '처리하는 중이에요…' : SUBMIT_TEXT[state.mode], ...(state.busy && { disabled: '' }) }),
  ]);
}

const Panel = (title, children) => el('div', { className: 'empty-state myclass-panel' }, [el('strong', { text: title }), ...children]);

// 재설정 링크로 들어온 화면 — 링크가 유효하면(로그인 상태) 새 비밀번호, 아니면 다시 요청 안내
function ResetScreen() {
  if (state.done) return [Panel('비밀번호를 바꿨어요', [el('a', { href: next, className: 'button button--primary', text: '계속하기' })])];
  if (state.user === undefined) return [Notice('재설정 링크를 확인하고 있어요…')];
  if (recovery === 'expired' || !state.user) {
    return [Panel('재설정 링크가 만료됐거나 이미 사용했어요', [
      el('p', { className: 'text-muted', text: '비밀번호 찾기를 다시 해 주세요. 링크는 한 번만 쓸 수 있어요.' }),
      el('a', { href: `login.html?next=${next}`, className: 'button button--primary', text: '비밀번호 찾기 다시 하기' }),
    ])];
  }
  return [el('p', { className: 'text-muted', text: '새로 쓸 비밀번호를 정해 주세요.' }), EmailForm(), state.error ? Notice(state.error, 'error') : null];
}

function LoginScreen() {
  const tab = (mode, text) => el('button', { type: 'button', className: 'helper-tab', 'aria-pressed': String(state.mode === mode), onClick: () => handleMode(mode), text });
  return [
    el('button', { type: 'button', className: 'button kakao-login login-kakao', onClick: handleKakao, text: '카카오로 로그인' }),
    el('p', { className: 'login-divider', text: '또는 이메일로' }),
    el('div', { className: 'helper-tabs', role: 'group', 'aria-label': '이메일 로그인 또는 가입' }, [tab('login', '로그인'), tab('signup', '회원가입')]),
    state.mode === 'forgot' ? el('p', { className: 'text-muted', text: '가입한 이메일을 적으면 비밀번호를 새로 정하는 링크를 보내 드려요.' }) : null,
    EmailForm(),
    state.error ? Notice(state.error, 'error') : null,
    state.mode === 'login' ? linkButton('비밀번호를 잊었어요', () => handleMode('forgot')) : null,
    state.mode === 'forgot' ? linkButton('로그인으로 돌아가기', () => handleMode('login')) : null,
    el('p', { className: 'helper-privacy', text: '이메일은 로그인과 인증·재설정 메일에만 써요. 비밀번호는 한클래스가 보거나 저장하지 않고 로그인 서버(Supabase)가 암호화해 보관해요.' }),
  ];
}

function render() {
  if (!isServerConfigured()) {
    body.replaceChildren(Notice('로그인 서버 연결을 준비하고 있어요.'));
    return;
  }
  if (state.mode === 'reset') {
    body.replaceChildren(...ResetScreen().filter(Boolean));
    return;
  }
  if (state.user) {
    body.replaceChildren(Panel('이미 로그인했어요', [el('a', { href: next, className: 'button button--primary', text: '계속하기' })]));
    return;
  }
  body.replaceChildren(...LoginScreen().filter(Boolean));
}

renderPage({
  active: 'myclass',
  title: '로그인',
  content: [
    el('h1', { className: 'page-title', text: recovery === 'none' ? '로그인' : '비밀번호 재설정' }),
    el('p', { className: 'page-desc text-muted', text: '카카오나 이메일로 로그인하면 내 강의실·서류 도우미·광고 보고서·커뮤니티 글쓰기를 쓸 수 있어요.' }),
    body,
  ],
});

render();
if (isServerConfigured()) {
  getCurrentUser().then((user) => {
    state.user = user;
    render();
  }).catch(() => {
    state.user = null;
    render();
  });
}

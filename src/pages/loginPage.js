// 로그인 — login.html?next=myclass.html|helper.html|report.html|community.html
// 카카오 또는 이메일·비밀번호. 이메일 가입은 인증 메일의 링크를 눌러야 끝난다 (SPEC.md '로그인')
import { el } from '../lib/dom.js';
import { readParam } from '../lib/paths.js';
import { isServerConfigured } from '../lib/server.js';
import { getCurrentUser, signInWithEmail, signInWithKakao, signUpWithEmail } from '../lib/account.js';
import { authErrorText, MIN_PASSWORD_LENGTH, safeNextPage, validateAuthForm } from '../lib/emailAuth.js';
import { renderPage } from '../components/PageLayout.js';
import { Notice } from '../components/HelperParts.js';
import '../styles/courses.css';
import '../styles/myclass.css';
import '../styles/helper.css';
import '../styles/login.css';

const next = safeNextPage(readParam('next'));
// values: 입력값은 화면을 다시 그려도 남도록 메모리에만 둔다 (저장하지 않음)
const state = { mode: 'login', busy: false, error: null, sent: false, user: undefined, values: {} };
const body = el('div', { className: 'login-body' });

const FIELDS = {
  login: [['email', '이메일', 'email', 'email'], ['password', '비밀번호', 'password', 'current-password']],
  signup: [['email', '이메일', 'email', 'email'], ['password', `비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`, 'password', 'new-password'], ['passwordConfirm', '비밀번호 확인', 'password', 'new-password']],
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
    if (state.mode === 'login') {
      await signInWithEmail(checked.email, checked.password);
      window.location.href = next;
      return;
    }
    await signUpWithEmail(checked.email, checked.password, next);
    state.sent = true;
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

function EmailForm() {
  if (state.sent) {
    return Notice('인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 끝나고 로그인돼요. 메일이 없으면 스팸함을 확인해 주세요. 이미 가입한 이메일이면 로그인해 주세요.');
  }
  const submitText = state.busy ? '처리하는 중이에요…' : state.mode === 'login' ? '이메일로 로그인' : '가입하고 인증 메일 받기';
  return el('form', { className: 'helper-form', novalidate: '', onSubmit: handleSubmit, onInput: (e) => { state.values[e.target.name] = e.target.value; }, 'aria-busy': String(state.busy) }, [
    ...FIELDS[state.mode].map(Field),
    el('button', { type: 'submit', className: 'button button--primary login-submit', text: submitText, ...(state.busy && { disabled: '' }) }),
  ]);
}

function render() {
  if (!isServerConfigured()) {
    body.replaceChildren(Notice('로그인 서버 연결을 준비하고 있어요.'));
    return;
  }
  if (state.user) {
    body.replaceChildren(el('div', { className: 'empty-state myclass-panel' }, [
      el('strong', { text: '이미 로그인했어요' }),
      el('a', { href: next, className: 'button button--primary', text: '계속하기' }),
    ]));
    return;
  }
  const tab = (mode, text) => el('button', { type: 'button', className: 'helper-tab', 'aria-pressed': String(state.mode === mode), onClick: () => handleMode(mode), text });
  body.replaceChildren(...[
    el('button', { type: 'button', className: 'button kakao-login login-kakao', onClick: handleKakao, text: '카카오로 로그인' }),
    el('p', { className: 'login-divider', text: '또는 이메일로' }),
    el('div', { className: 'helper-tabs', role: 'group', 'aria-label': '이메일 로그인 또는 가입' }, [tab('login', '로그인'), tab('signup', '회원가입')]),
    EmailForm(),
    state.error ? Notice(state.error, 'error') : null,
    el('p', { className: 'helper-privacy', text: '이메일은 로그인과 인증 메일에만 써요. 비밀번호는 한클래스가 보거나 저장하지 않고 로그인 서버(Supabase)가 암호화해 보관해요. 비밀번호 찾기는 준비 중이에요.' }),
  ].filter(Boolean));
}

renderPage({
  active: 'myclass',
  title: '로그인',
  content: [
    el('h1', { className: 'page-title', text: '로그인' }),
    el('p', { className: 'page-desc text-muted', text: '카카오나 이메일로 로그인하면 내 강의실·서류 도우미·광고 보고서·커뮤니티 글쓰기를 쓸 수 있어요.' }),
    body,
  ],
});

render();
if (isServerConfigured()) {
  getCurrentUser().then((user) => {
    state.user = user;
    render();
  }).catch(() => {});
}

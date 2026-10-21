// 로그인 안내 버튼 — [카카오로 로그인] + 이메일 로그인 링크 (login.html로 가서 끝나면 returnPage로 돌아온다)
import { showToast } from './Toast.js';
import { RememberLogin } from './RememberLogin.js';
import { setRememberLogin } from '../lib/server.js';
import { el } from '../lib/dom.js';
import { pageUrl } from '../lib/paths.js';
import { signInWithKakao } from '../lib/account.js';

export function LoginButtons(returnPage, onKakao = () => signInWithKakao(returnPage)) {
  let remember = false;
  async function handleKakao() {
    try {
      await setRememberLogin(remember);
      await onKakao();
    } catch {
      showToast('로그인을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    }
  }
  return [
    RememberLogin({ onChange: (checked) => { remember = checked; } }),
    el('button', { type: 'button', className: 'button kakao-login', onClick: handleKakao, text: '카카오로 로그인' }),
    el('a', { href: pageUrl('login.html', { next: returnPage }), className: 'login-email-link', text: '이메일로 로그인·가입' }),
  ];
}

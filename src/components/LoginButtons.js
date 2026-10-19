// 로그인 안내 버튼 — [카카오로 로그인] + 이메일 로그인 링크 (login.html로 가서 끝나면 returnPage로 돌아온다)
import { el } from '../lib/dom.js';
import { pageUrl } from '../lib/paths.js';
import { signInWithKakao } from '../lib/account.js';

export function LoginButtons(returnPage, onKakao = () => signInWithKakao(returnPage)) {
  return [
    el('button', { type: 'button', className: 'button kakao-login', onClick: onKakao, text: '카카오로 로그인' }),
    el('a', { href: pageUrl('login.html', { next: returnPage }), className: 'login-email-link', text: '이메일로 로그인·가입' }),
  ];
}

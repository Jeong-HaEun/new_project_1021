import '../styles/header-account.css';
// 서버 계정의 별명만 사용. 이전 계정의 커뮤니티 로컬 별명은 사용하지 않는다.
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { getCurrentUser, onAuthChange } from '../lib/account.js';
import { memberName } from '../lib/memberName.js';
export function HeaderAccount({ active } = {}) {
  const label = el('span', { className: 'header-account__name', text: '로그인' });
  const suffix = el('span', { className: 'header-account__suffix', text: '님' });
  suffix.hidden = true;
  const link = el('a', {
    href: 'myclass.html', className: 'header-account', 'aria-label': '내 강의실·로그인',
    ...(active === 'myclass' && { 'aria-current': 'page' }),
  }, [icon('user'), label, suffix]);
  let revision = 0;
  const render = (user) => {
    const name = memberName(user);
    label.textContent = name || '로그인';
    suffix.hidden = !name;
    link.setAttribute('title', name ? name + '님 · 내 강의실' : '내 강의실·로그인');
    link.setAttribute('aria-label', link.getAttribute('title'));
  };
  const handleAuth = (user) => { revision += 1; render(user); };
  // 조회 도중 로그아웃/계정 변경이 일어나면 늦은 조회 결과는 버린다.
  onAuthChange(handleAuth).catch(() => {});
  const started = revision;
  getCurrentUser().then((user) => { if (revision === started) render(user); }).catch(() => {});
  return link;
}

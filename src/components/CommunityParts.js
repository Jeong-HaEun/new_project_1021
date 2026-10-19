// 커뮤니티 화면 조각 — 상태 안내, 분류 칩, 글 목록, 글 보기
// 글·닉네임은 사용자가 쓴 글이므로 반드시 text(textContent)로만 넣는다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { pageUrl } from '../lib/paths.js';
import { CATEGORIES } from '../lib/community.js';
import { formatPostDate } from '../lib/communityView.js';
import { OfficialBadge } from './OfficialBadge.js';
import { LoginButtons } from './LoginButtons.js';

export const RULES_NOTE = '올린 글과 댓글은 로그인하지 않은 사람도 볼 수 있어요. 전화번호·이메일 같은 개인정보는 쓰지 마세요. 합격·취업을 약속하는 과장 표현과 광고 글은 올릴 수 없어요.';

const categoryLabel = (id) => CATEGORIES.find((item) => item.id === id)?.label ?? '';
const courseTitle = (courses, id) => courses.find((course) => course.id === id)?.title;

function Panel(children) {
  return el('div', { className: 'empty-state community-panel' }, children);
}

const listLink = () => el('a', { href: 'community.html', className: 'button button--ghost', text: '글 목록으로' });

export function UnavailablePanel() {
  return Panel([
    icon('chat', 32),
    el('strong', { text: '커뮤니티는 서버 연결 준비 중이에요' }),
    el('p', { className: 'text-muted', text: '서버가 연결되면 글을 읽고 쓸 수 있어요.' }),
  ]);
}

export function LoadingPanel() {
  return Panel([el('p', { className: 'text-muted', role: 'status', text: '불러오는 중이에요…' })]);
}

export function ErrorPanel(onRetry) {
  return Panel([
    el('strong', { role: 'alert', text: '커뮤니티를 불러오지 못했어요' }),
    el('p', { className: 'text-muted', text: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.' }),
    el('button', { type: 'button', className: 'button button--primary', onClick: onRetry, text: '다시 시도' }),
  ]);
}

export function NotFoundPanel() {
  return Panel([el('strong', { text: '글을 찾을 수 없어요' }), el('p', { className: 'text-muted', text: '지워졌거나 주소가 바뀐 글이에요.' }), listLink()]);
}

// 로그인 안내 — 글쓰기·댓글은 로그인한 사람만
export function LoginPrompt(onLogin, text = '글을 쓰려면 로그인해 주세요') {
  return el('div', { className: 'community-login' }, [
    el('p', { text }),
    ...LoginButtons('community.html', onLogin),
  ]);
}

// 분류 칩 — 링크라 새로고침·공유해도 같은 목록
export function CategoryChips(active) {
  const chip = (id, label) =>
    el('a', { href: pageUrl('community.html', { category: id }), className: 'chip', ...(active === id && { 'aria-current': 'page' }), text: label });
  return el('nav', { className: 'chip-row community-chips', 'aria-label': '글 분류' }, [chip('all', '전체'), ...CATEGORIES.map((item) => chip(item.id, item.label))]);
}

function Meta(post, extra = []) {
  return el('p', { className: 'community-meta' }, [
    el('span', { text: post.authorName }),
    post.official ? OfficialBadge() : null,
    el('span', { text: formatPostDate(post.createdAt) }),
    post.edited ? el('span', { text: '수정됨' }) : null,
    ...extra,
  ]);
}

function CategoryBadge(post, courses) {
  const title = courseTitle(courses, post.courseId);
  return el('div', { className: 'community-badges' }, [
    el('span', { className: `badge community-badge community-badge--${post.category}`, text: categoryLabel(post.category) }),
    post.hidden ? el('span', { className: 'badge badge--soon', text: '숨김' }) : null,
    title ? el('span', { className: 'community-course', text: title }) : null,
  ]);
}

// 빈 상태 — 가짜 글을 채우지 않고 첫 글을 안내한다
function EmptyList(category, writeAction) {
  const isOutcome = category === 'outcome';
  return Panel([
    icon('chat', 32),
    el('strong', { text: category === 'all' ? '아직 올라온 글이 없어요' : `아직 '${categoryLabel(category)}' 글이 없어요` }),
    el('p', { className: 'text-muted', text: isOutcome ? '강의에서 만든 결과물 1개와 만들면서 배운 점을 나눠 보세요.' : '첫 글을 남겨 보세요. 막힌 부분을 묻거나 배운 점을 나눌 수 있어요.' }),
    writeAction,
  ]);
}

export function PostList(posts, { category, courses, writeAction }) {
  if (posts.length === 0) return EmptyList(category, writeAction);
  return el('ul', { className: 'community-list' }, posts.map((post) =>
    el('li', {}, [
      el('a', { href: pageUrl('community.html', { post: String(post.id) }), className: 'community-item' }, [
        CategoryBadge(post, courses),
        el('strong', { className: 'community-item__title', text: post.title }),
        el('p', { className: 'community-item__preview', text: post.body }),
        Meta(post, [el('span', { text: `댓글 ${post.commentCount}` })]),
      ]),
    ]),
  ));
}

// 글 보기 — owner면 [수정] [삭제]. notice: 숨긴 글 안내, reportNode: 신고 영역
export function PostView(post, { courses, owner, onDelete, notice = null, reportNode = null }) {
  const title = courseTitle(courses, post.courseId);
  return el('article', { className: 'community-post' }, [
    notice,
    CategoryBadge(post, []),
    el('h1', { className: 'community-post__title', text: post.title }),
    Meta(post),
    el('p', { className: 'community-post__body', text: post.body }),
    title ? el('a', { href: `course.html?id=${post.courseId}`, className: 'community-post__course' }, [icon('book', 18), el('span', { text: `관련 강의 · ${title}` })]) : null,
    owner ? el('div', { className: 'community-actions' }, [
      el('a', { href: pageUrl('community.html', { edit: String(post.id) }), className: 'button button--ghost', text: '수정' }),
      el('button', { type: 'button', className: 'button button--ghost community-danger', onClick: onDelete, text: '삭제' }),
    ]) : null,
    reportNode,
  ]);
}

// 글쓰기 버튼 — 로그인 확인 중이면 숨기고, 로그아웃이면 로그인 버튼
// category: 지금 보는 분류 — 글쓰기 폼의 기본 분류가 된다 ('all'이면 기본값)
function WriteAction(user, onLogin, category) {
  if (user === undefined) return null;
  if (!user) {
    return el('div', { className: 'community-login-actions' }, [
      el('button', { type: 'button', className: 'button kakao-login', onClick: onLogin, text: '카카오로 로그인하고 글쓰기' }),
      LoginButtons('community.html')[1],
    ]);
  }
  const href = pageUrl('community.html', { write: '1', category });
  return el('a', { href, className: 'button button--primary', text: '글쓰기' });
}

// 목록 화면 — 제목·글쓰기 버튼, 분류 칩, 안내, 글 목록
export function ListScreen({ user, posts, category, courses, onLogin }) {
  return [
    el('div', { className: 'community-head' }, [
      el('div', {}, [
        el('h1', { className: 'page-title', text: '커뮤니티' }),
        el('p', { className: 'page-desc text-muted', text: '강의에서 만든 결과물을 나누고, 막힌 부분을 함께 풀어요.' }),
      ]),
      WriteAction(user, onLogin, category),
    ]),
    CategoryChips(category),
    el('p', { className: 'community-rules', text: RULES_NOTE }),
    PostList(posts, { category, courses, writeAction: WriteAction(user, onLogin, category) }),
  ];
}

export function BackLink() {
  return el('a', { href: 'community.html', className: 'community-back' }, [icon('back', 18), el('span', { text: '글 목록' })]);
}

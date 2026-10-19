// 운영자 페이지 — admin.html. 운영자 명단에 있는 계정만 회원 통계와 신고·숨김 글 처리를 본다 (SPEC.md '운영자 페이지')
// 페이지 파일은 누구나 열 수 있다. 데이터는 DB 함수가 운영자인지 확인한 뒤에만 돌려준다
import { el } from '../lib/dom.js';
import { isServerConfigured } from '../lib/server.js';
import { getCurrentUser, onAuthChange, signInWithKakao, signOut } from '../lib/account.js';
import { deletePostAsAdmin, fetchAdminRole, fetchOverview, fetchReportedPosts, setPostHidden } from '../lib/adminApi.js';
import { adminProblem, getAdminState, normalizeOverview, normalizeReported } from '../lib/adminView.js';
import { COURSES } from '../data/courses/index.js';
import { renderPage } from '../components/PageLayout.js';
import * as Parts from '../components/AdminParts.js';
import { AdminVideos } from '../components/AdminVideos.js';
import { showToast } from '../components/Toast.js';
import '../styles/courses.css';
import '../styles/helper.css';
import '../styles/community.css';
import '../styles/admin.css';

const configured = isServerConfigured();
const body = el('div', { className: 'admin-body' });
// user: undefined(확인 중) | null | 사용자. 로그아웃하면 운영 정보를 바로 비운다
// videos: 영상 올리기 조각 — 사용자마다 한 번 만들고, 다시 그려도 고른 파일·목록을 유지한다
const view = { user: undefined, role: null, status: 'loading', overview: null, reported: [], busyId: null, videos: null };
let requestId = 0;

async function handleLogin() {
  try {
    await signInWithKakao('admin.html');
  } catch {
    showToast('카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
}

async function handleLogout() {
  try {
    await signOut();
  } catch {
    showToast('로그아웃하지 못했어요. 다시 시도해 주세요.');
    return;
  }
  setUser(null);
}

async function load() {
  const id = ++requestId; // 늦게 도착한 이전 응답(다른 사용자·이전 요청)은 버린다
  Object.assign(view, { status: 'loading', role: null, overview: null, reported: [] });
  render();
  try {
    const role = await fetchAdminRole();
    if (id !== requestId) return;
    if (!role) {
      Object.assign(view, { status: 'ready', role: null });
      return render();
    }
    const [overview, reported] = await Promise.all([fetchOverview(), fetchReportedPosts()]);
    if (id !== requestId) return;
    Object.assign(view, { status: 'ready', role, overview: normalizeOverview(overview, COURSES), reported: normalizeReported(reported) });
    view.videos ??= AdminVideos({ courses: COURSES, toast: showToast });
  } catch (error) {
    if (id !== requestId) return;
    view.status = adminProblem(error) === 'not-ready' ? 'not-ready' : 'error';
  }
  render();
}

function setUser(user) {
  requestId += 1;
  Object.assign(view, { user, role: null, overview: null, reported: [], videos: null, status: user ? 'loading' : 'ready' });
  if (user) load();
  else render();
}

async function runAction(post, action, doneText) {
  view.busyId = post.id;
  render();
  try {
    await action();
    showToast(doneText);
  } catch (error) {
    showToast(adminProblem(error) === 'not-found' ? '이미 지워진 글이에요.' : '처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  view.busyId = null;
  load();
}

function handleToggle(post) {
  const hidden = !post.hidden;
  runAction(post, () => setPostHidden(post.id, hidden, hidden ? '운영자 숨김' : '검토 후 다시 보이기'), hidden ? '글을 숨겼어요' : '글을 다시 보이게 했어요');
}

function handleDelete(post) {
  runAction(post, () => deletePostAsAdmin(post.id, '운영자 삭제'), '글을 삭제했어요');
}

const PANELS = {
  unavailable: () => [Parts.UnavailablePanel()],
  loading: () => [Parts.LoadingPanel()],
  'signed-out': () => [Parts.SignedOutPanel(handleLogin)],
  'not-ready': () => [Parts.NotAdminPanel(view.user.id, handleLogout, true)],
  'not-admin': () => [Parts.NotAdminPanel(view.user.id, handleLogout)],
  error: () => [Parts.ErrorPanel(() => (view.user ? load() : init()))],
  ready: () => [
    Parts.AccountBar(view.role, handleLogout),
    ...Parts.OverviewSections(view.overview),
    Parts.ReportedSection(view.reported, { onToggle: handleToggle, onDelete: handleDelete, busyId: view.busyId }),
    view.videos,
  ],
};

function render() {
  const state = getAdminState({ configured, ...view });
  body.setAttribute('aria-busy', String(state === 'loading'));
  body.replaceChildren(...PANELS[state]().filter(Boolean));
}

async function init() {
  render();
  try {
    setUser(await getCurrentUser());
    await onAuthChange((user) => {
      if ((user?.id ?? null) !== (view.user?.id ?? null)) setUser(user);
    });
  } catch {
    view.status = 'error';
    render();
  }
}

renderPage({
  active: null,
  title: '운영자',
  pageType: 'admin',
  syncAccount: false,
  content: [
    el('h1', { className: 'page-title', text: '운영자 페이지' }),
    el('p', { className: 'page-desc text-muted', text: Parts.ADMIN_NOTE }),
    body,
  ],
});

if (configured) init();
else render();

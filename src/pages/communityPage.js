// 커뮤니티 — community.html (목록 ?category= · 글 ?post= · 글쓰기 ?write=1 · 수정 ?edit=) (SPEC.md '커뮤니티')
// 읽기는 누구나, 쓰기는 카카오 로그인한 사람만, 수정·삭제는 본인 것만 (화면은 버튼만 숨기고, 실제로는 DB RLS가 막는다)
// 도배 방지·서버 개인정보 검사·신고 숨김도 DB가 맡는다. 화면은 거절 이유를 안내만 한다 (communityGuard.js)
import { el } from '../lib/dom.js';
import { isServerConfigured } from '../lib/server.js';
import { getCurrentUser, onAuthChange, signInWithKakao } from '../lib/account.js';
import { canComment, canManage, validateComment, validatePost } from '../lib/community.js';
import { fetchAdminRole } from '../lib/adminApi.js';
import { getCommunityRoute, getCommunityState, normalizeComments, normalizePost, normalizePosts, problemText } from '../lib/communityView.js';
import { guardText, serverProblem } from '../lib/communityGuard.js';
import { rememberName, rememberReturn, savedName, takeReturn } from '../lib/communityStore.js';
import * as Api from '../lib/communityApi.js';
import { COURSES } from '../data/courses/index.js';
import { renderPage } from '../components/PageLayout.js';
import * as Parts from '../components/CommunityParts.js';
import { CommentSection, PostForm } from '../components/CommunityForm.js';
import { createReport, HiddenNotice } from '../components/CommunityReport.js';
import { showToast } from '../components/Toast.js';
import '../styles/courses.css';
import '../styles/myclass.css';
import '../styles/helper.css';
import '../styles/community.css';
import '../styles/community-post.css';

const configured = isServerConfigured();
const route = getCommunityRoute(window.location.search);
const openCourses = COURSES.filter((course) => course.status === 'open');
const body = el('div', { className: 'community-body' });
const view = { user: undefined, isAdmin: false, status: 'loading', posts: [], post: null, comments: [], error: null, busy: false, draft: null };
const report = createReport({ postId: route.id, rerender: () => render() });
const go = (search) => window.location.assign(`community.html${search}`);

async function handleLogin() {
  rememberReturn(window.location.search);
  try {
    await signInWithKakao('community.html');
  } catch {
    showToast('카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
}

async function loadData() {
  view.status = 'loading';
  render();
  try {
    if (route.name === 'list') view.posts = normalizePosts(await Api.fetchPosts(route.category));
    if (route.name === 'post' || route.name === 'edit') view.post = normalizePost(await Api.fetchPost(route.id));
    if (route.name === 'post' && view.post) view.comments = normalizeComments(await Api.fetchComments(route.id));
    if (view.post) document.title = `${view.post.title} | 커뮤니티 | 한클래스`;
    view.status = 'ready';
  } catch {
    view.status = 'error';
  }
  render();
  loadReport();
}

// 신고 여부 — 글 보기에서 로그인했고 남의 글일 때만 확인한다
const loadReport = () => report.load(route.name === 'post' && Boolean(view.user) && Boolean(view.post) && !canManage(view.post, view.user));

// 입력 문제 안내 + 그 칸으로 이동. field: 안내 문구용 칸 이름 (댓글 본문은 comment)
function showProblem(problem, field = problem.field) {
  Object.assign(view, { error: problemText({ ...problem, field }), busy: false });
  render();
  body.querySelector(`[name="${problem.field}"]`)?.focus();
}

async function handlePostSubmit(event) {
  event.preventDefault();
  view.draft = Object.fromEntries(new FormData(event.currentTarget));
  const checked = validatePost(view.draft, openCourses);
  if (!checked.ok) return showProblem(checked);
  Object.assign(view, { busy: true, error: null });
  render();
  try {
    const id = route.name === 'edit' ? (await Api.updatePost(route.id, checked.fields), route.id) : await Api.createPost(checked.fields);
    rememberName(checked.fields.author_name);
    go(`?post=${id}`);
  } catch (error) {
    Object.assign(view, { busy: false, error: guardText(serverProblem(error), 'post') });
    render();
  }
}

async function handlePostDelete() {
  if (!window.confirm('이 글을 지울까요? 달린 댓글도 함께 지워져요.')) return;
  try {
    await Api.deletePost(view.post.id);
    go('');
  } catch (error) {
    showToast(guardText(serverProblem(error), 'post'));
  }
}

async function handleCommentSubmit(event) {
  event.preventDefault();
  view.draft = Object.fromEntries(new FormData(event.currentTarget));
  const checked = validateComment(view.draft);
  if (!checked.ok) return showProblem(checked, checked.field === 'body' ? 'comment' : checked.field);
  Object.assign(view, { busy: true, error: null });
  render();
  try {
    await Api.createComment(route.id, checked.fields);
    rememberName(checked.fields.author_name);
    view.comments = normalizeComments(await Api.fetchComments(route.id));
    Object.assign(view, { draft: null, busy: false });
    showToast('댓글을 올렸어요');
  } catch (error) {
    Object.assign(view, { busy: false, error: guardText(serverProblem(error), 'comment') });
  }
  render();
}

async function handleCommentDelete(id) {
  if (!window.confirm('이 댓글을 지울까요?')) return;
  try {
    await Api.deleteComment(id);
    view.comments = normalizeComments(await Api.fetchComments(route.id));
    showToast('댓글을 지웠어요');
  } catch (error) {
    showToast(guardText(serverProblem(error), 'comment'));
  }
  render();
}

const ListScreen = () => Parts.ListScreen({ user: view.user, posts: view.posts, category: route.category, courses: COURSES, onLogin: handleLogin });

function PostScreen() {
  if (!view.post) return [Parts.NotFoundPanel()];
  const owner = canManage(view.post, view.user);
  return [
    Parts.BackLink(),
    Parts.PostView(view.post, { courses: COURSES, owner, onDelete: handlePostDelete, notice: owner && view.post.hidden ? HiddenNotice() : null, reportNode: report.Area({ user: view.user, post: view.post }) }),
    CommentSection({
      comments: view.comments, user: view.user, canWrite: canComment(view.post, view.user, view.isAdmin), authorName: savedName(), draft: view.draft?.body ?? '', error: view.error, busy: view.busy,
      onSubmit: handleCommentSubmit, onDelete: handleCommentDelete,
      loginNode: view.user === null ? Parts.LoginPrompt(handleLogin, '댓글을 쓰려면 로그인해 주세요') : null,
    }),
  ];
}

function FormScreen() {
  if (view.user === undefined) return [Parts.LoadingPanel()];
  if (!view.user) return [Parts.BackLink(), Parts.LoginPrompt(handleLogin)];
  if (route.name === 'edit' && !view.post) return [Parts.NotFoundPanel()];
  if (route.name === 'edit' && !canManage(view.post, view.user)) return [Parts.BackLink(), el('p', { className: 'helper-notice', role: 'alert', text: '본인 글만 수정할 수 있어요.' })];
  return [
    Parts.BackLink(),
    PostForm({ post: route.name === 'edit' ? view.post : null, values: view.draft, courses: openCourses, authorName: savedName(), error: view.error, busy: view.busy, onSubmit: handlePostSubmit }),
  ];
}

const SCREENS = { list: ListScreen, post: PostScreen, write: FormScreen, edit: FormScreen };
const PANELS = { unavailable: () => [Parts.UnavailablePanel()], loading: () => [Parts.LoadingPanel()], error: () => [Parts.ErrorPanel(loadData)] };

function render() {
  const state = getCommunityState({ configured, status: view.status });
  body.setAttribute('aria-busy', String(state === 'loading'));
  body.replaceChildren(...(state === 'ready' ? SCREENS[route.name]() : PANELS[state]()).filter(Boolean));
}

function setUser(user) {
  if ((user?.id ?? null) === (view.user?.id ?? null) && view.user !== undefined) return;
  view.user = user;
  view.isAdmin = false;
  render();
  loadReport();
  // 운영자면 질문 글에도 답변 폼을 연다 (확인 실패 시 일반 회원으로 둔다. 실제 권한은 DB가 확인)
  if (user) fetchAdminRole().then((role) => { view.isAdmin = Boolean(role); render(); }).catch(() => {});
}

async function init() {
  try {
    setUser(await getCurrentUser());
    await onAuthChange(setUser);
  } catch {
    setUser(null); // 로그인 확인이 안 돼도 읽기는 할 수 있다
  }
  const back = takeReturn(); // 로그인하고 돌아왔으면 로그인 전에 보던 화면(글쓰기 등)으로
  if (view.user && back && back !== window.location.search) go(back);
}

renderPage({ active: 'community', title: '커뮤니티', content: [body] });

if (configured) {
  init();
  if (route.name === 'write') { view.status = 'ready'; render(); } else loadData();
} else {
  view.status = 'ready';
  render();
}

// 내 강의실 — myclass.html. 카카오 로그인 후 서버에 저장된 데모 수강 신청 기록을 보여 준다 (SPEC.md 5절)
// 서버 연결 전에는 '준비 중' 안내와 이 브라우저의 데모 주문만 보여 준다
import { el } from '../lib/dom.js';
import { isServerConfigured } from '../lib/server.js';
import { getCurrentUser, onAuthChange, signInWithKakao, signOut } from '../lib/account.js';
import { fetchMyEnrollments, fetchMyOutcomes } from '../lib/enrollmentApi.js';
import { fetchAdminRole } from '../lib/adminApi.js';
import { getClassroomState, normalizeEnrollments, normalizeOutcomeRows, toPurchaseRecords } from '../lib/myClassroom.js';
import { readCartState, setAccountRecords } from '../lib/cartStore.js';
import { COURSES } from '../data/courses/index.js';
import { renderPage } from '../components/PageLayout.js';
import * as Parts from '../components/MyClassParts.js';
import { CourseMaterials } from '../components/CourseMaterials.js';
import { RewardsPanel } from '../components/RewardsPanel.js';
import { isRewardsMock } from '../lib/rewardsApi.js';
import { showToast } from '../components/Toast.js';
import '../styles/courses.css';
import '../styles/cart-page.css';
import '../styles/myclass.css';
import '../styles/materials.css';
import '../styles/rewards.css';

const configured = isServerConfigured();
const body = el('div', { className: 'myclass-body' });
// user: undefined(확인 중) | null | 사용자. 로그아웃하면 기록을 바로 비워 이전 사용자 정보가 남지 않게 한다
// isAdmin: 운영자면 계정 줄에 [운영자 페이지] (확인 실패·운영자 SQL 적용 전이면 false)
// materials: 신청한 강의의 자료 목록 조각 — 불러올 때 한 번 만들어 다시 그려도 유지한다
// rewards: 출석 포인트·등급 조각 — 로그인한 사용자마다 한 번 만든다 (개발용 ?rewards_mock=1이면 로그아웃이어도 가짜 값으로 보임)
const view = { user: undefined, status: 'loading', enrollments: [], outcomes: [], isAdmin: false, materials: null, rewards: null };
let requestId = 0;

function browserOrderCourses() {
  return readCartState().purchases.map((record) => COURSES.find((course) => course.id === record.courseId)).filter(Boolean);
}

async function handleLogin() {
  try {
    await signInWithKakao(); // 카카오 화면으로 이동한다
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
  showToast('로그아웃했어요');
}

async function loadEnrollments() {
  const id = ++requestId; // 늦게 도착한 이전 응답(다른 사용자·이전 요청)은 버린다
  Object.assign(view, { status: 'loading', enrollments: [], outcomes: [] });
  render();
  try {
    const [rows, outcomeRows, role] = await Promise.all([fetchMyEnrollments(), fetchMyOutcomes(), fetchAdminRole().catch(() => null)]);
    if (id !== requestId) return;
    const enrollments = normalizeEnrollments(rows, COURSES);
    const outcomes = normalizeOutcomeRows(outcomeRows, COURSES);
    const materials = enrollments.length ? CourseMaterials({ courses: enrollments.map((item) => item.course), title: '내 강의 자료', variant: 'myclass' }) : null;
    Object.assign(view, { status: 'ready', enrollments, outcomes, isAdmin: Boolean(role), materials });
    setAccountRecords({ purchases: toPurchaseRecords(enrollments), outcomes }); // 다른 화면도 같은 계정 기준으로
  } catch {
    if (id !== requestId) return;
    view.status = 'error';
  }
  render();
}

function setUser(user) {
  requestId += 1;
  Object.assign(view, { user, enrollments: [], outcomes: [], isAdmin: false, materials: null, status: user ? 'loading' : 'ready' });
  view.rewards = user || isRewardsMock() ? RewardsPanel() : null;
  setAccountRecords();
  if (user) loadEnrollments();
  else render();
}

async function init() {
  Object.assign(view, { user: undefined, status: 'loading' });
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

function handleRetry() {
  if (view.user) loadEnrollments();
  else init();
}

const PANELS = {
  unavailable: () => [Parts.UnavailablePanel(), Parts.BrowserOrders(browserOrderCourses())],
  'signed-out': () => [Parts.SignedOutPanel(handleLogin), view.rewards, Parts.BrowserOrders(browserOrderCourses())],
  loading: () => [Parts.LoadingPanel()],
  error: () => [Parts.ErrorPanel(handleRetry)],
  empty: () => [Parts.AccountBar(handleLogout, view.isAdmin), view.rewards, Parts.EmptyPanel()],
  list: () => [Parts.AccountBar(handleLogout, view.isAdmin), view.rewards, Parts.EnrollmentList(view.enrollments, view.outcomes), view.materials],
};

function render() {
  const state = getClassroomState({ configured, ...view });
  body.setAttribute('aria-busy', String(state === 'loading'));
  body.replaceChildren(...PANELS[state]().filter(Boolean));
}

renderPage({
  active: 'myclass',
  title: '내 강의실',
  syncAccount: false,
  content: [
    el('h1', { className: 'page-title', text: '내 강의실' }),
    el('p', { className: 'page-desc text-muted', text: Parts.DEMO_ENROLL_NOTE }),
    body,
  ],
});

if (configured) init();
else render();

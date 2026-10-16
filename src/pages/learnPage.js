// 수강 화면 — learn.html?id=c002. 구매 전이면 맛보기만, 구매 후 모든 차시와 결과물 완성 체크 (SPEC.md 5절)
// 영상·실습 파일은 준비 중. 유료 본문은 서버 권한 검증 전까지 사이트에 올리지 않는다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { readParam } from '../lib/paths.js';
import { findCourse } from '../lib/courseQuery.js';
import { getLearnView } from '../lib/learn.js';
import { CART_CHANGE_EVENT, readOwnedState, readOutcomes, resetDemo, toggleCourseOutcome } from '../lib/cartStore.js';
import { getAccountSyncStatus, syncAccountEnrollments } from '../lib/accountSync.js';
import { COURSES } from '../data/courses/index.js';
import { renderPage } from '../components/PageLayout.js';
import { DemoReset, LearnStatus, LessonList, OutcomeCheck } from '../components/LearnParts.js';
import { showToast } from '../components/Toast.js';
import '../styles/courses.css';
import '../styles/detail.css';
import '../styles/purchase.css'; // .button--done (완성 체크됨)
import '../styles/learn-page.css';

const course = findCourse(COURSES, readParam('id'));
const body = el('div', { className: 'learn-body' });

function BackLink() {
  const href = course ? `course.html?id=${course.id}` : 'courses.html';
  return el('a', { href, className: 'back-link' }, [icon('back', 18), el('span', { text: course ? '강의 상세' : '강의 목록' })]);
}

function NotFound() {
  return el('div', { className: 'empty-state' }, [
    el('strong', { text: '강의를 찾을 수 없어요' }),
    el('p', { className: 'text-muted', text: '주소가 바뀌었거나 아직 없는 강의예요.' }),
    el('a', { href: 'courses.html', className: 'button button--primary', text: '강의 목록 보기' }),
  ]);
}

// 계정에 신청한 강의는 서버에 저장하므로 기다리는 동안 버튼을 막는다
async function handleOutcomeToggle(event) {
  event.currentTarget.disabled = true;
  try {
    await toggleCourseOutcome(course); // 저장 후 CART_CHANGE_EVENT로 다시 그려진다
    showToast(readOutcomes().includes(course.id) ? '결과물 완성을 체크했어요' : '완성 체크를 취소했어요');
  } catch {
    render(); // 버튼을 다시 살린다 (상태는 바뀌지 않음)
    showToast('완성 체크를 저장하지 못했어요. 다시 눌러 주세요.');
  }
  body.querySelector('.outcome-toggle')?.focus();
}

function handleReset() {
  resetDemo(); // 다시 그려지므로 초기화 버튼에 초점을 되돌린다
  body.querySelector('.demo-reset__button')?.focus();
  showToast('데모 기록을 모두 지웠어요');
}

// 계정 기록을 못 읽었을 때 — 이 브라우저 기록으로 보여 주고 다시 시도 안내
function AccountSyncNote() {
  if (getAccountSyncStatus() !== 'error') return null;
  return el('p', { className: 'learn-sync-error', role: 'alert' }, [
    el('span', { text: '계정의 수강 기록을 불러오지 못해 이 브라우저 기록만 보여 줘요. ' }),
    el('button', { type: 'button', className: 'button button--ghost', onClick: syncAccountEnrollments, text: '다시 시도' }),
  ]);
}

function render() {
  const view = getLearnView(course, readOwnedState().purchases, readOutcomes());
  body.replaceChildren(
    ...[AccountSyncNote()].filter(Boolean),
    LearnStatus(course, view),
    LessonList(view),
    OutcomeCheck(course, view, handleOutcomeToggle),
    DemoReset(handleReset),
  );
}

renderPage({
  pageType: 'learn',
  title: course ? `수강하기 · ${course.title}` : '강의를 찾을 수 없어요',
  content: [
    BackLink(),
    course ? el('h1', { className: 'page-title', text: course.title }) : null,
    course ? body : NotFound(),
  ],
});

if (course) {
  render();
  window.addEventListener(CART_CHANGE_EVENT, render);
}

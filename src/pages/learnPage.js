// 수강 화면 — learn.html?id=c002. 구매 전이면 맛보기만, 구매 후 모든 차시와 결과물 완성 체크 (SPEC.md 5절)
// 영상·실습 파일은 준비 중. 유료 본문은 서버 권한 검증 전까지 사이트에 올리지 않는다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { readParam } from '../lib/paths.js';
import { findCourse } from '../lib/courseQuery.js';
import { getLearnView } from '../lib/learn.js';
import { CART_CHANGE_EVENT, readCartState, readOutcomes, resetDemo, toggleCourseOutcome } from '../lib/cartStore.js';
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

function handleOutcomeToggle() {
  toggleCourseOutcome(course); // 저장 후 CART_CHANGE_EVENT로 다시 그려진다
  body.querySelector('.outcome-toggle')?.focus();
  showToast(readOutcomes().includes(course.id) ? '결과물 완성을 체크했어요' : '완성 체크를 취소했어요');
}

function handleReset() {
  resetDemo(); // 다시 그려지므로 초기화 버튼에 초점을 되돌린다
  body.querySelector('.demo-reset__button')?.focus();
  showToast('데모 기록을 모두 지웠어요');
}

function render() {
  const view = getLearnView(course, readCartState().purchases, readOutcomes());
  body.replaceChildren(
    LearnStatus(course, view),
    LessonList(view),
    OutcomeCheck(course, view, handleOutcomeToggle),
    DemoReset(handleReset),
  );
}

renderPage({
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

// 강의 상세 — course.html?id=c001. 모든 강의가 같은 틀을 쓰고 내용은 데이터에서 온다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { readParam } from '../lib/paths.js';
import { findCourse } from '../lib/courseQuery.js';
import { COURSES } from '../data/courses/index.js';
import { CATEGORIES } from '../data/categories.js';
import { renderPage } from '../components/PageLayout.js';
import { DetailBody, DetailHero } from '../components/CourseDetail.js';
import { PurchaseBox } from '../components/PurchaseBox.js';
import { ReportExample } from '../components/ReportExample.js';
import '../styles/learning.css';
import '../styles/courses.css';
import '../styles/detail.css';
import '../styles/purchase.css';

const course = findCourse(COURSES, readParam('id'));

function BackLink() {
  return el('a', { href: 'courses.html', className: 'back-link' }, [icon('back', 18), el('span', { text: '강의 목록' })]);
}

function NotFound() {
  return el('div', { className: 'empty-state' }, [
    el('strong', { text: '강의를 찾을 수 없어요' }),
    el('p', { className: 'text-muted', text: '주소가 바뀌었거나 아직 없는 강의예요.' }),
    el('a', { href: 'courses.html', className: 'button button--primary', text: '강의 목록 보기' }),
  ]);
}

if (course) {
  renderPage({
    active: 'courses',
    title: course.title,
    content: [
      BackLink(),
      DetailHero(course, CATEGORIES),
      ...(course.id === 'c003' ? [ReportExample({ compact: true })] : []),
      el('div', { className: 'detail-layout' }, [DetailBody(course), el('aside', {}, [PurchaseBox(course)])]),
    ],
    bottomBar: PurchaseBox(course, { compact: true }),
  });
} else {
  renderPage({ active: 'courses', title: '강의를 찾을 수 없어요', content: [BackLink(), NotFound()] });
}

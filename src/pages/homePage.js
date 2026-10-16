// 메인 페이지 — 윗부분만 A/B로 다르고(HomeHero.js), 아래 공통 구역은 두 안이 같다
// 공통: 검색 → 강의 → 분야 → 추천 학습 순서 → 광고 보고서 → 한클래스의 약속 → 준비 중인 기능
// A/B 기준: planning/home-ab-v2 지시서. 1단계는 ?ab_preview=A/B 시연만, 기본은 B
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { pageUrl } from '../lib/paths.js';
import { sortByCategory } from '../lib/courseQuery.js';
import { COURSES } from '../data/courses/index.js';
import { CATEGORIES } from '../data/categories.js';
import { renderPage } from '../components/PageLayout.js';
import { CourseGrid } from '../components/CourseCard.js';
import { SearchForm } from '../components/SearchForm.js';
import { LearningPath } from '../components/LearningPath.js';
import { ReportExample } from '../components/ReportExample.js';
import '../styles/learning.css';
import { SoonBadge } from '../components/ComingSoon.js';
import { track } from '../lib/analytics.js';
import { HOME_EXPERIMENT_ACTIVE, markPreviewSession, resolveHomeVariant } from '../lib/homeExperiment.js';
import { browserStorage, createExposureWatcher, markClassesView, recordExposure, setPendingCourse } from '../lib/experimentTracking.js';
import { DiscoveryHead, HeroA, IntroB, PreviewBar } from '../components/HomeHero.js';
import '../styles/home.css'; // 공통 CSS(PageLayout) 다음에 불러와야 덮어쓰기 순서가 맞다
import '../styles/home-ab.css';
import '../styles/home-hero.css';

function CategoryGrid() {
  return el('section', { className: 'section' }, [
    el('div', { className: 'section__head' }, [el('h2', { className: 'section__title', text: '분야별로 찾기' })]),
    el(
      'ul',
      { className: 'category-grid' },
      CATEGORIES.map((category) =>
        el('li', {}, [
          el('a', { href: pageUrl('courses.html', { category: category.id }), className: 'category-tile' }, [
            el('span', { className: 'category-tile__icon' }, [icon(category.id)]),
            el('strong', { className: 'category-tile__name', text: category.name }),
            el('span', { className: 'category-tile__desc', text: category.description }),
          ]),
        ]),
      ),
    ),
  ]);
}

// id=classes: A·B의 [강의 둘러보기]가 이곳으로 이동한다
function CourseSection() {
  return el('section', { className: 'section home-courses', id: 'classes' }, [
    el('div', { className: 'section__head' }, [
      el('h2', { className: 'section__title', text: '지금 준비 중인 강의' }),
      el('a', { href: 'courses.html', className: 'section__more', text: '전체 보기' }),
    ]),
    CourseGrid(sortByCategory(COURSES, CATEGORIES), CATEGORIES),
  ]);
}

// 무료 교육과 다른 점 세 가지 (CLAUDE.md 핵심 원칙)
const PROMISES = [
  { iconName: 'check', title: '한 강 = 결과물 1개', text: '강의 하나를 마치면 바로 쓸 수 있는 표·문서 한 장이 남아요.' },
  { iconName: 'cart', title: '1,000원부터 한 강씩', text: '구독 없이 필요한 강의만 골라 살 수 있어요.' },
  { iconName: 'docs', title: '실습 자료 함께 제공', text: '양식과 가상 예시 자료로 바로 따라 할 수 있어요.' },
];

function Promises() {
  return el('section', { className: 'section' }, [
    el('div', { className: 'section__head' }, [el('h2', { className: 'section__title', text: '한클래스는 이렇게 배워요' })]),
    el(
      'ul',
      { className: 'promise-list' },
      PROMISES.map((item) =>
        el('li', { className: 'promise' }, [
          el('span', { className: 'promise__icon' }, [icon(item.iconName)]),
          el('strong', { className: 'promise__title', text: item.title }),
          el('p', { className: 'promise__text', text: item.text }),
        ]),
      ),
    ),
  ]);
}

// 아직 만들지 않은 기능 — 후속 작업 목록(CLAUDE.md)과 같은 내용
const UPCOMING = [
  { iconName: 'wand', title: '서류 도우미', text: '직무·기업·질문·경험을 넣으면 자소서용 요청문을 만들어 드려요.' },
  { iconName: 'book', title: '내 강의실', text: '카카오 로그인 후 데모 수강 신청한 강의를 계정에 모아 봐요. 서버 연결을 준비하고 있어요.' },
  { iconName: 'chat', title: '커뮤니티', text: '만든 결과물을 나누고 질문할 수 있어요.' },
];

function Upcoming() {
  return el('section', { className: 'section' }, [
    el('div', { className: 'section__head' }, [el('h2', { className: 'section__title', text: '준비 중인 기능' })]),
    el(
      'ul',
      { className: 'upcoming-list' },
      UPCOMING.map((item) =>
        el('li', { className: 'upcoming' }, [
          el('span', { className: 'upcoming__icon' }, [icon(item.iconName)]),
          el('div', {}, [
            el('div', { className: 'upcoming__head' }, [el('strong', { text: item.title }), SoonBadge()]),
            el('p', { className: 'upcoming__text', text: item.text }),
          ]),
        ]),
      ),
    ),
  ]);
}

// 첫 화면을 그리기 전에 A/B를 정한다 (시연 > 실험 배정 > 기본 B)
// 시연(?ab_preview)이면 이 탭을 시연 중으로 표시 → 상세로 이동해도 GA4를 켜지 않는다 (renderPage보다 먼저)
const session = browserStorage('sessionStorage');
const assignment = resolveHomeVariant(window.location.search, {
  active: HOME_EXPERIMENT_ACTIVE, local: browserStorage('localStorage'), session,
});
const { variant, mode } = assignment;
if (mode === 'preview') markPreviewSession();
document.body.dataset.homeVariant = variant;

renderPage({
  active: 'home',
  // 헤더 바로 아래 꽉 찬 영역: 시연 띠(시연일 때만) + A의 큰 이미지
  lead: el('div', { className: 'home-lead' }, [mode === 'preview' ? PreviewBar(variant) : null, variant === 'A' ? HeroA() : null]),
  content: [
    ...(variant === 'A' ? [DiscoveryHead()] : [IntroB()]),
    el('div', { className: 'home-search' }, [SearchForm()]),
    CourseSection(),
    CategoryGrid(),
    LearningPath(),
    ReportExample(),
    Promises(),
    Upcoming(),
  ],
});

track('view_item_list', { item_list_id: 'home', result_count: document.querySelectorAll('.course-card').length });

// ── 실험 측정 (측정 대상일 때만: 실험 켬 + 배정 저장 성공 + 시연 아님) ──
// 메인 노출: 화면이 1초 연속 보이면 탭당 1회
function handleExposure() {
  const params = recordExposure(session, assignment);
  if (!params) return;
  track('experiment_home_exposure', params);
  watchClassesSection();
}

// 보조 지표: 강의 구역이 화면에 나타나면 탭당 1회
function watchClassesSection() {
  const target = document.querySelector('#classes');
  if (!target || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    const params = markClassesView(session);
    if (params) track('experiment_classes_view', params);
  });
  observer.observe(target);
}

// 상세로 가는 링크를 누르면 어느 강의·어느 경로인지 적어 둔다 → 상세 페이지에서 첫 도달 1회 기록
function handleCourseLinkClick(event) {
  const link = event.target.closest('a[data-course-id]');
  if (!link) return;
  const source = link.dataset.placement === 'learning-path' ? 'home_path' : 'home_card';
  setPendingCourse(session, { courseId: link.dataset.courseId, source });
}

if (assignment.measured) {
  createExposureWatcher({ onExpose: handleExposure });
  document.addEventListener('click', handleCourseLinkClick, true);
}

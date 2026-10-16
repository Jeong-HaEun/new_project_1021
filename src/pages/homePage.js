// 메인 페이지 — 소개 배너 → 검색 → 분야 → 강의 → 한클래스의 약속 → 준비 중인 기능
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { pageUrl } from '../lib/paths.js';
import { SITE_DESCRIPTION, SITE_TAGLINE } from '../lib/site.js';
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
import '../styles/home.css'; // 공통 CSS(PageLayout) 다음에 불러와야 덮어쓰기 순서가 맞다

function Hero() {
  return el('section', { className: 'hero' }, [
    el('p', { className: 'hero__eyebrow', text: '마케터를 꿈꾸는 실무 초보에게' }),
    el('h1', { className: 'hero__title', text: SITE_TAGLINE }),
    el('p', { className: 'hero__desc', text: SITE_DESCRIPTION }),
    el('a', { href: 'courses.html', className: 'button hero__button', text: '강의 둘러보기' }),
  ]);
}

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

function CourseSection() {
  return el('section', { className: 'section' }, [
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

renderPage({
  active: 'home',
  content: [
    Hero(),
    el('div', { className: 'home-search' }, [SearchForm()]),
    LearningPath(),
    CategoryGrid(),
    CourseSection(),
    ReportExample(),
    Promises(),
    Upcoming(),
  ],
});

track('view_item_list', { item_list_id: 'home', result_count: document.querySelectorAll('.course-card').length });

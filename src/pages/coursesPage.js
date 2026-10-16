// 강의 목록 — 검색어·분야로 거르고, 조건은 주소에도 남긴다 (SPEC.md 3·4절)
import { el } from '../lib/dom.js';
import { pageUrl, readParam } from '../lib/paths.js';
import { filterCourses, normalizeCategory, sortByCategory } from '../lib/courseQuery.js';
import { COURSES } from '../data/courses/index.js';
import { CATEGORIES } from '../data/categories.js';
import { renderPage } from '../components/PageLayout.js';
import { CourseGrid } from '../components/CourseCard.js';
import { SearchForm } from '../components/SearchForm.js';
import '../styles/courses.css';

// 화면 상태 — 주소에서 처음 값을 읽는다
const state = {
  category: normalizeCategory(readParam('category'), CATEGORIES),
  query: readParam('q') ?? '',
};

const ALL_TABS = [{ id: 'all', name: '전체' }, ...CATEGORIES];
const chipList = el('div', { className: 'chip-row', role: 'group', 'aria-label': '분야 선택' });
const resultCount = el('p', { className: 'result-count', 'aria-live': 'polite' });
const results = el('div', { className: 'results' });

function handleCategoryClick(categoryId) {
  state.category = categoryId;
  update();
}

function handleSearch(query) {
  state.query = query;
  update();
}

function handleReset() {
  state.category = 'all';
  state.query = '';
  searchInput.value = '';
  update();
}

function renderChips() {
  chipList.replaceChildren(
    ...ALL_TABS.map((tab) =>
      el('button', {
        type: 'button',
        className: 'chip',
        text: tab.name,
        'aria-pressed': String(state.category === tab.id),
        onClick: () => handleCategoryClick(tab.id),
      }),
    ),
  );
}

function EmptyState() {
  return el('div', { className: 'empty-state' }, [
    el('strong', { text: '찾는 강의가 아직 없어요' }),
    el('p', { className: 'text-muted', text: '다른 검색어를 넣거나 전체 강의를 둘러보세요.' }),
    el('button', { type: 'button', className: 'button button--ghost', text: '전체 보기', onClick: handleReset }),
  ]);
}

// 상태가 바뀔 때마다: 칩·결과 다시 그리기 + 주소 갱신(새로고침·공유해도 같은 결과)
function update() {
  const list = sortByCategory(filterCourses(COURSES, CATEGORIES, state), CATEGORIES);
  renderChips();
  resultCount.textContent = `강의 ${list.length}개`;
  results.replaceChildren(CourseGrid(list, CATEGORIES, EmptyState()));
  history.replaceState(null, '', pageUrl('courses.html', { category: state.category, q: state.query.trim() }));
}

const searchForm = SearchForm({ value: state.query, onSearch: handleSearch });
const searchInput = searchForm.querySelector('input');

renderPage({
  active: 'courses',
  title: '강의 찾기',
  content: [
    el('h1', { className: 'page-title', text: '강의 찾기' }),
    el('p', { className: 'page-desc text-muted', text: '필요한 실무만 한 강씩 골라 보세요.' }),
    searchForm,
    chipList,
    resultCount,
    results,
  ],
});

update();

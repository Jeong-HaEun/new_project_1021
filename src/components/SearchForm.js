// 검색창 — 기본은 courses.html?q=… 로 이동하는 일반 폼.
// 목록 페이지에서는 onSearch를 넘겨 페이지 이동 없이 바로 거른다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { track } from '../lib/analytics.js';

export function SearchForm({ value = '', onSearch = null } = {}) {
  const input = el('input', {
    type: 'search',
    name: 'q',
    className: 'search-form__input',
    placeholder: '엑셀, 보고서처럼 검색해 보세요',
    'aria-label': '강의 검색',
    autocomplete: 'off',
  });
  input.value = value;

  // 제출할 때만 기록한다 (입력마다 기록하지 않음). 검색어 원문은 보내지 않고 길이만
  function handleSubmit(event) {
    track('course_search', { query_length: input.value.trim().length });
    if (!onSearch) return; // 일반 폼 제출 → 목록 페이지로 이동
    event.preventDefault();
    onSearch(input.value);
  }

  function handleInput() {
    if (onSearch) onSearch(input.value);
  }

  input.addEventListener('input', handleInput);

  return el('form', { className: 'search-form', action: 'courses.html', method: 'get', role: 'search', 'data-analytics': 'course-search', onSubmit: handleSubmit }, [
    icon('search', 20),
    input,
    el('button', { type: 'submit', className: 'button button--primary search-form__button', text: '검색' }),
  ]);
}

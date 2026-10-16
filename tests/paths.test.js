import { describe, it, expect } from 'vitest';
import { pageUrl } from '../src/lib/paths.js';

describe('pageUrl', () => {
  it('조건이 없으면 페이지 이름만', () => {
    expect(pageUrl('courses.html')).toBe('courses.html');
  });

  it('빈 값과 all은 주소에서 뺀다', () => {
    expect(pageUrl('courses.html', { category: 'all', q: '' })).toBe('courses.html');
  });

  it('한글 검색어는 주소용으로 바꾼다', () => {
    expect(pageUrl('courses.html', { category: 'excel', q: '표 합치기' })).toBe(
      'courses.html?category=excel&q=%ED%91%9C+%ED%95%A9%EC%B9%98%EA%B8%B0',
    );
  });
});

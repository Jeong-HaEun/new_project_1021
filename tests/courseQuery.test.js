// 검색·분야 필터 로직 — SPEC.md 3·4절 기준
import { describe, it, expect } from 'vitest';
import {
  filterCourses,
  findCourse,
  getCategoryName,
  normalizeCategory,
  sortByCategory,
  totalMinutes,
} from '../src/lib/courseQuery.js';

const categories = [
  { id: 'excel', name: '엑셀' },
  { id: 'docs', name: '서류 가이드' },
];

const courses = [
  { id: 'c1', category: 'docs', title: '공고 분석', summary: '자소서 점검', outcome: '매칭표', tags: ['취업'] },
  { id: 'c2', category: 'excel', title: 'XLOOKUP 표 합치기', summary: '함수', outcome: '완성 파일', tags: ['엑셀'] },
  { id: 'c3', category: 'excel', title: '피벗 정리', summary: '요약 보고서', outcome: '보고서', tags: ['엑셀'] },
];

describe('filterCourses', () => {
  it('조건이 없으면 전체를 돌려준다', () => {
    expect(filterCourses(courses, categories, {})).toHaveLength(3);
  });

  it('분야로 거른다', () => {
    expect(filterCourses(courses, categories, { category: 'excel' }).map((c) => c.id)).toEqual(['c2', 'c3']);
  });

  it('제목·설명·결과물·태그·분야 이름에서 찾는다', () => {
    expect(filterCourses(courses, categories, { query: 'xlookup' }).map((c) => c.id)).toEqual(['c2']);
    expect(filterCourses(courses, categories, { query: '매칭표' }).map((c) => c.id)).toEqual(['c1']);
    expect(filterCourses(courses, categories, { query: '서류' }).map((c) => c.id)).toEqual(['c1']);
  });

  it('앞뒤 공백을 무시하고 여러 단어는 모두 포함해야 한다', () => {
    expect(filterCourses(courses, categories, { query: '  엑셀   보고서 ' }).map((c) => c.id)).toEqual(['c3']);
  });

  it('분야와 검색어를 함께 적용한다', () => {
    expect(filterCourses(courses, categories, { category: 'docs', query: '엑셀' })).toEqual([]);
  });
});

describe('normalizeCategory', () => {
  it('모르는 분야나 빈 값은 all', () => {
    expect(normalizeCategory('excel', categories)).toBe('excel');
    expect(normalizeCategory('unknown', categories)).toBe('all');
    expect(normalizeCategory(null, categories)).toBe('all');
  });
});

describe('도우미', () => {
  it('findCourse: 없는 id는 null', () => {
    expect(findCourse(courses, 'c2').id).toBe('c2');
    expect(findCourse(courses, 'nope')).toBeNull();
    expect(findCourse(courses, null)).toBeNull();
  });

  it('getCategoryName: 분야 이름, 없으면 빈 문자열', () => {
    expect(getCategoryName('docs', categories)).toBe('서류 가이드');
    expect(getCategoryName('nope', categories)).toBe('');
  });

  it('totalMinutes: 차시 시간의 합', () => {
    expect(totalMinutes({ lessons: [{ minutes: 3 }, { minutes: 4 }] })).toBe(7);
  });

  it('sortByCategory: 분야 순서대로, 같은 분야는 원래 순서', () => {
    expect(sortByCategory(courses, categories).map((c) => c.id)).toEqual(['c2', 'c3', 'c1']);
  });
});

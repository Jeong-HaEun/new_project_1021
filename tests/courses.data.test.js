// 강의 데이터 규칙 검사 — CLAUDE.md·SPEC.md 2절의 규칙을 자동으로 확인한다
import { describe, it, expect } from 'vitest';
import { COURSES } from '../src/data/courses/index.js';
import { CATEGORIES } from '../src/data/categories.js';
import { PRICE_MIN, PRICE_MAX } from '../src/data/policy.js';

const categoryIds = CATEGORIES.map((category) => category.id);
const nonEmptyList = (list) => Array.isArray(list) && list.length > 0 && list.every((item) => item.trim());

describe('강의 데이터', () => {
  it('분야마다 강의가 1개 이상 있다', () => {
    categoryIds.forEach((id) => {
      expect(COURSES.some((course) => course.category === id), id).toBe(true);
    });
  });

  it('id와 slug가 겹치지 않고 형식이 맞다', () => {
    const ids = COURSES.map((course) => course.id);
    const slugs = COURSES.map((course) => course.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    ids.forEach((id) => expect(id).toMatch(/^c\d{3}$/));
    slugs.forEach((slug) => expect(slug).toMatch(/^[a-z0-9-]+$/));
  });

  describe.each(COURSES)('$id $title', (course) => {
    it('분야·상태가 정해진 값이다', () => {
      expect(categoryIds).toContain(course.category);
      expect(['planned', 'open']).toContain(course.status);
    });

    it(`가격은 ${PRICE_MIN}~${PRICE_MAX}원 사이 정수다`, () => {
      expect(Number.isInteger(course.price)).toBe(true);
      expect(course.price).toBeGreaterThanOrEqual(PRICE_MIN);
      expect(course.price).toBeLessThanOrEqual(PRICE_MAX);
    });

    it('필수 문구가 비어 있지 않다 (결과물·환불 규정 등)', () => {
      ['title', 'summary', 'outcome', 'extraCost', 'accessPeriod', 'refundPolicy', 'instructorId', 'thumbnail'].forEach(
        (key) => expect(course[key]?.trim(), key).toBeTruthy(),
      );
    });

    it('학습 목표·추천 대상·준비물·태그가 1개 이상이다', () => {
      ['learn', 'target', 'materials', 'tags'].forEach((key) => expect(nonEmptyList(course[key]), key).toBe(true));
    });

    it('차시가 있고 맛보기 차시가 1개 이상이다', () => {
      expect(course.lessons.length).toBeGreaterThan(0);
      expect(course.lessons.some((lesson) => lesson.isPreview)).toBe(true);
      course.lessons.forEach((lesson) => {
        expect(lesson.title.trim()).toBeTruthy();
        expect(Number.isInteger(lesson.minutes) && lesson.minutes > 0).toBe(true);
      });
    });
  });
});

// 강좌 데이터 검토 — 명료하면 green, 애매하면 yellow, 맞지 않으면 red
// red는 바로 고쳐야 하는 문제(테스트 실패), yellow는 사람이 판단할 부분(보고서에 기록)
import { describe, it, expect } from 'vitest';
import { reviewCourse, reviewCourses } from '../src/lib/courseReview.js';

const categories = [{ id: 'excel', name: '엑셀' }];
const now = new Date('2026-10-16T12:00:00+09:00');

// 모든 기준을 통과하는 강좌 — 테스트마다 한 군데만 바꿔 본다
function validCourse(overrides = {}) {
  return {
    id: 'c101',
    slug: 'sample-course',
    status: 'open',
    title: '샘플 강의',
    summary: '샘플 설명입니다.',
    category: 'excel',
    price: 1000,
    instructorId: 'owner',
    outcome: '완성 파일 1개',
    learn: ['하나', '둘', '셋'],
    target: ['대상 하나', '대상 둘'],
    materials: ['준비물'],
    extraCost: '없음',
    accessPeriod: '취업할 때까지',
    refundPolicy: '환불 규정',
    tags: ['태그1', '태그2'],
    thumbnail: 'images/courses/c101.svg',
    lessons: [
      { id: 'l1', title: '맛보기', minutes: 4, isPreview: true },
      { id: 'l2', title: '본편', minutes: 8, isPreview: false },
    ],
    ...overrides,
  };
}

const review = (overrides) => reviewCourse(validCourse(overrides), { categories, courses: [], now });
const fields = (result, level) => result.issues.filter((issue) => issue.level === level).map((issue) => issue.field);

describe('green — 명료함', () => {
  it('모든 기준을 통과하면 green, 문제 없음', () => {
    expect(review({})).toEqual({ courseId: 'c101', title: '샘플 강의', level: 'green', issues: [] });
  });
});

describe('red — 맞지 않음', () => {
  it.each([
    ['가격 범위 밖', { price: 500 }, 'price'],
    ['가격이 정수가 아님', { price: 1000.5 }, 'price'],
    ['결과물 없음', { outcome: '  ' }, 'outcome'],
    ['환불 규정 없음', { refundPolicy: '' }, 'refundPolicy'],
    ['모르는 분야', { category: 'cooking' }, 'category'],
    ['상태 값 오류', { status: 'soon' }, 'status'],
    ['id 형식 오류', { id: 'course-1' }, 'id'],
    ['학습 목표 없음', { learn: [] }, 'learn'],
    ['맛보기 차시 없음', { lessons: [{ id: 'l1', title: '본편', minutes: 5, isPreview: false }] }, 'lessons'],
    ['과장 표현', { summary: '합격 보장 강의' }, 'summary'],
    ['날짜 형식 오류', { enrollment: { startDate: '2026/10/01' } }, 'enrollment'],
    ['마감일이 시작일보다 빠름', { enrollment: { startDate: '2026-10-10', endDate: '2026-10-01' } }, 'enrollment'],
  ])('%s → red', (_, overrides, field) => {
    const result = review(overrides);
    expect(result.level).toBe('red');
    expect(fields(result, 'red')).toContain(field);
  });

  it('다른 강좌와 id가 겹치면 red', () => {
    const result = reviewCourse(validCourse(), { categories, courses: [validCourse(), validCourse()], now });
    expect(fields(result, 'red')).toContain('id');
  });
});

describe('yellow — 애매함 (사람이 검토)', () => {
  it.each([
    ['결과물에 개수·단위가 없음', { outcome: '엑셀 실력 향상' }, 'outcome'],
    ['설명이 너무 김', { summary: '가'.repeat(61) }, 'summary'],
    ['학습 목표가 너무 적음', { learn: ['하나'] }, 'learn'],
    ['추천 대상이 1개뿐', { target: ['대상'] }, 'target'],
    ['강의가 너무 짧음', { lessons: [{ id: 'l1', title: '맛보기', minutes: 5, isPreview: true }] }, 'lessons'],
    [
      '맛보기가 절반을 넘음',
      {
        lessons: [
          { id: 'l1', title: 'a', minutes: 5, isPreview: true },
          { id: 'l2', title: 'b', minutes: 5, isPreview: true },
          { id: 'l3', title: 'c', minutes: 5, isPreview: false },
        ],
      },
      'lessons',
    ],
    ['모집이 끝난 강좌', { enrollment: { endDate: '2026-10-01' } }, 'enrollment'],
    ['제작 예정인데 모집 기간이 있음', { status: 'planned', enrollment: { startDate: '2026-11-01' } }, 'enrollment'],
  ])('%s → yellow', (_, overrides, field) => {
    const result = review(overrides);
    expect(result.level).toBe('yellow');
    expect(fields(result, 'yellow')).toContain(field);
  });
});

describe('문제마다 해결 방안을 함께 준다', () => {
  it('모든 issue에 message와 fix가 있다', () => {
    const result = review({ price: 5000, outcome: '실력 향상' });
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
    result.issues.forEach((issue) => {
      expect(issue.message.trim()).toBeTruthy();
      expect(issue.fix.trim()).toBeTruthy();
    });
  });

  it('red와 yellow가 함께 있으면 전체는 red', () => {
    expect(review({ price: 5000, outcome: '실력 향상' }).level).toBe('red');
  });
});

describe('reviewCourses — 여러 강좌 한 번에', () => {
  it('강좌마다 결과를 돌려준다', () => {
    const list = [validCourse(), validCourse({ id: 'c102', slug: 'other', price: 99 })];
    expect(reviewCourses(list, categories, now).map((result) => result.level)).toEqual(['green', 'red']);
  });
});

// 데모 구매·수강 가능 여부·결과물 완성 체크 — SPEC.md 5절 기준
import { describe, it, expect } from 'vitest';
import {
  buyNow,
  checkoutCart,
  cleanOutcomes,
  getLessonAccess,
  hasPurchased,
  markOutcomeDone,
  unmarkOutcome,
} from '../src/lib/purchase.js';

const NOW = '2026-10-16T10:00:00.000Z';

// 테스트용 가상 강의
const courses = [
  { id: 't001', status: 'open', price: 1000, lessons: [{ id: 'l1', isPreview: true }, { id: 'l2', isPreview: false }] },
  { id: 't002', status: 'open', price: 1500, lessons: [{ id: 'l1', isPreview: true }, { id: 'l2', isPreview: false }] },
  { id: 't003', status: 'planned', price: 2000, lessons: [{ id: 'l1', isPreview: true }, { id: 'l2', isPreview: false }] },
];
const [open1, open2, planned] = courses;
const owned = (courseId) => ({ courseId, purchasedAt: '2026-10-01T00:00:00.000Z' });

describe('hasPurchased', () => {
  it('구매 기록에 있으면 true', () => {
    expect(hasPurchased('t001', [owned('t001')])).toBe(true);
    expect(hasPurchased('t002', [owned('t001')])).toBe(false);
  });
});

describe('buyNow — 바로 구매(데모)', () => {
  it('구매 기록에 강의 1개를 추가한다', () => {
    const result = buyNow({ cart: [], purchases: [] }, open1, NOW);
    expect(result.purchases).toEqual([{ courseId: 't001', purchasedAt: NOW }]);
  });

  it('장바구니에 있던 강의면 장바구니에서 뺀다', () => {
    const result = buyNow({ cart: ['t001', 't002'], purchases: [] }, open1, NOW);
    expect(result.cart).toEqual(['t002']);
  });

  it('원래 상태를 바꾸지 않는다', () => {
    const state = { cart: ['t001'], purchases: [] };
    buyNow(state, open1, NOW);
    expect(state).toEqual({ cart: ['t001'], purchases: [] });
  });

  it('이미 산 강의·제작 예정 강의·없는 강의는 그대로 둔다', () => {
    const state = { cart: [], purchases: [owned('t001')] };
    expect(buyNow(state, open1, NOW)).toEqual(state);
    expect(buyNow(state, planned, NOW)).toEqual(state);
    expect(buyNow(state, null, NOW)).toEqual(state);
  });
});

describe('checkoutCart — 장바구니 결제(데모)', () => {
  it('담긴 강의를 모두 구매 기록에 추가하고 장바구니를 비운다', () => {
    const result = checkoutCart({ cart: ['t001', 't002'], purchases: [] }, courses, NOW);
    expect(result.purchases).toEqual([
      { courseId: 't001', purchasedAt: NOW },
      { courseId: 't002', purchasedAt: NOW },
    ]);
    expect(result.cart).toEqual([]);
    expect(result.added).toEqual(['t001', 't002']);
  });

  it('이미 산 강의·제작 예정·없는 강의는 구매 기록에 넣지 않는다', () => {
    const result = checkoutCart({ cart: ['t001', 't003', 't999'], purchases: [owned('t001')] }, courses, NOW);
    expect(result.purchases).toEqual([owned('t001')]);
    expect(result.added).toEqual([]);
    expect(result.cart).toEqual([]);
  });

  it('빈 장바구니는 아무것도 바뀌지 않는다', () => {
    const state = { cart: [], purchases: [owned('t002')] };
    expect(checkoutCart(state, courses, NOW)).toEqual({ ...state, added: [] });
  });
});

describe('getLessonAccess — 차시를 볼 수 있는지', () => {
  it('구매 안 함: 맛보기는 preview, 나머지는 locked', () => {
    expect(getLessonAccess(open1, open1.lessons[0], [])).toBe('preview');
    expect(getLessonAccess(open1, open1.lessons[1], [])).toBe('locked');
  });

  it('구매함: 모든 차시가 owned', () => {
    expect(getLessonAccess(open1, open1.lessons[0], [owned('t001')])).toBe('owned');
    expect(getLessonAccess(open1, open1.lessons[1], [owned('t001')])).toBe('owned');
  });

  it('다른 강의를 산 것은 영향 없다', () => {
    expect(getLessonAccess(open2, open2.lessons[1], [owned('t001')])).toBe('locked');
  });

  it('제작 예정 강의도 맛보기는 볼 수 있다', () => {
    expect(getLessonAccess(planned, planned.lessons[0], [])).toBe('preview');
    expect(getLessonAccess(planned, planned.lessons[1], [])).toBe('locked');
  });
});

describe('결과물 완성 체크', () => {
  it('구매한 강의만 완성 체크할 수 있다', () => {
    expect(markOutcomeDone([], open1, [owned('t001')])).toEqual(['t001']);
    expect(markOutcomeDone([], open2, [owned('t001')])).toEqual([]);
  });

  it('두 번 체크해도 1개만 남는다', () => {
    expect(markOutcomeDone(['t001'], open1, [owned('t001')])).toEqual(['t001']);
  });

  it('체크를 풀 수 있다', () => {
    expect(unmarkOutcome(['t001', 't002'], 't001')).toEqual(['t002']);
  });

  it('저장값 정리: 깨진 값·없는 강의·구매 안 한 강의·중복을 버린다', () => {
    expect(cleanOutcomes(['t001', 't002', 't999', 7, 't001'], courses, [owned('t001')])).toEqual(['t001']);
    expect(cleanOutcomes('t001', courses, [owned('t001')])).toEqual([]);
  });
});

describe('모집 기간 — 마감·모집 예정 강좌는 살 수 없다', () => {
  const now = new Date('2026-10-16T12:00:00+09:00');
  const closed = { id: 't201', status: 'open', price: 1000, lessons: [], enrollment: { endDate: '2026-10-10' } };

  it('바로 구매·장바구니 결제 모두 막힌다', () => {
    const state = { cart: ['t201'], purchases: [] };
    expect(buyNow(state, closed, NOW, now)).toEqual(state);
    expect(checkoutCart(state, [closed], NOW, now)).toEqual({ cart: [], purchases: [], added: [] });
  });
});

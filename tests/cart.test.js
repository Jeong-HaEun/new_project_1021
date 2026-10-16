// 장바구니 순수 로직 — SPEC.md 5절 "장바구니" 기준
import { describe, it, expect } from 'vitest';
import {
  addToCart,
  cleanCart,
  getAddStatus,
  getCartCourses,
  getCartTotal,
  removeFromCart,
} from '../src/lib/cart.js';

// 테스트용 가상 강의 (실제 강의 데이터와 무관)
const courses = [
  { id: 't001', status: 'open', price: 1000 },
  { id: 't002', status: 'open', price: 1500 },
  { id: 't003', status: 'open', price: 2000 },
  { id: 't004', status: 'planned', price: 1000 },
];
const [open1, open2, open3, planned] = courses;
const purchases = [{ courseId: 't003', purchasedAt: '2026-10-16T00:00:00.000Z' }];

describe('getAddStatus — 담을 수 있는지 판단', () => {
  it('담을 수 있으면 ok', () => {
    expect(getAddStatus([], open1, [])).toBe('ok');
  });

  it('이미 담긴 강의는 in-cart', () => {
    expect(getAddStatus(['t001'], open1, [])).toBe('in-cart');
  });

  it('구매한 강의는 owned', () => {
    expect(getAddStatus([], open3, purchases)).toBe('owned');
  });

  it('제작 예정 강의는 planned', () => {
    expect(getAddStatus([], planned, [])).toBe('planned');
  });

  it('없는 강의는 unknown', () => {
    expect(getAddStatus([], null, [])).toBe('unknown');
  });
});

describe('addToCart — 담기', () => {
  it('뒤에 강의 id를 추가한다', () => {
    expect(addToCart(['t001'], open2, [])).toEqual(['t001', 't002']);
  });

  it('원래 장바구니 배열은 바꾸지 않는다', () => {
    const cart = ['t001'];
    addToCart(cart, open2, []);
    expect(cart).toEqual(['t001']);
  });

  it('같은 강의를 두 번 담아도 1개만 남는다', () => {
    const once = addToCart([], open1, []);
    expect(addToCart(once, open1, [])).toEqual(['t001']);
  });

  it('구매한 강의·제작 예정 강의·없는 강의는 담기지 않는다', () => {
    expect(addToCart([], open3, purchases)).toEqual([]);
    expect(addToCart([], planned, [])).toEqual([]);
    expect(addToCart([], null, [])).toEqual([]);
  });
});

describe('removeFromCart — 빼기', () => {
  it('해당 강의만 뺀다', () => {
    expect(removeFromCart(['t001', 't002'], 't001')).toEqual(['t002']);
  });

  it('없는 강의를 빼도 그대로', () => {
    expect(removeFromCart(['t001'], 't999')).toEqual(['t001']);
  });
});

describe('getCartCourses / getCartTotal — 목록과 합계', () => {
  it('담은 순서대로 강의 정보를 돌려준다', () => {
    expect(getCartCourses(['t002', 't001'], courses)).toEqual([open2, open1]);
  });

  it('합계는 가격의 합 (묶음 할인 없음)', () => {
    expect(getCartTotal(['t001', 't002'], courses)).toBe(2500);
  });

  it('빈 장바구니는 0원', () => {
    expect(getCartTotal([], courses)).toBe(0);
  });
});

describe('cleanCart — 저장된 값 정리', () => {
  it('정상 값은 그대로', () => {
    expect(cleanCart(['t001', 't002'], courses, [])).toEqual(['t001', 't002']);
  });

  it('배열이 아니면 빈 장바구니', () => {
    expect(cleanCart(null, courses, [])).toEqual([]);
    expect(cleanCart('t001', courses, [])).toEqual([]);
    expect(cleanCart({ id: 't001' }, courses, [])).toEqual([]);
  });

  it('없는 강의·문자열이 아닌 값·중복을 버린다', () => {
    expect(cleanCart(['t001', 't999', 42, null, 't001'], courses, [])).toEqual(['t001']);
  });

  it('제작 예정 강의와 이미 구매한 강의를 버린다', () => {
    expect(cleanCart(['t001', 't004', 't003'], courses, purchases)).toEqual(['t001']);
  });
});

describe('모집 기간 — 마감·모집 예정 강좌는 담을 수 없다', () => {
  const now = new Date('2026-10-16T12:00:00+09:00');
  const closed = { id: 't101', status: 'open', price: 1000, enrollment: { endDate: '2026-10-10' } };
  const upcoming = { id: 't102', status: 'open', price: 1000, enrollment: { startDate: '2026-11-01' } };
  const running = { id: 't103', status: 'open', price: 1000, enrollment: { startDate: '2026-10-01', endDate: '2026-10-31' } };

  it('마감은 closed, 모집 예정은 upcoming, 모집중은 ok', () => {
    expect(getAddStatus([], closed, [], now)).toBe('closed');
    expect(getAddStatus([], upcoming, [], now)).toBe('upcoming');
    expect(getAddStatus([], running, [], now)).toBe('ok');
  });

  it('마감·모집 예정 강좌는 담기지 않고, 저장된 장바구니에서도 빠진다', () => {
    expect(addToCart([], closed, [], now)).toEqual([]);
    expect(cleanCart(['t101', 't102', 't103'], [closed, upcoming, running], [], now)).toEqual(['t103']);
  });

  it('이미 구매한 강좌는 마감돼도 owned (수강은 계속 가능)', () => {
    expect(getAddStatus([], closed, [{ courseId: 't101', purchasedAt: '2026-10-01T00:00:00.000Z' }], now)).toBe('owned');
  });
});

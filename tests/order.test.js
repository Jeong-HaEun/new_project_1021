// 주문 확인·결제수단 선택 (데모) — SPEC.md 5절 기준
import { describe, it, expect } from 'vitest';
import { getOrderDraft, PAYMENT_METHODS, placeDemoOrder, SKIP_REASONS, validateOrder } from '../src/lib/order.js';

const PURCHASED_AT = '2026-10-16T10:00:00.000Z';
const now = new Date('2026-10-16T12:00:00+09:00');

// 테스트용 가상 강의
const courses = [
  { id: 't001', status: 'open', price: 1000 },
  { id: 't002', status: 'open', price: 1500 },
  { id: 't003', status: 'planned', price: 2000 },
  { id: 't004', status: 'open', price: 1000, enrollment: { endDate: '2026-10-10' } },
  { id: 't005', status: 'open', price: 2000, enrollment: { startDate: '2026-11-01' } },
];
const owned = (courseId) => ({ courseId, purchasedAt: '2026-10-01T00:00:00.000Z' });
const ids = (list) => list.map((course) => course.id);

describe('PAYMENT_METHODS — 이름만 고르는 데모 결제수단', () => {
  it('카드·계좌이체·간편결제 3개, id는 겹치지 않는다', () => {
    expect(PAYMENT_METHODS.map((method) => method.id)).toEqual(['card', 'transfer', 'easy-pay']);
    PAYMENT_METHODS.forEach((method) => expect(method.label).toBeTruthy());
  });
});

describe('getOrderDraft — 주문 대상 정하기', () => {
  it('id가 없으면 장바구니 전체를 주문하고 합계를 낸다', () => {
    const draft = getOrderDraft({ cart: ['t001', 't002'], purchases: [], courses, now });
    expect(draft.mode).toBe('cart');
    expect(ids(draft.items)).toEqual(['t001', 't002']);
    expect(draft.total).toBe(2500);
    expect(draft.skipped).toEqual([]);
  });

  it('id가 있으면 장바구니와 상관없이 그 강의 1개만 (바로 구매)', () => {
    const draft = getOrderDraft({ courseId: 't002', cart: ['t001'], purchases: [], courses, now });
    expect(draft.mode).toBe('direct');
    expect(ids(draft.items)).toEqual(['t002']);
    expect(draft.total).toBe(1500);
  });

  it('살 수 없는 강의는 빠지고 이유가 남는다', () => {
    const draft = getOrderDraft({ cart: ['t001', 't002', 't003', 't004', 't005', 'zzz'], purchases: [owned('t002')], courses, now });
    expect(ids(draft.items)).toEqual(['t001']);
    expect(draft.total).toBe(1000);
    expect(draft.skipped).toEqual([
      { id: 't002', reason: 'owned' },
      { id: 't003', reason: 'planned' },
      { id: 't004', reason: 'closed' },
      { id: 't005', reason: 'upcoming' },
      { id: 'zzz', reason: 'unknown' },
    ]);
    draft.skipped.forEach(({ reason }) => expect(SKIP_REASONS[reason]).toBeTruthy());
  });

  it('바로 구매 강의가 없는 id면 주문할 강의 0개', () => {
    const draft = getOrderDraft({ courseId: 'zzz', cart: ['t001'], purchases: [], courses, now });
    expect(draft.items).toEqual([]);
    expect(draft.total).toBe(0);
    expect(draft.skipped).toEqual([{ id: 'zzz', reason: 'unknown' }]);
  });

  it('장바구니에 같은 id가 두 번 있어도 한 번만 주문한다', () => {
    const draft = getOrderDraft({ cart: ['t001', 't001'], purchases: [], courses, now });
    expect(ids(draft.items)).toEqual(['t001']);
  });

  it('장바구니가 비었거나 깨진 값이면 주문할 강의 0개', () => {
    expect(getOrderDraft({ cart: [], purchases: [], courses, now }).items).toEqual([]);
    expect(getOrderDraft({ cart: null, purchases: [], courses, now }).items).toEqual([]);
  });
});

describe('validateOrder — 결제 전 확인', () => {
  const draft = getOrderDraft({ cart: ['t001'], purchases: [], courses, now });
  const empty = getOrderDraft({ cart: [], purchases: [], courses, now });

  it('강의가 있고 아는 결제수단을 골랐으면 ok', () => {
    expect(validateOrder(draft, 'card')).toBe('ok');
    expect(validateOrder(draft, 'easy-pay')).toBe('ok');
  });

  it('결제수단을 안 골랐거나 모르는 값이면 no-method', () => {
    expect(validateOrder(draft, null)).toBe('no-method');
    expect(validateOrder(draft, '')).toBe('no-method');
    expect(validateOrder(draft, 'bitcoin')).toBe('no-method');
  });

  it('살 강의가 0개면 결제수단과 상관없이 empty', () => {
    expect(validateOrder(empty, 'card')).toBe('empty');
  });
});

describe('placeDemoOrder — 데모 결제 (구매 기록만 남김)', () => {
  it('장바구니 주문: 산 강의를 구매 기록에 넣고 장바구니에서 뺀다', () => {
    const state = { cart: ['t001', 't002'], purchases: [] };
    const draft = getOrderDraft({ ...state, courses, now });
    const result = placeDemoOrder(state, draft, 'card', PURCHASED_AT, now);
    expect(result.cart).toEqual([]);
    expect(result.purchases).toEqual([
      { courseId: 't001', purchasedAt: PURCHASED_AT },
      { courseId: 't002', purchasedAt: PURCHASED_AT },
    ]);
    expect(result.added).toEqual(['t001', 't002']);
  });

  it('바로 구매: 그 강의만 사고, 장바구니의 다른 강의는 남는다', () => {
    const state = { cart: ['t001', 't002'], purchases: [] };
    const draft = getOrderDraft({ courseId: 't002', ...state, courses, now });
    const result = placeDemoOrder(state, draft, 'transfer', PURCHASED_AT, now);
    expect(result.cart).toEqual(['t001']);
    expect(result.added).toEqual(['t002']);
  });

  it('결제수단이 없거나 살 강의가 없으면 아무것도 바뀌지 않는다', () => {
    const state = { cart: ['t001'], purchases: [] };
    const draft = getOrderDraft({ ...state, courses, now });
    expect(placeDemoOrder(state, draft, null, PURCHASED_AT, now)).toEqual({ ...state, added: [] });
    const empty = getOrderDraft({ cart: [], purchases: [], courses, now });
    expect(placeDemoOrder(state, empty, 'card', PURCHASED_AT, now)).toEqual({ ...state, added: [] });
  });

  it('주문 화면을 연 뒤 다른 탭에서 산 강의는 다시 사지 않는다', () => {
    const draft = getOrderDraft({ cart: ['t001', 't002'], purchases: [], courses, now });
    const state = { cart: ['t001', 't002'], purchases: [owned('t001')] };
    const result = placeDemoOrder(state, draft, 'card', PURCHASED_AT, now);
    expect(result.added).toEqual(['t002']);
    expect(result.purchases.filter((record) => record.courseId === 't001')).toHaveLength(1);
  });

  it('원래 상태를 바꾸지 않는다', () => {
    const state = { cart: ['t001'], purchases: [] };
    const draft = getOrderDraft({ ...state, courses, now });
    placeDemoOrder(state, draft, 'card', PURCHASED_AT, now);
    expect(state).toEqual({ cart: ['t001'], purchases: [] });
  });
});

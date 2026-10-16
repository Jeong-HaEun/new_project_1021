// 장바구니 저장·불러오기 — SPEC.md 5절: 깨진 값은 버리고, localStorage를 못 쓰면 메모리로 대신한다
import { describe, it, expect } from 'vitest';
import {
  CART_KEY,
  OUTCOMES_KEY,
  PURCHASES_KEY,
  createSafeStorage,
  loadCart,
  loadOutcomes,
  loadPurchases,
  resetDemoData,
  saveCart,
  saveOutcomes,
  savePurchases,
} from '../src/lib/cartStorage.js';

const courses = [
  { id: 't001', status: 'open', price: 1000 },
  { id: 't002', status: 'open', price: 1500 },
  { id: 't003', status: 'open', price: 2000 },
  { id: 't004', status: 'planned', price: 1000 },
];

// localStorage 흉내 — 테스트마다 새로 만든다
function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

// 접근하면 오류가 나는 저장소 (사생활 보호 모드 등)
const brokenStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('키 이름', () => {
  it('SPEC.md와 같은 키를 쓴다', () => {
    expect(CART_KEY).toBe('hanclass.cart.v1');
    expect(PURCHASES_KEY).toBe('hanclass.purchases.v1');
  });
});

describe('saveCart / loadCart', () => {
  it('저장한 장바구니를 그대로 불러온다', () => {
    const storage = createSafeStorage(() => fakeStorage());
    saveCart(storage, ['t001', 't002']);
    expect(loadCart(storage, courses, [])).toEqual(['t001', 't002']);
  });

  it('저장값이 없으면 빈 장바구니', () => {
    expect(loadCart(createSafeStorage(() => fakeStorage()), courses, [])).toEqual([]);
  });

  it('JSON이 깨졌으면 빈 장바구니', () => {
    const storage = createSafeStorage(() => fakeStorage({ [CART_KEY]: '[t001' }));
    expect(loadCart(storage, courses, [])).toEqual([]);
  });

  it('없는 강의·제작 예정·구매한 강의는 불러올 때 버린다', () => {
    const storage = createSafeStorage(() => fakeStorage({ [CART_KEY]: '["t001","t999","t004","t003"]' }));
    const purchases = [{ courseId: 't003', purchasedAt: '2026-10-16T00:00:00.000Z' }];
    expect(loadCart(storage, courses, purchases)).toEqual(['t001']);
  });
});

describe('loadPurchases', () => {
  it('정상 구매 기록을 불러온다', () => {
    const record = { courseId: 't002', purchasedAt: '2026-10-16T00:00:00.000Z' };
    const storage = createSafeStorage(() => fakeStorage({ [PURCHASES_KEY]: JSON.stringify([record]) }));
    expect(loadPurchases(storage, courses)).toEqual([record]);
  });

  it('형식이 틀렸거나 없는 강의, 중복 기록은 버린다', () => {
    const raw = [
      { courseId: 't002', purchasedAt: '2026-10-16T00:00:00.000Z' },
      { courseId: 't002', purchasedAt: '2026-10-17T00:00:00.000Z' },
      { courseId: 't999', purchasedAt: '2026-10-16T00:00:00.000Z' },
      { courseId: 't001' },
      'c001',
      null,
    ];
    const storage = createSafeStorage(() => fakeStorage({ [PURCHASES_KEY]: JSON.stringify(raw) }));
    expect(loadPurchases(storage, courses)).toEqual([raw[0]]);
  });

  it('앞의 기록이 깨져 있어도 뒤의 정상 기록은 살린다', () => {
    const valid = { courseId: 't001', purchasedAt: '2026-10-16T00:00:00.000Z' };
    const storage = createSafeStorage(() => fakeStorage({ [PURCHASES_KEY]: JSON.stringify([{ courseId: 't001' }, valid]) }));
    expect(loadPurchases(storage, courses)).toEqual([valid]);
  });

  it('배열이 아니거나 깨졌으면 빈 기록', () => {
    expect(loadPurchases(createSafeStorage(() => fakeStorage({ [PURCHASES_KEY]: '{}' })), courses)).toEqual([]);
    expect(loadPurchases(createSafeStorage(() => fakeStorage({ [PURCHASES_KEY]: 'oops' })), courses)).toEqual([]);
  });
});

describe('createSafeStorage — localStorage를 못 쓸 때', () => {
  it('저장소를 가져오다 오류가 나면 메모리로 대신한다', () => {
    const storage = createSafeStorage(() => {
      throw new Error('no localStorage');
    });
    saveCart(storage, ['t001']);
    expect(loadCart(storage, courses, [])).toEqual(['t001']);
  });

  it('읽기·쓰기에서 오류가 나도 멈추지 않고 메모리로 동작한다', () => {
    const storage = createSafeStorage(() => brokenStorage);
    expect(() => saveCart(storage, ['t002'])).not.toThrow();
    expect(loadCart(storage, courses, [])).toEqual(['t002']);
  });

  it('isPersistent로 실제 저장 여부를 알려준다', () => {
    expect(createSafeStorage(() => fakeStorage()).isPersistent()).toBe(true);
    expect(createSafeStorage(() => brokenStorage).isPersistent()).toBe(false);
  });
});

describe('구매 기록·결과물 체크 저장 (데모 구매용)', () => {
  const purchase = { courseId: 't001', purchasedAt: '2026-10-16T00:00:00.000Z' };

  it('OUTCOMES_KEY는 SPEC.md와 같다', () => {
    expect(OUTCOMES_KEY).toBe('hanclass.outcomes.v1');
  });

  it('저장한 구매 기록을 그대로 불러온다', () => {
    const storage = createSafeStorage(() => fakeStorage());
    savePurchases(storage, [purchase]);
    expect(loadPurchases(storage, courses)).toEqual([purchase]);
  });

  it('결과물 체크는 구매한 강의만 불러온다', () => {
    const storage = createSafeStorage(() => fakeStorage());
    saveOutcomes(storage, ['t001', 't002']);
    expect(loadOutcomes(storage, courses, [purchase])).toEqual(['t001']);
  });

  it('데모 초기화: 장바구니·구매 기록·결과물 체크를 모두 비운다', () => {
    const storage = createSafeStorage(() => fakeStorage());
    saveCart(storage, ['t002']);
    savePurchases(storage, [purchase]);
    saveOutcomes(storage, ['t001']);
    resetDemoData(storage);
    expect(loadCart(storage, courses, [])).toEqual([]);
    expect(loadPurchases(storage, courses)).toEqual([]);
    expect(loadOutcomes(storage, courses, [])).toEqual([]);
  });
});

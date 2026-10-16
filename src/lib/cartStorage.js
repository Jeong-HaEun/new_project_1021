// 장바구니·구매 기록·결과물 체크 저장 — 브라우저 localStorage에 JSON으로 저장한다 (SPEC.md 5절)
// 사생활 보호 모드 등으로 localStorage를 못 쓰면 메모리에만 저장해 화면은 정상 동작하게 한다
import { cleanCart } from './cart.js';
import { cleanOutcomes } from './purchase.js';

// 키 끝의 .v1: 저장 모양이 바뀌면 숫자를 올려 옛 값과 섞이지 않게 한다
export const CART_KEY = 'hanclass.cart.v1';
export const PURCHASES_KEY = 'hanclass.purchases.v1';
export const OUTCOMES_KEY = 'hanclass.outcomes.v1';

const PROBE_KEY = 'hanclass.probe';

// 실제 저장소 + 메모리 예비 저장소를 묶은 저장 도구
// getStorage: 실제 저장소를 돌려주는 함수 (예: () => window.localStorage). 테스트에서는 가짜를 넘긴다
export function createSafeStorage(getStorage) {
  const memory = new Map();
  let real = null;

  try {
    real = getStorage();
    real.setItem(PROBE_KEY, '1'); // 실제로 쓸 수 있는지 미리 확인
    real.removeItem(PROBE_KEY);
  } catch {
    real = null;
  }

  return {
    getItem(key) {
      if (real) {
        try {
          return real.getItem(key);
        } catch {
          real = null;
        }
      }
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) {
      memory.set(key, value);
      if (!real) return;
      try {
        real.setItem(key, value);
      } catch {
        real = null; // 이후로는 메모리만 사용
      }
    },
    // 브라우저를 닫아도 남는지 (false면 화면에 "이 브라우저에서는 저장되지 않아요" 안내용)
    isPersistent() {
      return real !== null;
    },
  };
}

// JSON 읽기 — 없거나 깨졌으면 null
function readJson(storage, key) {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
}

// 구매 기록 불러오기 — 형식이 맞고 실제 있는 강의만, 강의당 첫 기록 1개만 남긴다
export function loadPurchases(storage, courses) {
  const raw = readJson(storage, PURCHASES_KEY);
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter(
    (record) =>
      record &&
      typeof record.courseId === 'string' &&
      typeof record.purchasedAt === 'string' &&
      courses.some((course) => course.id === record.courseId),
  );
  return valid.filter((record, index) => valid.findIndex((other) => other.courseId === record.courseId) === index);
}

// 장바구니 불러오기 — cleanCart로 깨진 값·담을 수 없는 강의를 정리
export function loadCart(storage, courses, purchases) {
  return cleanCart(readJson(storage, CART_KEY), courses, purchases);
}

export function saveCart(storage, cart) {
  storage.setItem(CART_KEY, JSON.stringify(cart));
}

export function savePurchases(storage, purchases) {
  storage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
}

// 결과물 완성 체크 불러오기 — 구매한 강의만 남긴다
export function loadOutcomes(storage, courses, purchases) {
  return cleanOutcomes(readJson(storage, OUTCOMES_KEY), courses, purchases);
}

export function saveOutcomes(storage, outcomes) {
  storage.setItem(OUTCOMES_KEY, JSON.stringify(outcomes));
}

// 데모 초기화 — 발표 시연을 처음부터 다시 할 때 (장바구니·구매 기록·결과물 체크를 비움)
export function resetDemoData(storage) {
  saveCart(storage, []);
  savePurchases(storage, []);
  saveOutcomes(storage, []);
}

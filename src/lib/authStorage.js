// 한클래스·같은 출처 Adporter 공통 Supabase 저장 정책. 기본은 탭 세션.
const safe = (store, method, ...args) => { try { return store?.[method](...args); } catch { return undefined; } };
export function createAuthStorage({ local, session, storageKey }) {
  const preference = storageKey + '.remember.v1';
  const managed = [storageKey, storageKey + '-code-verifier', storageKey + '-user'];
  const memory = new Map();
  const remember = () => safe(local, 'getItem', preference) === '1';
  const remove = (key) => {
    safe(local, 'removeItem', key); safe(session, 'removeItem', key); memory.delete(key);
  };
  // 이전 버전의 자동 저장은 사용자가 로그인 유지를 선택한 것으로 간주하지 않는다.
  if (!remember()) managed.forEach((key) => safe(local, 'removeItem', key));
  const api = {
    storageKey,
    getItem(key) {
      const value = safe(remember() ? local : session, 'getItem', key);
      return value ?? memory.get(key) ?? null;
    },
    setItem(key, value) {
      const target = remember() ? local : session;
      safe(target, 'setItem', key, value);
      if (safe(target, 'getItem', key) === value) memory.delete(key);
      else memory.set(key, value);
      safe(remember() ? session : local, 'removeItem', key);
    },
    removeItem: remove,
    setRemember(enabled) {
      const values = managed.map((key) => [key, api.getItem(key)]);
      if (enabled) safe(local, 'setItem', preference, '1');
      else safe(local, 'removeItem', preference);
      const actual = remember();
      if (!actual) safe(local, 'removeItem', preference);
      managed.forEach(remove);
      values.forEach(([key, value]) => { if (value !== null) api.setItem(key, value); });
      return actual;
    },
    isRemembered: remember,
  };
  return api;
}
const clients = new Map();
export function createBrowserAuthStorage(url) {
  // 같은 Supabase를 쓰는 다른 서비스의 기존 로그인 저장값은 변경하지 않는다.
  const storageKey = 'hanclass-sb-' + new URL(url).hostname.split('.')[0] + '-auth-token';
  if (!clients.has(storageKey)) {
    const getStore = (name) => { try { return globalThis[name]; } catch { return undefined; } };
    clients.set(storageKey, createAuthStorage({
      local: getStore('localStorage'), session: getStore('sessionStorage'), storageKey,
    }));
  }
  return clients.get(storageKey);
}

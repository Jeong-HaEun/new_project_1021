import { describe, it, expect, vi } from 'vitest';
import { createAuthStorage, createBrowserAuthStorage } from '../src/lib/authStorage.js';
const store = () => { const map = new Map(); return { getItem: (k) => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: (k) => map.delete(k) }; };
const key = 'sb-test-auth-token';
const setup = () => { const local=store(), session=store(); return { local,session,auth:createAuthStorage({local,session,storageKey:key}) }; };
describe('로그인 저장 정책', () => {
  it('기본 해제: 새로고침에는 남고 새 탭 세션에서는 사라진다', () => {
    const {local,session,auth}=setup(); auth.setItem(key,'session');
    expect(local.getItem(key)).toBeNull();
    expect(createAuthStorage({local,session,storageKey:key}).getItem(key)).toBe('session');
    expect(createAuthStorage({local,session:store(),storageKey:key}).getItem(key)).toBeNull();
  });
  it('유지 선택 때만 새 탭·재시작 후에도 지속 저장을 읽는다', () => {
    const {local,auth}=setup(); auth.setRemember(true); auth.setItem(key,'session');
    expect(createAuthStorage({local,session:store(),storageKey:key}).getItem(key)).toBe('session');
  });
  it('유지를 해제하면 세션과 OAuth verifier를 옮기고 지속 토큰을 지운다', () => {
    const {local,session,auth}=setup(); auth.setRemember(true);
    auth.setItem(key,'session'); auth.setItem(key+'-code-verifier','oauth');
    auth.setRemember(false);
    expect(local.getItem(key)).toBeNull();
    expect(local.getItem(key+'-code-verifier')).toBeNull();
    expect(session.getItem(key)).toBe('session');
    expect(auth.getItem(key+'-code-verifier')).toBe('oauth');
  });
  it('기존 자동 저장은 사용자 선택 없이 재사용하지 않고 다른 앱 값은 보존한다', () => {
    const local=store(); local.setItem(key,'old'); local.setItem('cart','keep');
    const auth=createAuthStorage({local,session:store(),storageKey:key});
    expect(auth.getItem(key)).toBeNull(); expect(local.getItem(key)).toBeNull();
    expect(local.getItem('cart')).toBe('keep');
  });
  it('같은 출처 iframe은 같은 탭 저장소로 로그인과 OAuth 복귀를 공유한다', () => {
    const {local,session,auth}=setup(); auth.setItem(key+'-code-verifier','oauth');
    const frame=createAuthStorage({local,session,storageKey:key});
    expect(frame.getItem(key+'-code-verifier')).toBe('oauth');
    auth.setItem(key,'signed-in'); expect(frame.getItem(key)).toBe('signed-in');
    frame.removeItem(key); expect(auth.getItem(key)).toBeNull();
  });
  it('저장소가 막혀도 토큰을 지속 저장하지 않고 메모리로 동작한다', () => {
    const blocked={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};
    const auth=createAuthStorage({local:blocked,session:blocked,storageKey:key});
    expect(auth.setRemember(true)).toBe(false); auth.setItem(key,'private');
    expect(auth.getItem(key)).toBe('private'); auth.removeItem(key); expect(auth.getItem(key)).toBeNull();
  });
});

it('한클래스 전용 키는 같은 Supabase의 다른 서비스 저장값을 바꾸지 않는다',()=>{
 const local=store(),session=store();local.setItem('sb-isolation-auth-token','other-service');
 vi.stubGlobal('localStorage',local);vi.stubGlobal('sessionStorage',session);
 try {
  const storage=createBrowserAuthStorage('https://isolation.supabase.co');
  expect(storage.storageKey).toBe('hanclass-sb-isolation-auth-token');
  expect(storage.getItem(storage.storageKey)).toBeNull();
  storage.setItem(storage.storageKey,'ours');
  expect(local.getItem('sb-isolation-auth-token')).toBe('other-service');
 } finally { vi.unstubAllGlobals(); }
});

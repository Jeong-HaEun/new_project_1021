// 커뮤니티 브라우저 저장 — 닉네임(이 브라우저)과 로그인 뒤 돌아갈 화면(이 탭)
// 저장소를 못 써도(사생활 보호 모드 등) 화면은 동작해야 하므로 실패는 조용히 넘긴다
import { browserStorage } from './experimentTracking.js';
import { safeReturnSearch } from './communityView.js';

const NAME_KEY = 'hanclass.communityName.v1';
const RETURN_KEY = 'hanclass.communityReturn';
const local = browserStorage('localStorage');
const session = browserStorage('sessionStorage');

const read = (store, key) => { try { return store?.getItem(key) ?? ''; } catch { return ''; } };
const write = (store, key, value) => { try { store?.setItem(key, value); } catch { /* 무시 */ } };
const remove = (store, key) => { try { store?.removeItem(key); } catch { /* 무시 */ } };

export const savedName = () => read(local, NAME_KEY);
export const rememberName = (name) => write(local, NAME_KEY, name);
export const rememberReturn = (search) => write(session, RETURN_KEY, search);

// 저장해 둔 돌아갈 화면을 한 번만 꺼낸다 (커뮤니티 안 주소로 다시 만든 값, 없으면 '')
export function takeReturn() {
  const saved = read(session, RETURN_KEY);
  if (!saved) return '';
  remove(session, RETURN_KEY);
  return safeReturnSearch(saved);
}

// 같은 출처 iframe에도 동일한 저장 정책을 적용한다.
import { createBrowserAuthStorage } from './authStorage.js';
export async function getAuthPolicy(url) {
  return createBrowserAuthStorage(url);
}

// 계정 기록 동기화 — 페이지를 열 때 로그인한 계정의 데모 수강 기록을 서버에서 읽어 수강 상태에 반영한다
// 같은 계정이면 어느 기기에서나 같은 수강 상태. 읽은 기록은 메모리에만 둔다 (cartStore.setAccountRecords)
import { COURSES } from '../data/courses/index.js';
import { isServerConfigured } from './server.js';
import { getCurrentUser } from './account.js';
import { fetchMyEnrollments, fetchMyOutcomes } from './enrollmentApi.js';
import { normalizeEnrollments, normalizeOutcomeRows, toPurchaseRecords } from './myClassroom.js';
import { setAccountRecords } from './cartStore.js';

// 'off'(서버 연결 전) | 'pending' | 'signed-out' | 'synced' | 'error'
let status = isServerConfigured() ? 'pending' : 'off';
let current = Promise.resolve(status);

export function getAccountSyncStatus() {
  return status;
}

// 실패해도 화면은 이 브라우저 기록으로 계속 동작한다 (status 'error'로 안내만)
export function syncAccountEnrollments() {
  if (!isServerConfigured()) return current;
  status = 'pending';
  current = (async () => {
    try {
      if (!(await getCurrentUser())) {
        status = 'signed-out';
        setAccountRecords();
        return status;
      }
      const [rows, outcomeRows] = await Promise.all([fetchMyEnrollments(), fetchMyOutcomes()]);
      status = 'synced';
      setAccountRecords({
        purchases: toPurchaseRecords(normalizeEnrollments(rows, COURSES)),
        outcomes: normalizeOutcomeRows(outcomeRows, COURSES),
      });
    } catch {
      status = 'error';
      setAccountRecords();
    }
    return status;
  })();
  return current;
}

// 마지막 동기화가 끝날 때까지 기다린다 (주문 화면처럼 첫 화면부터 정확해야 할 때)
export function whenAccountSynced() {
  return current;
}

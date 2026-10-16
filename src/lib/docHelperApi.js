// 서류 도우미 서버 함수(doc-helper) 호출 — 로그인 토큰은 supabase-js가 자동으로 붙인다
// 성공: { ok: true, data }, 실패: { ok: false, error, status?, remaining?, field? }
import { getServerClient } from './server.js';

export async function callDocHelper(body) {
  try {
    const client = await getServerClient();
    const { data, error } = await client.functions.invoke('doc-helper', { body });
    if (!error) return { ok: true, data };
    const status = error.context?.status;
    let payload = {};
    try {
      payload = await error.context.json();
    } catch {
      // 본문이 없는 오류 (네트워크 등)
    }
    return { ok: false, status, error: payload.error ?? (status ? 'server' : 'network'), remaining: payload.remaining, field: payload.field };
  } catch {
    return { ok: false, error: 'network' };
  }
}

// 오늘 남은 횟수와 실습 기간 여부 — { open, limit, remaining } | { unreachable: true } | null(확인 실패)
// unreachable: 서버 함수에 닿지 못함 (배포 전이면 브라우저가 연결 단계에서 막아 '연결 끊김'과 구별할 수 없다)
export async function fetchHelperStatus() {
  const result = await callDocHelper({ action: 'status' });
  if (result.ok) return result.data;
  return result.error === 'network' || result.status === 404 ? { unreachable: true } : null;
}

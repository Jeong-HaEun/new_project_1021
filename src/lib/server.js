import { getAuthPolicy } from './authPreference.js';
// 서버(Supabase) 연결 — 지금은 세시드와 같은 프로젝트를 함께 쓴다 (SPEC.md 5절). 설정값이 없으면 서버 기능을 끈다 ('서버 연결 준비 중' 표시)
// 값은 .env.local(로컬)과 GitHub 저장소 Variables(배포)에서 읽는다. .env.example 참고
// 공개용(publishable) 키만 쓴다. 이 키는 브라우저에 보여도 되고, 실제 보호는 DB의 RLS 정책이 맡는다
// ⚠ service_role·secret 키는 브라우저 코드·저장소에 절대 넣지 않는다 (tests/serverRules.test.js에서 검사)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

let clientPromise = null;

export function isServerConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

// 서버가 필요한 화면에서만 라이브러리를 불러온다 (설정 전에는 불러오지 않음)
export function getServerClient() {
  if (!isServerConfigured()) return Promise.reject(new Error('server-not-configured'));
  clientPromise ??= Promise.all([import('@supabase/supabase-js'), getAuthPolicy(SUPABASE_URL)])
    .then(([{ createClient }, storage]) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storage, storageKey: storage.storageKey, persistSession: true },
    })).catch((error) => { clientPromise = null; throw error; });
  return clientPromise;
}

// SDK 초기화 전·후 모두 같은 정책 객체에 반영한다.
export async function setRememberLogin(enabled) {
  if (!isServerConfigured()) return false;
  return (await getAuthPolicy(SUPABASE_URL)).setRemember(Boolean(enabled));
}

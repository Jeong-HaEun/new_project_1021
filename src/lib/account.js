// 계정 — 카카오 로그인(Supabase Auth)·로그아웃·로그인 상태 알림
// 비밀번호·카카오 토큰은 다루지 않는다. 로그인 처리는 카카오 → Supabase가 맡는다
// ⚠ Supabase 대시보드에서 Kakao 제공자를 켜고, 돌아올 주소(myclass.html)를 Redirect URLs에 등록해야 동작한다
import { getServerClient, isServerConfigured } from './server.js';

// 지금 로그인한 사용자 (없으면 null). 서버 연결 전이면 null
export async function getCurrentUser() {
  if (!isServerConfigured()) return null;
  const client = await getServerClient();
  const { data } = await client.auth.getSession();
  return data.session?.user ?? null;
}

// 로그인·로그아웃이 일어날 때마다 callback(user | null)
// setTimeout: 알림 안에서 바로 DB를 부르면 Supabase 내부 잠금과 겹칠 수 있어 한 박자 늦춘다 (Supabase 권장)
export async function onAuthChange(callback) {
  if (!isServerConfigured()) return;
  const client = await getServerClient();
  client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => callback(session?.user ?? null), 0);
  });
}

// 카카오 로그인 화면으로 이동 → 끝나면 Supabase를 거쳐 내 강의실로 돌아온다
export async function signInWithKakao() {
  const client = await getServerClient();
  const redirectTo = new URL('./myclass.html', window.location.href).href;
  const { error } = await client.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo } });
  if (error) throw error;
}

// 로그아웃 — Supabase가 브라우저에 저장한 로그인 정보도 함께 지운다
export async function signOut() {
  const client = await getServerClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

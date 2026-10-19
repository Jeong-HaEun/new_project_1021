// 계정 — 카카오·이메일 로그인(Supabase Auth)·로그아웃·로그인 상태 알림
// 비밀번호는 Supabase로 바로 보내고 저장·기록하지 않는다. 카카오 토큰은 다루지 않는다
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

// 카카오 로그인 화면으로 이동 → 끝나면 Supabase를 거쳐 returnPage로 돌아온다 (Redirect URLs에 등록된 페이지만)
export async function signInWithKakao(returnPage = 'myclass.html') {
  const client = await getServerClient();
  const redirectTo = new URL(`./${returnPage}`, window.location.href).href;
  const { error } = await client.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo } });
  if (error) throw error;
}

// 로그아웃 — Supabase가 브라우저에 저장한 로그인 정보도 함께 지운다
export async function signOut() {
  const client = await getServerClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

// 이메일·비밀번호 로그인. 실패하면 Supabase 오류를 그대로 던진다 (화면에서 authErrorText로 바꿔 보여 줌)
export async function signInWithEmail(email, password) {
  const client = await getServerClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

// 이메일 가입 → 인증 메일의 링크를 누르면 returnPage로 돌아와 로그인된다 (Redirect URLs에 등록된 페이지만)
// 이미 가입한 이메일이어도 Supabase는 같은 응답을 준다 (가입 여부가 드러나지 않게)
export async function signUpWithEmail(email, password, returnPage = 'myclass.html') {
  const client = await getServerClient();
  const emailRedirectTo = new URL(`./${returnPage}`, window.location.href).href;
  const { error } = await client.auth.signUp({ email, password, options: { emailRedirectTo } });
  if (error) throw error;
}

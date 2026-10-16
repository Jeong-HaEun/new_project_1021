// 광고 성과 보고서 페이지(report.html) — Adporter를 한클래스 틀 안에 끼워 넣는다 (SPEC.md 5절)
// 로그인은 한클래스가 맡는다. Adporter는 같은 도메인이라 같은 로그인 정보로 보고서를 연다
// (카카오 로그인 화면은 iframe 안에서 열리지 않아서 Adporter 안에서 로그인하지 않는다)

// 같은 도메인의 Adporter 주소 (배포: jeong-haeun.github.io/new_project_oct/, 로컬: vite 프록시)
export const REPORT_APP_PATH = '../new_project_oct/';
export const REPORT_FRAME_PATH = `${REPORT_APP_PATH}?embed=1`;

// 'unavailable'(서버 연결 전) | 'loading' | 'error'(로그인 확인 실패) | 'signed-out' | 'ready'
// user: undefined(확인 중) | null(로그아웃) | 사용자
export function getReportPageState({ configured, user, failed = false }) {
  if (!configured) return 'unavailable';
  if (user === undefined) return failed ? 'error' : 'loading';
  return user ? 'ready' : 'signed-out';
}

// 커뮤니티 보호 규칙 — 도배 방지 기준·서버가 거절한 이유·신고 (SPEC.md '커뮤니티 보호')
// 실제로 막는 건 DB다 (supabase/migrations/20261019000000_community_guard.sql). 여기 값은 화면 안내용으로 DB와 같게 둔다

export const RATE_LIMITS = {
  post: { count: 5, minutes: 10 },
  comment: { count: 20, minutes: 10 },
};

// 신고가 이 수만큼 쌓이면 DB가 글을 숨긴다 (운영자가 SQL로 다시 보이게 할 수 있음)
export const REPORT_HIDE_COUNT = 3;

export const REPORT_REASONS = [
  { id: 'spam', label: '광고·도배' },
  { id: 'personal', label: '개인정보 노출' },
  { id: 'abuse', label: '욕설·비방' },
  { id: 'etc', label: '기타' },
];

// 서버 오류 → 'rate-limited' | 'personal-info' | 'reserved-name' | 'already-reported' | 'not-owner' | 'unknown'
// DB 보호 함수는 P0001 오류에 community_rate_limited / community_personal_info 표시를 담아 보낸다
export function serverProblem(error) {
  const message = error?.message ?? '';
  if (message.includes('community_rate_limited')) return 'rate-limited';
  if (message.includes('community_personal_info')) return 'personal-info';
  if (message.includes('community_reserved_name')) return 'reserved-name';
  if (message === 'not-owner') return 'not-owner';
  if (error?.code === '23505') return 'already-reported';
  return 'unknown';
}

// kind: 'post' | 'comment' | 'report'
export function guardText(problem, kind = 'post') {
  if (problem === 'rate-limited') {
    const { count, minutes } = RATE_LIMITS[kind] ?? RATE_LIMITS.post;
    return `${kind === 'comment' ? '댓글' : '글'}은 ${minutes}분에 ${count}개까지 올릴 수 있어요. 잠시 후 다시 올려 주세요.`;
  }
  if (problem === 'personal-info') return '전화번호·이메일처럼 보이는 내용이 있어요. 개인정보는 지우고 올려 주세요.';
  if (problem === 'reserved-name') return '운영자로 보일 수 있는 닉네임(취메·운영자·관리자 등)은 쓸 수 없어요. 다른 닉네임을 써 주세요.';
  if (problem === 'already-reported') return '이미 신고한 글이에요.';
  if (problem === 'not-owner') return '본인 글·댓글만 고치거나 지울 수 있어요.';
  if (kind === 'comment') return '댓글을 올리지 못했어요. 잠시 후 다시 시도해 주세요.';
  if (kind === 'report') return '신고하지 못했어요. 잠시 후 다시 시도해 주세요.';
  return '저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export function validateReport(reason) {
  return REPORT_REASONS.some((item) => item.id === reason) ? { ok: true, reason } : { ok: false };
}

// 신고 버튼 — 'hidden'(로그아웃·확인 중·내 글) | 'reported' | 'can-report'
export function getReportState({ user, post, reported }) {
  if (!user?.id || post?.userId === user.id) return 'hidden';
  return reported ? 'reported' : 'can-report';
}

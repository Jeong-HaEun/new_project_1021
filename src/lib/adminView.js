// 운영자 페이지 규칙 — 화면 상태·회원 통계 정리·서버 오류 해석 (SPEC.md '운영자 페이지')
// 실제 권한은 DB가 막는다 (supabase/migrations/20261019010000_hanclass_admin.sql). 화면 숨김은 보안이 아니다

// 'unavailable'(서버 연결 전) | 'loading' | 'signed-out' | 'not-ready'(DB 적용 전) | 'not-admin' | 'error' | 'ready'
export function getAdminState({ configured, user, role, status }) {
  if (!configured) return 'unavailable';
  if (user === undefined || status === 'loading') return 'loading';
  if (!user) return 'signed-out';
  if (status === 'not-ready' || status === 'error') return status;
  return role ? 'ready' : 'not-admin';
}

// 서버 오류 → 'not-ready'(운영자 SQL 적용 전) | 'not-super-admin' | 'not-admin' | 'not-found' | 'unknown'
export function adminProblem(error) {
  const message = error?.message ?? '';
  if (error?.code === 'PGRST202' || error?.code === '42883' || message.includes('Could not find the function')) return 'not-ready';
  if (message.includes('hanclass_not_super_admin')) return 'not-super-admin';
  if (message.includes('hanclass_not_admin')) return 'not-admin';
  if (message.includes('hanclass_not_found')) return 'not-found';
  return 'unknown';
}

const count = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Math.floor(Number(value)) : 0);

// 완성률 — 신청 0이면 null (0%로 보이지 않게)
export function completionRate(enrollments, outcomes) {
  if (!enrollments) return null;
  return Math.round((Math.min(outcomes, enrollments) / enrollments) * 100);
}

// 서버 통계 → 화면용. courses: 강의 데이터 (제목 붙이기, 없는 강의 id는 그대로 표시)
export function normalizeOverview(raw, courses) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const members = [
    { id: 'members', label: '한클래스 활동 회원', value: count(data.members) },
    { id: 'newMembers7d', label: '최근 7일 새 회원', value: count(data.newMembers7d) },
    { id: 'activeMembers7d', label: '최근 7일 활동 회원', value: count(data.activeMembers7d) },
  ];
  const activity = [
    { id: 'enrollments', label: '데모 수강 신청', value: count(data.enrollments) },
    { id: 'outcomes', label: '결과물 완성 체크', value: count(data.outcomes) },
    { id: 'posts', label: '커뮤니티 글', value: count(data.posts) },
    { id: 'comments', label: '커뮤니티 댓글', value: count(data.comments) },
    { id: 'reports', label: '쌓인 신고', value: count(data.reports) },
    { id: 'hiddenPosts', label: '숨긴 글', value: count(data.hiddenPosts) },
    { id: 'docHelperToday', label: '오늘 서류 도우미 사용', value: count(data.docHelperToday) },
  ];
  const byCourse = (Array.isArray(data.byCourse) ? data.byCourse : [])
    .filter((row) => row && typeof row.courseId === 'string')
    .map((row) => {
      const enrollments = count(row.enrollments);
      const outcomes = count(row.outcomes);
      const title = courses.find((course) => course.id === row.courseId)?.title ?? row.courseId;
      return { courseId: row.courseId, title, enrollments, outcomes, rate: completionRate(enrollments, outcomes) };
    })
    .sort((a, b) => b.enrollments - a.enrollments || a.courseId.localeCompare(b.courseId));
  const days = (Array.isArray(data.newMembersByDay) ? data.newMembersByDay : [])
    .filter((row) => row && /^\d{4}-\d{2}-\d{2}$/.test(row.day))
    .map((row) => ({ day: row.day, count: count(row.count) }));
  const generatedAt = typeof data.generatedAt === 'string' && !Number.isNaN(Date.parse(data.generatedAt)) ? data.generatedAt : null;
  return { members, activity, byCourse, days, generatedAt };
}

// '집계 10.19 오후 3:05 · 출처 한클래스 서버 기록 (운영자 제외)'
export function overviewSource(generatedAt) {
  const time = generatedAt
    ? new Date(generatedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul' })
    : '알 수 없음';
  return `집계 ${time} · 출처 한클래스 서버 기록 (운영자 제외, 새로고침하면 다시 집계)`;
}

const REASON_LABELS = { spam: '광고·도배', personal: '개인정보 노출', abuse: '욕설·비방', etc: '기타' };

// 신고·숨김 글 → 화면용. 사유는 '광고·도배 2 · 기타 1'처럼 묶는다
export function normalizeReported(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && typeof row.id === 'number' && typeof row.title === 'string')
    .map((row) => {
      const tally = (Array.isArray(row.reasons) ? row.reasons : []).reduce((map, id) => map.set(id, (map.get(id) ?? 0) + 1), new Map());
      const reasons = [...tally].map(([id, n]) => `${REASON_LABELS[id] ?? '기타'} ${n}`).join(' · ');
      return { id: row.id, title: row.title, authorName: row.author_name ?? '', hidden: row.hidden === true, reportCount: count(row.report_count), reasons, createdAt: row.created_at };
    });
}

const ACTION_LABELS = { hide_post: '글 숨김', unhide_post: '다시 보이기', delete_post: '글 삭제' };

// 활동 기록 → 화면용 (처리자 id는 보여 주지 않는다)
export function normalizeLog(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && ACTION_LABELS[row.action] && typeof row.created_at === 'string')
    .map((row) => ({ id: row.id, action: ACTION_LABELS[row.action], target: `글 ${row.target_id}`, reason: row.reason ?? '', createdAt: row.created_at }));
}

// '10.19' 형식 (한국 날짜 문자열 'YYYY-MM-DD'에서)
export const shortDay = (day) => `${Number(day.slice(5, 7))}.${Number(day.slice(8, 10))}`;

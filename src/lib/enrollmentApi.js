// 서버의 데모 수강 신청 기록 (demo_enrollments) 읽기·저장
// 사용자 id를 보내거나 걸러 묻지 않는다 — 서버가 로그인 정보로 채우고, RLS가 본인 기록만 돌려준다
// (supabase/migrations/20261016000000_demo_enrollments.sql)
import { getServerClient } from './server.js';
import { toEnrollmentRows } from './myClassroom.js';

const TABLE = 'demo_enrollments';

// 내 기록 [{ course_id, enrolled_at }]. 실패하면 오류를 던진다 (화면에서 재시도 안내)
export async function fetchMyEnrollments() {
  const client = await getServerClient();
  const { data, error } = await client.from(TABLE).select('course_id, enrolled_at');
  if (error) throw error;
  return data;
}

// 신청 저장 — 이미 있는 (사용자, 강의)는 건너뛴다 (unique 제약 + ignoreDuplicates)
export async function saveDemoEnrollments(courseIds) {
  if (courseIds.length === 0) return;
  const client = await getServerClient();
  const { error } = await client
    .from(TABLE)
    .upsert(toEnrollmentRows(courseIds), { onConflict: 'user_id,course_id', ignoreDuplicates: true });
  if (error) throw error;
}

// 결과물 완성 체크 (demo_outcomes) — 본인이 신청한 강의만 서버가 받아 준다 (RLS)
const OUTCOME_TABLE = 'demo_outcomes';

// 내 완성 체크 [{ course_id }]
export async function fetchMyOutcomes() {
  const client = await getServerClient();
  const { data, error } = await client.from(OUTCOME_TABLE).select('course_id');
  if (error) throw error;
  return data;
}

export async function saveOutcome(courseId) {
  const client = await getServerClient();
  const { error } = await client
    .from(OUTCOME_TABLE)
    .upsert(toEnrollmentRows([courseId]), { onConflict: 'user_id,course_id', ignoreDuplicates: true });
  if (error) throw error;
}

// 체크 취소 — 강의 id로만 지운다. 다른 사람의 행은 RLS 때문에 지워지지 않는다
export async function removeOutcome(courseId) {
  const client = await getServerClient();
  const { error } = await client.from(OUTCOME_TABLE).delete().eq('course_id', courseId);
  if (error) throw error;
}

// 데모 수강 취소 — 완성 체크를 먼저 지우고 신청 기록을 지운다 (본인 행만, RLS)
// 실제로 지워진 행이 없으면(삭제 권한 SQL 적용 전 등) 오류를 던진다 → 화면은 기록을 그대로 둔다
export async function cancelDemoEnrollment(courseId) {
  const client = await getServerClient();
  const outcome = await client.from(OUTCOME_TABLE).delete().eq('course_id', courseId);
  if (outcome.error) throw outcome.error;
  const { data, error } = await client.from(TABLE).delete().eq('course_id', courseId).select('course_id');
  if (error) throw error;
  if (!data?.length) throw new Error('not_canceled');
}

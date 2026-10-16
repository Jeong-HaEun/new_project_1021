// 내 강의실 — 서버에 저장한 데모 수강 신청 기록을 화면용으로 정리하는 순수 함수 (SPEC.md 5절)
// 데모 수강 신청은 실제 구매가 아니다. 이 기록으로 유료 콘텐츠 권한을 주지 않는다

// 화면 상태: 'unavailable'(서버 연결 전) | 'loading' | 'signed-out' | 'error' | 'empty' | 'list'
// user: undefined(확인 중) | null(로그아웃) | 사용자. status: 기록 조회 상태 'loading' | 'error' | 'ready'
export function getClassroomState({ configured, user, status, enrollments }) {
  if (!configured) return 'unavailable';
  if (user === undefined) return status === 'error' ? 'error' : 'loading'; // 로그인 확인 실패 ≠ 로그아웃
  if (user === null) return 'signed-out';
  if (status === 'loading') return 'loading';
  if (status === 'error') return 'error';
  return enrollments.length > 0 ? 'list' : 'empty';
}

// 서버 응답 [{ course_id, enrolled_at }] → [{ course, enrolledAt }] 최근 신청 순
// 없는 강의·깨진 값은 버리고, 같은 강의는 한 번만 남긴다
export function normalizeEnrollments(rows, courses) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  return rows
    .filter((item) => item && typeof item.course_id === 'string' && typeof item.enrolled_at === 'string')
    .sort((a, b) => b.enrolled_at.localeCompare(a.enrolled_at))
    .reduce((list, item) => {
      const course = courses.find((candidate) => candidate.id === item.course_id);
      if (!course || seen.has(course.id)) return list;
      seen.add(course.id);
      return [...list, { course, enrolledAt: item.enrolled_at }];
    }, []);
}

// 서버로 보낼 값 — 강의 id만. 사용자 id는 서버가 로그인 정보(auth.uid())로 채우고 RLS가 검증한다
export function toEnrollmentRows(courseIds) {
  return courseIds.map((id) => ({ course_id: id }));
}

// 계정의 신청 기록 → 구매 기록 모양 [{ courseId, purchasedAt }] (수강 여부 판단에만 쓴다. 브라우저에 저장하지 않음)
export function toPurchaseRecords(enrollments) {
  return enrollments.map(({ course, enrolledAt }) => ({ courseId: course.id, purchasedAt: enrolledAt }));
}

// 브라우저 기록 + 계정 기록 — 같은 강의는 브라우저 기록 하나만 남긴다 (같은 계정이면 어느 기기에서나 같은 수강 상태)
export function mergePurchases(local, account) {
  return [...local, ...account.filter((record) => !local.some((item) => item.courseId === record.courseId))];
}

// 서버의 결과물 완성 체크 [{ course_id }] → 강의 id 배열 (아는 강의만, 한 번씩)
export function normalizeOutcomeRows(rows, courses) {
  if (!Array.isArray(rows)) return [];
  const ids = rows.map((item) => item?.course_id).filter((id) => courses.some((course) => course.id === id));
  return [...new Set(ids)];
}

// 브라우저 체크 + 계정 체크 (중복 없이)
export function mergeOutcomes(local, account) {
  return [...new Set([...local, ...account])];
}

// 완성 체크를 어디에 저장할지 — 계정에 신청한 강의는 서버(account), 이 브라우저에서만 산 강의는 브라우저(local)
export function getOutcomeTarget(courseId, accountPurchases) {
  return accountPurchases.some((record) => record.courseId === courseId) ? 'account' : 'local';
}

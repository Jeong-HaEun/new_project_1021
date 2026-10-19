// 강의 자료 규칙 — 파일 검사·저장 경로·받기 상태·목록 정리 (SPEC.md '강의 자료')
// 실제로 막는 건 서버다 (supabase/migrations/20261019050000_hanclass_materials.sql — 올리기는 운영자만, 받기는 공개 범위대로)
// ⚠ 지금 '결제'는 데모라 결제 후 자료도 데모 수강 신청만 하면 받는다 → 가상 실습 자료만 올린다 (실제 유료 파일 금지)

export const MATERIAL_BUCKET = 'hanclass-materials';
export const MAX_MATERIAL_BYTES = 50 * 1024 * 1024; // Supabase 무료 플랜 파일 1개 한도
const EXTENSIONS = ['xlsx', 'xls', 'csv', 'pptx', 'docx', 'pdf', 'zip'];
export const MATERIAL_ACCEPT = EXTENSIONS.map((ext) => `.${ext}`).join(',');

// 공개 범위 — free: 결제 전(로그인한 회원), enrolled: 결제 후(그 강의 데모 수강 신청자)
export const MATERIAL_ACCESS = {
  free: { label: '결제 전 공개', hint: '로그인하면 누구나 받아요' },
  enrolled: { label: '결제 후 공개', hint: '수강 신청한 회원만 받아요' },
};

// 파일 → { ok: true, ext } | { ok: false, reason: 'required' | 'type' | 'too-big' }
// 형식은 확장자로 본다 (브라우저마다 CSV·엑셀의 file.type이 달라서)
export function checkMaterialFile(file) {
  if (!file || !file.size) return { ok: false, reason: 'required' };
  const ext = /\.([a-z0-9]+)$/i.exec(file.name ?? '')?.[1]?.toLowerCase();
  if (!EXTENSIONS.includes(ext)) return { ok: false, reason: 'type' };
  if (file.size > MAX_MATERIAL_BYTES) return { ok: false, reason: 'too-big' };
  return { ok: true, ext };
}

export const MATERIAL_PROBLEMS = {
  required: '올릴 파일을 골라 주세요.',
  type: '엑셀(xlsx·xls)·CSV·PPT(pptx)·워드(docx)·PDF·ZIP만 올릴 수 있어요.',
  'too-big': '파일 1개는 50MB까지 올릴 수 있어요.',
  course: '강의를 골라 주세요.',
  title: '자료 이름은 2~40자로 적어 주세요.',
};

export function validateMaterialTitle(value) {
  const title = (value ?? '').trim();
  return title.length >= 2 && title.length <= 40 ? { ok: true, title } : { ok: false };
}

// 원래 파일 이름(개인정보가 들어 있을 수 있음)은 저장 경로에 쓰지 않는다
export function materialPath(courseId, ext, id) {
  return `${courseId}/${id}.${ext}`;
}

// 받을 때 파일 이름 — 자료 이름 + 원래 확장자
export function downloadName({ title, filePath }) {
  const ext = filePath.split('.').pop();
  return `${title.replace(/[\\/:*?"<>|]/g, '_')}.${ext}`;
}

// 'download' | 'login'(로그아웃) | 'locked'(결제 후 자료인데 신청 안 함). 화면 표시용 — 실제 권한은 서버가 확인
export function materialState(material, user, enrolledIds) {
  if (!user) return 'login';
  if (material.access === 'free' || enrolledIds.has(material.courseId)) return 'download';
  return 'locked';
}

// 서버 행 → 화면용. 모르는 강의·공개 범위는 뺀다. 강의 순, 같은 강의는 올린 순
export function normalizeMaterials(rows, courses) {
  if (!Array.isArray(rows)) return [];
  const order = courses.map((course) => course.id);
  return rows
    .filter((row) => order.includes(row?.course_id) && MATERIAL_ACCESS[row.access] && typeof row.file_path === 'string')
    .map((row) => ({
      id: row.id, courseId: row.course_id, courseTitle: courses.find((course) => course.id === row.course_id).title,
      title: row.title, filePath: row.file_path, size: Number(row.size) || 0, access: row.access, createdAt: row.created_at,
    }))
    .sort((a, b) => order.indexOf(a.courseId) - order.indexOf(b.courseId) || String(a.createdAt).localeCompare(String(b.createdAt)));
}

// 서버 오류 → 'not-ready'(SQL 적용 전) | 'not-allowed' | 'too-big' | 'unknown'
export function materialProblem(error) {
  const message = `${error?.message ?? ''} ${error?.error ?? ''}`;
  const status = Number(error?.statusCode ?? error?.status);
  if (['42P01', 'PGRST205'].includes(error?.code) || /bucket not found|does not exist|could not find the table/i.test(message)) return 'not-ready';
  if (status === 413 || /exceeded the maximum allowed size|too large/i.test(message)) return 'too-big';
  if (error?.code === '42501' || status === 403 || /row-level security|unauthorized/i.test(message)) return 'not-allowed';
  return 'unknown';
}

// 강의별 필터에 보여 줄 강의 — 신청한 강의가 둘 이상이면 모두 (자료가 없는 강의는 고르면 '준비 중'), 하나면 필터 없이
export function filterCourses(courses) {
  return courses.length >= 2 ? courses : [];
}

// 고른 필터('all' 또는 강의 id)의 자료
export function filterMaterials(materials, filter) {
  return filter === 'all' ? materials : materials.filter((item) => item.courseId === filter);
}

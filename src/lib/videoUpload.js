// 강의 영상 올리기 규칙 — 파일 검사·저장 경로·목록 정리 (SPEC.md '강의 영상 올리기')
// 실제로 막는 건 서버다 (supabase/migrations/20261019020000_hanclass_videos.sql — 운영자만, 50MB, 영상 형식만)

export const VIDEO_BUCKET = 'hanclass-videos';
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // Supabase 무료 플랜 파일 1개 한도
const EXTENSIONS = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
export const VIDEO_ACCEPT = Object.keys(EXTENSIONS).join(',');

// 파일 → { ok: true, ext } | { ok: false, reason: 'required' | 'type' | 'too-big' }
export function checkVideoFile(file) {
  if (!file || !file.size) return { ok: false, reason: 'required' };
  const ext = EXTENSIONS[file.type];
  if (!ext) return { ok: false, reason: 'type' };
  if (file.size > MAX_VIDEO_BYTES) return { ok: false, reason: 'too-big' };
  return { ok: true, ext };
}

export const VIDEO_PROBLEMS = {
  required: '올릴 영상 파일을 골라 주세요.',
  type: 'mp4·webm·mov 영상만 올릴 수 있어요.',
  'too-big': '파일 1개는 50MB까지 올릴 수 있어요. HandBrake 등으로 720p로 줄여 주세요.',
  lesson: '강의와 차시를 골라 주세요.',
};

// 같은 차시는 한 파일 — 다시 올리면 덮어쓴다
export function videoPath(courseId, lessonId, ext) {
  return `${courseId}/${lessonId}.${ext}`;
}

// 강의·차시 고르기 목록 — 제작 예정 강의도 미리 올려 볼 수 있게 모두
export function lessonOptions(courses) {
  return courses.flatMap((course) =>
    (course.lessons ?? []).map((lesson, index) => ({
      value: `${course.id}/${lesson.id}`,
      label: `${course.title} · ${index + 1}차시 ${lesson.title}`,
    })));
}

// 서버 목록(강의 폴더별) → [{ path, title, size, updatedAt }] 강의·차시 순
export function normalizeVideos(folders, courses) {
  return folders
    .flatMap(({ courseId, files }) => (Array.isArray(files) ? files : [])
      .filter((file) => file && typeof file.name === 'string' && file.id)
      .map((file) => {
        const course = courses.find((item) => item.id === courseId);
        const lessonId = file.name.replace(/\.[^.]+$/, '');
        const index = course?.lessons?.findIndex((lesson) => lesson.id === lessonId) ?? -1;
        const lesson = index >= 0 ? `${index + 1}차시 ${course.lessons[index].title}` : file.name;
        return { path: `${courseId}/${file.name}`, title: `${course?.title ?? courseId} · ${lesson}`, size: Number(file.metadata?.size) || 0, updatedAt: file.updated_at ?? file.created_at ?? null };
      }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

// 수강 화면용: 한 강의 폴더 목록 → Map(차시id → 경로). 차시에 없는 파일은 뺀다
export function lessonVideoPaths(course, files) {
  const lessonIds = new Set(course.lessons.map((lesson) => lesson.id));
  const paths = new Map();
  (Array.isArray(files) ? files : []).forEach((file) => {
    const lessonId = typeof file?.name === 'string' && file.id ? file.name.replace(/\.[^.]+$/, '') : null;
    if (lessonIds.has(lessonId)) paths.set(lessonId, `${course.id}/${file.name}`);
  });
  return paths;
}

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

// 서버 오류 → 'not-ready'(저장소 SQL 적용 전) | 'not-admin' | 'too-big' | 'unknown'
export function videoProblem(error) {
  const message = `${error?.message ?? ''} ${error?.error ?? ''}`;
  const status = Number(error?.statusCode ?? error?.status);
  if (/bucket not found/i.test(message)) return 'not-ready';
  if (status === 413 || /exceeded the maximum allowed size|too large/i.test(message)) return 'too-big';
  if (status === 403 || /row-level security|unauthorized/i.test(message)) return 'not-admin';
  return 'unknown';
}

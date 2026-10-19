// 커뮤니티 화면용 정리 — 주소 읽기, 화면 상태, 서버 응답 정리·정렬, 날짜 표시 (SPEC.md '커뮤니티')
import { CATEGORIES, LIMITS } from './community.js';

const toId = (value) => (/^[1-9]\d{0,15}$/.test(value ?? '') ? Number(value) : null);

// community.html?post=12 | ?write=1 | ?edit=12 | ?category=question
export function getCommunityRoute(search) {
  const params = new URLSearchParams(search);
  const postId = toId(params.get('post'));
  if (postId) return { name: 'post', id: postId };
  const category = CATEGORIES.some((item) => item.id === params.get('category')) ? params.get('category') : null;
  // 글쓰기: 목록에서 보던 분류를 기본 분류로 (?write=1&category=question)
  if (params.get('write') === '1') return category ? { name: 'write', category } : { name: 'write' };
  const editId = toId(params.get('edit'));
  if (editId) return { name: 'edit', id: editId };
  return { name: 'list', category: category ?? 'all' };
}

// 로그인 뒤 돌아갈 주소 — 저장해 둔 값을 그대로 쓰지 않고, 알아본 화면만 다시 만든다 (다른 사이트·이상한 값 차단)
export function safeReturnSearch(search) {
  const route = getCommunityRoute(typeof search === 'string' ? search : '');
  if (route.name === 'post' || route.name === 'edit') return `?${route.name}=${route.id}`;
  if (route.name === 'write') return route.category ? `?write=1&category=${route.category}` : '?write=1';
  return route.category === 'all' ? '' : `?category=${route.category}`;
}

// 'unavailable'(서버 연결 전) | 'loading' | 'error' | 'ready'
export function getCommunityState({ configured, status }) {
  if (!configured) return 'unavailable';
  return status === 'loading' || status === 'error' ? status : 'ready';
}

const isText = (value) => typeof value === 'string';
const EDIT_GAP_MS = 60 * 1000;

// 서버 행 → 화면용 글. 깨진 행은 null
export function normalizePost(row) {
  if (!row || typeof row.id !== 'number' || ![row.title, row.body, row.author_name, row.created_at].every(isText)) return null;
  if (!CATEGORIES.some((item) => item.id === row.category)) return null;
  const updated = isText(row.updated_at) ? Date.parse(row.updated_at) : NaN;
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    title: row.title,
    body: row.body,
    authorName: row.author_name,
    courseId: isText(row.course_id) ? row.course_id : null,
    createdAt: row.created_at,
    edited: updated - Date.parse(row.created_at) > EDIT_GAP_MS,
    commentCount: Number(row.community_comments?.[0]?.count ?? 0) || 0,
    hidden: row.hidden === true, // 신고가 쌓여 숨긴 글 (글쓴이 본인에게만 내려온다)
    official: row.is_official === true, // 운영자(취메) 글 — DB가 채운다
  };
}

// 목록은 최신순
export function normalizePosts(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizePost).filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// 댓글은 오래된 순 (대화 순서)
export function normalizeComments(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && typeof row.id === 'number' && [row.body, row.author_name, row.created_at].every(isText))
    .map((row) => ({ id: row.id, userId: row.user_id, body: row.body, authorName: row.author_name, createdAt: row.created_at, official: row.is_official === true }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// 입력 문제 → 안내 문구. field: title | body | comment | authorName | courseId | category
const FIELD_NAMES = { title: ['제목을', '제목은'], body: ['내용을', '내용은'], comment: ['댓글을', '댓글은'], authorName: ['닉네임을', '닉네임은'] };
const LIMIT_KEY = { title: 'title', body: 'body', comment: 'comment', authorName: 'authorName' };

export function problemText({ field, reason }) {
  if (reason === 'phone') return '전화번호처럼 보이는 내용이 있어요. 개인정보는 지우고 올려 주세요.';
  if (reason === 'email') return '이메일 주소처럼 보이는 내용이 있어요. 개인정보는 지우고 올려 주세요.';
  if (reason === 'banned') return '합격·취업을 약속하는 과장 표현은 쓸 수 없어요.';
  if (field === 'courseId') return reason === 'required' ? '결과물을 만든 강의를 골라 주세요.' : '강의를 다시 골라 주세요.';
  if (field === 'category') return '분류를 다시 골라 주세요.';
  const [object, subject] = FIELD_NAMES[field] ?? ['내용을', '내용은'];
  const limit = LIMITS[LIMIT_KEY[field] ?? 'body'];
  if (reason === 'too-short') return `${subject} ${limit.min}자 이상 써 주세요.`;
  if (reason === 'too-long') return `${subject} ${limit.max}자까지 쓸 수 있어요.`;
  return `${object} 써 주세요.`;
}

// 방금 전 / N분 전 / N시간 전 / 2026. 10. 16.
export function formatPostDate(iso, now = new Date()) {
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
}

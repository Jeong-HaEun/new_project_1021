// 커뮤니티 글·댓글 규칙 — 입력 검사, 개인정보·과장 표현 막기, 본인 확인 (SPEC.md '커뮤니티')
// 같은 규칙을 DB에서도 한 번 더 검사한다 (supabase/migrations/20261018000000_community.sql — 길이·분류)
import { BANNED_PHRASES } from '../data/policy.js';

// 결과물 공유가 먼저 — 한클래스 핵심 "강의 1편 = 결과물 1개"
export const CATEGORIES = [
  { id: 'outcome', label: '결과물 공유', hint: '강의에서 만든 결과물과 만들며 배운 점을 나눠요' },
  { id: 'question', label: '질문', hint: '막힌 부분을 물어봐요' },
  { id: 'free', label: '자유', hint: '취업 준비·실무 이야기를 나눠요' },
];

export const LIMITS = {
  title: { min: 2, max: 60 },
  body: { min: 5, max: 2000 },
  comment: { min: 1, max: 500 },
  authorName: { min: 1, max: 12 },
};

// 전화번호(휴대폰·지역번호, +82 포함)·이메일. 날짜(2026-10-19)·가격처럼 0이나 +82로 시작하지 않는 숫자는 걸리지 않는다
const PHONE = /(?<!\d)(?:\+82[\s-]?|0)(?:1[016789]|[2-6]\d?)[\s.-]?\d{3,4}[\s.-]?\d{4}(?!\d)/;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

export function findPersonalInfo(text) {
  if (EMAIL.test(text)) return 'email';
  if (PHONE.test(text)) return 'phone';
  return null;
}

// 한 칸 검사 → 문제 이유 또는 null
function checkText(value, { min, max }) {
  if (value.length === 0) return 'required';
  if (value.length < min) return 'too-short';
  if (value.length > max) return 'too-long';
  if (BANNED_PHRASES.some((phrase) => value.includes(phrase))) return 'banned';
  return findPersonalInfo(value);
}

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

// 칸 목록을 차례로 검사해 첫 문제를 돌려준다
function firstProblem(checks) {
  for (const [field, value, limit] of checks) {
    const reason = checkText(value, limit);
    if (reason) return { ok: false, field, reason };
  }
  return null;
}

// 글 → { ok: true, fields(서버로 보낼 값) } | { ok: false, field, reason }
// 사용자 id는 보내지 않는다 (서버가 로그인 정보로 채우고 RLS가 검증)
// isAdmin: 운영자만 공지 고정 값(is_pinned)을 보낸다 — 고정 SQL 적용 전 일반 회원 글쓰기가 깨지지 않게. 실제로 막는 건 DB (20261020000000)
export function validatePost(input, courses, { isAdmin = false } = {}) {
  const category = clean(input.category);
  if (!CATEGORIES.some((item) => item.id === category)) return { ok: false, field: 'category', reason: 'invalid' };
  const title = clean(input.title);
  const body = clean(input.body);
  const authorName = clean(input.authorName);
  const problem = firstProblem([
    ['title', title, LIMITS.title],
    ['body', body, LIMITS.body],
    ['authorName', authorName, LIMITS.authorName],
  ]);
  if (problem) return problem;

  const courseId = clean(input.courseId);
  if (!courseId && category === 'outcome') return { ok: false, field: 'courseId', reason: 'required' };
  if (courseId && !courses.some((course) => course.id === courseId)) return { ok: false, field: 'courseId', reason: 'invalid' };

  const fields = { category, title, body, author_name: authorName, course_id: courseId || null };
  if (isAdmin) fields.is_pinned = input.pinned === 'on';
  return { ok: true, fields };
}

export function validateComment(input) {
  const body = clean(input.body);
  const authorName = clean(input.authorName);
  const problem = firstProblem([
    ['body', body, LIMITS.comment],
    ['authorName', authorName, LIMITS.authorName],
  ]);
  return problem ?? { ok: true, fields: { body, author_name: authorName } };
}

// 수정·삭제 버튼을 보여 줄지 — 화면 표시용. 실제 권한은 DB의 RLS가 막는다
export function canManage(item, user) {
  return Boolean(user?.id) && item?.userId === user.id;
}

// 댓글 쓰기 폼을 보여 줄지 — 질문 글은 운영자와 질문한 본인만, 그 밖은 로그인한 누구나 (실제로 막는 건 DB: 20261019040000)
export function canComment(post, user, isAdmin) {
  if (!user?.id) return false;
  return post?.category !== 'question' || post.userId === user.id || Boolean(isAdmin);
}

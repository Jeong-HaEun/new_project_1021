// 커뮤니티 글·댓글 규칙 (SPEC.md '커뮤니티') — 입력 검사, 개인정보·과장 표현 막기, 본인 확인
import { describe, it, expect } from 'vitest';
import {
  CATEGORIES, LIMITS, canComment, canManage, findPersonalInfo, validateComment, validatePost,
} from '../src/lib/community.js';

const COURSES = [{ id: 'c002', title: 'XLOOKUP' }, { id: 'c003', title: '보고서' }];
const goodPost = { category: 'question', title: '질문 있어요', body: 'XLOOKUP에서 값이 안 나와요.', authorName: '엑셀초보', courseId: '' };

describe('분류', () => {
  it('결과물 공유·질문·자유 3가지, 결과물 공유가 먼저', () => {
    expect(CATEGORIES.map((item) => item.id)).toEqual(['outcome', 'question', 'free']);
    expect(CATEGORIES[0].label).toBe('결과물 공유');
  });
});

describe('개인정보 찾기', () => {
  it.each(['010-1234-5678', '01012345678', '010 1234 5678', '+82 10-1234-5678', '02-123-4567'])('전화번호 %s', (text) => {
    expect(findPersonalInfo(`연락 주세요 ${text}`)).toBe('phone');
  });

  it.each(['abc@naver.com', 'my.name+1@example.co.kr'])('이메일 %s', (text) => {
    expect(findPersonalInfo(`메일: ${text}`)).toBe('email');
  });

  it('일반 숫자·날짜·가격은 개인정보가 아니다', () => {
    expect(findPersonalInfo('2026-10-19에 1,000원 강의 3차시 들었어요. 클릭률 2.5%')).toBeNull();
    expect(findPersonalInfo('')).toBeNull();
  });
});

describe('글 검사', () => {
  it('정상 글은 앞뒤 공백을 지우고 통과', () => {
    const result = validatePost({ ...goodPost, title: '  질문 있어요  ' }, COURSES);
    expect(result.ok).toBe(true);
    expect(result.fields).toEqual({ category: 'question', title: '질문 있어요', body: goodPost.body, author_name: '엑셀초보', course_id: null });
  });

  it('모르는 분류는 거절', () => {
    expect(validatePost({ ...goodPost, category: 'ad' }, COURSES)).toMatchObject({ ok: false, field: 'category', reason: 'invalid' });
  });

  it.each([
    ['title', '', 'required'],
    ['title', '가', 'too-short'],
    ['title', '가'.repeat(LIMITS.title.max + 1), 'too-long'],
    ['body', '    ', 'required'],
    ['body', '가'.repeat(LIMITS.body.max + 1), 'too-long'],
    ['authorName', '', 'required'],
    ['authorName', '가'.repeat(LIMITS.authorName.max + 1), 'too-long'],
  ])('%s=%j → %s', (key, value, reason) => {
    const field = key === 'authorName' ? 'authorName' : key;
    expect(validatePost({ ...goodPost, [key]: value }, COURSES)).toMatchObject({ ok: false, field, reason });
  });

  it('제목·본문·닉네임에 전화번호·이메일이 있으면 거절', () => {
    expect(validatePost({ ...goodPost, body: '010-1234-5678로 연락' }, COURSES)).toMatchObject({ ok: false, field: 'body', reason: 'phone' });
    expect(validatePost({ ...goodPost, title: 'a@b.com 연락' }, COURSES)).toMatchObject({ ok: false, field: 'title', reason: 'email' });
    expect(validatePost({ ...goodPost, authorName: 'me@x.kr' }, COURSES)).toMatchObject({ ok: false, field: 'authorName', reason: 'email' });
  });

  it('과장 표현(BANNED_PHRASES)이 있으면 거절', () => {
    expect(validatePost({ ...goodPost, body: '이거 들으면 취업 보장이에요' }, COURSES)).toMatchObject({ ok: false, field: 'body', reason: 'banned' });
  });

  it('결과물 공유는 강의를 고르면 그 강의와 연결, 모르는 강의는 거절', () => {
    const ok = validatePost({ ...goodPost, category: 'outcome', courseId: 'c002' }, COURSES);
    expect(ok.fields.course_id).toBe('c002');
    expect(validatePost({ ...goodPost, category: 'outcome', courseId: 'c999' }, COURSES)).toMatchObject({ ok: false, field: 'courseId', reason: 'invalid' });
  });

  it('결과물 공유는 강의 선택이 필수', () => {
    expect(validatePost({ ...goodPost, category: 'outcome', courseId: '' }, COURSES)).toMatchObject({ ok: false, field: 'courseId', reason: 'required' });
  });

  it('결과물 공유가 아니면 강의 연결은 선택 (고르면 남긴다)', () => {
    expect(validatePost({ ...goodPost, courseId: 'c003' }, COURSES).fields.course_id).toBe('c003');
  });
});

describe('댓글 검사', () => {
  it('정상 댓글', () => {
    expect(validateComment({ body: ' 저도 궁금해요 ', authorName: '수강생' })).toEqual({ ok: true, fields: { body: '저도 궁금해요', author_name: '수강생' } });
  });

  it('비었거나 너무 길면 거절', () => {
    expect(validateComment({ body: '', authorName: '수강생' })).toMatchObject({ ok: false, field: 'body', reason: 'required' });
    expect(validateComment({ body: '가'.repeat(LIMITS.comment.max + 1), authorName: '수강생' })).toMatchObject({ ok: false, reason: 'too-long' });
  });

  it('개인정보·과장 표현 거절', () => {
    expect(validateComment({ body: '01012345678', authorName: '수강생' })).toMatchObject({ ok: false, reason: 'phone' });
    expect(validateComment({ body: '합격 보장!', authorName: '수강생' })).toMatchObject({ ok: false, reason: 'banned' });
  });
});

describe('본인 확인 (수정·삭제 버튼)', () => {
  const post = { userId: 'u1' };
  it('글쓴이 본인만 true', () => {
    expect(canManage(post, { id: 'u1' })).toBe(true);
    expect(canManage(post, { id: 'u2' })).toBe(false);
  });
  it('로그아웃·확인 중이면 false', () => {
    expect(canManage(post, null)).toBe(false);
    expect(canManage(post, undefined)).toBe(false);
    expect(canManage({ userId: undefined }, { id: undefined })).toBe(false);
  });
});

describe('질문 글 답변 (canComment)', () => {
  const question = { category: 'question', userId: 'asker' };
  it('질문 글은 운영자와 질문한 본인만 댓글을 단다', () => {
    expect(canComment(question, { id: 'asker' }, false)).toBe(true);
    expect(canComment(question, { id: 'staff' }, true)).toBe(true);
    expect(canComment(question, { id: 'other' }, false)).toBe(false);
  });
  it('결과물 공유·자유 글은 로그인한 누구나', () => {
    expect(canComment({ category: 'free', userId: 'a' }, { id: 'b' }, false)).toBe(true);
    expect(canComment({ category: 'outcome', userId: 'a' }, { id: 'b' }, false)).toBe(true);
  });
  it('로그아웃·확인 중이면 false', () => {
    expect(canComment(question, null, true)).toBe(false);
    expect(canComment({ category: 'free' }, undefined, false)).toBe(false);
  });
});

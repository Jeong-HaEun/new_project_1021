// 커뮤니티 화면용 정리 — 주소 읽기, 화면 상태, 서버 응답 정리·정렬, 날짜 표시 (SPEC.md '커뮤니티')
import { describe, it, expect } from 'vitest';
import {
  formatPostDate, getCommunityRoute, getCommunityState, normalizeComments, normalizePost, normalizePosts, problemText, safeReturnSearch,
} from '../src/lib/communityView.js';

describe('주소 → 화면', () => {
  it('기본은 전체 목록', () => {
    expect(getCommunityRoute('')).toEqual({ name: 'list', category: 'all' });
  });
  it('분류 목록, 모르는 분류는 전체', () => {
    expect(getCommunityRoute('?category=question')).toEqual({ name: 'list', category: 'question' });
    expect(getCommunityRoute('?category=hack')).toEqual({ name: 'list', category: 'all' });
  });
  it('글 보기·글쓰기·수정', () => {
    expect(getCommunityRoute('?post=12')).toEqual({ name: 'post', id: 12 });
    expect(getCommunityRoute('?write=1')).toEqual({ name: 'write' });
    expect(getCommunityRoute('?edit=7')).toEqual({ name: 'edit', id: 7 });
  });
  it('글 번호가 숫자가 아니면 목록', () => {
    expect(getCommunityRoute('?post=abc')).toEqual({ name: 'list', category: 'all' });
    expect(getCommunityRoute('?edit=-3')).toEqual({ name: 'list', category: 'all' });
  });
});

describe('로그인 뒤 돌아갈 화면', () => {
  it('커뮤니티 안의 글쓰기·글·수정·분류 주소만 돌려준다', () => {
    expect(safeReturnSearch('?write=1')).toBe('?write=1');
    expect(safeReturnSearch('?post=12')).toBe('?post=12');
    expect(safeReturnSearch('?edit=3')).toBe('?edit=3');
    expect(safeReturnSearch('?category=outcome')).toBe('?category=outcome');
  });
  it('목록 기본·이상한 값은 빈 문자열(목록)', () => {
    expect(safeReturnSearch('')).toBe('');
    expect(safeReturnSearch('?post=abc')).toBe('');
    expect(safeReturnSearch('//evil.example')).toBe('');
    expect(safeReturnSearch('?write=1&next=https://evil.example')).toBe('?write=1');
    expect(safeReturnSearch(null)).toBe('');
  });
});

describe('화면 상태', () => {
  it('서버 연결 전', () => {
    expect(getCommunityState({ configured: false, status: 'ready' })).toBe('unavailable');
  });
  it('불러오는 중·실패·준비', () => {
    expect(getCommunityState({ configured: true, status: 'loading' })).toBe('loading');
    expect(getCommunityState({ configured: true, status: 'error' })).toBe('error');
    expect(getCommunityState({ configured: true, status: 'ready' })).toBe('ready');
  });
});

const row = (over = {}) => ({
  id: 1, user_id: 'u1', category: 'free', title: '제목', body: '본문입니다', author_name: '닉', course_id: null,
  created_at: '2026-10-18T01:00:00Z', updated_at: '2026-10-18T01:00:00Z', community_comments: [{ count: 2 }], ...over,
});

describe('글 정리', () => {
  it('서버 행 → 화면용 글', () => {
    expect(normalizePost(row())).toEqual({
      id: 1, userId: 'u1', category: 'free', title: '제목', body: '본문입니다', authorName: '닉', courseId: null,
      createdAt: '2026-10-18T01:00:00Z', edited: false, commentCount: 2,
    });
  });
  it('수정 시각이 1분 넘게 늦으면 수정됨', () => {
    expect(normalizePost(row({ updated_at: '2026-10-18T02:00:00Z' })).edited).toBe(true);
  });
  it('깨진 행은 null', () => {
    expect(normalizePost(null)).toBeNull();
    expect(normalizePost(row({ title: 3 }))).toBeNull();
    expect(normalizePost(row({ category: 'ad' }))).toBeNull();
  });
  it('목록은 최신순, 깨진 행은 버린다, 댓글 수가 없으면 0', () => {
    const list = normalizePosts([
      row({ id: 1, created_at: '2026-10-17T00:00:00Z' }),
      { broken: true },
      row({ id: 2, created_at: '2026-10-18T00:00:00Z', community_comments: undefined }),
    ]);
    expect(list.map((post) => post.id)).toEqual([2, 1]);
    expect(list[0].commentCount).toBe(0);
    expect(normalizePosts('x')).toEqual([]);
  });
});

describe('댓글 정리', () => {
  it('오래된 순(대화 순서), 깨진 행 버림', () => {
    const list = normalizeComments([
      { id: 2, user_id: 'u2', body: '두 번째', author_name: 'b', created_at: '2026-10-18T02:00:00Z' },
      { id: 1, user_id: 'u1', body: '첫 번째', author_name: 'a', created_at: '2026-10-18T01:00:00Z' },
      { id: 3, body: 5 },
    ]);
    expect(list).toEqual([
      { id: 1, userId: 'u1', body: '첫 번째', authorName: 'a', createdAt: '2026-10-18T01:00:00Z' },
      { id: 2, userId: 'u2', body: '두 번째', authorName: 'b', createdAt: '2026-10-18T02:00:00Z' },
    ]);
  });
});

describe('입력 문제 안내 문구', () => {
  it('칸 이름과 이유를 쉬운 문장으로', () => {
    expect(problemText({ field: 'title', reason: 'required' })).toBe('제목을 써 주세요.');
    expect(problemText({ field: 'title', reason: 'too-short' })).toBe('제목은 2자 이상 써 주세요.');
    expect(problemText({ field: 'body', reason: 'too-long' })).toBe('내용은 2000자까지 쓸 수 있어요.');
    expect(problemText({ field: 'comment', reason: 'too-long' })).toBe('댓글은 500자까지 쓸 수 있어요.');
    expect(problemText({ field: 'courseId', reason: 'required' })).toBe('결과물을 만든 강의를 골라 주세요.');
  });
  it('개인정보·과장 표현은 이유를 알려 준다', () => {
    expect(problemText({ field: 'body', reason: 'phone' })).toContain('전화번호');
    expect(problemText({ field: 'authorName', reason: 'email' })).toContain('이메일');
    expect(problemText({ field: 'body', reason: 'banned' })).toContain('과장 표현');
  });
});

describe('날짜 표시', () => {
  const now = new Date('2026-10-18T12:00:00+09:00');
  it('1분 안은 방금 전, 1시간 안은 N분 전, 하루 안은 N시간 전', () => {
    expect(formatPostDate('2026-10-18T11:59:30+09:00', now)).toBe('방금 전');
    expect(formatPostDate('2026-10-18T11:45:00+09:00', now)).toBe('15분 전');
    expect(formatPostDate('2026-10-18T09:00:00+09:00', now)).toBe('3시간 전');
  });
  it('하루가 넘으면 한국 날짜', () => {
    expect(formatPostDate('2026-10-16T09:00:00+09:00', now)).toBe('2026. 10. 16.');
  });
});

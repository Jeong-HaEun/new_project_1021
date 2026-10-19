// 커뮤니티 보호 규칙 — 도배 방지·서버 거절 이유·신고 (SPEC.md '커뮤니티 보호')
import { describe, it, expect } from 'vitest';
import {
  RATE_LIMITS, REPORT_HIDE_COUNT, REPORT_REASONS, getReportState, guardText, serverProblem, validateReport,
} from '../src/lib/communityGuard.js';

describe('도배 방지 기준', () => {
  it('10분에 글 5개, 댓글 20개까지', () => {
    expect(RATE_LIMITS.post).toEqual({ count: 5, minutes: 10 });
    expect(RATE_LIMITS.comment).toEqual({ count: 20, minutes: 10 });
  });
  it('신고 3개면 숨김', () => {
    expect(REPORT_HIDE_COUNT).toBe(3);
  });
});

describe('서버가 거절한 이유 읽기', () => {
  it('도배 방지·개인정보는 DB가 보낸 표시로 구분', () => {
    expect(serverProblem({ code: 'P0001', message: 'community_rate_limited' })).toBe('rate-limited');
    expect(serverProblem({ code: 'P0001', message: 'community_personal_info' })).toBe('personal-info');
  });
  it('질문 글에 운영자·질문자가 아닌 댓글은 answer-only', () => {
    expect(serverProblem({ code: 'P0001', message: 'community_answer_only' })).toBe('answer-only');
    expect(guardText('answer-only', 'comment')).toBe('질문 글에는 운영자와 질문한 분만 댓글을 달 수 있어요.');
  });
  it('같은 글 두 번 신고(unique 위반)는 already-reported', () => {
    expect(serverProblem({ code: '23505', message: 'duplicate key value' })).toBe('already-reported');
  });
  it('본인 소유가 아님(화면에서 만든 오류)은 not-owner', () => {
    expect(serverProblem(new Error('not-owner'))).toBe('not-owner');
  });
  it('그 밖은 unknown', () => {
    expect(serverProblem({ code: '500', message: 'boom' })).toBe('unknown');
    expect(serverProblem(null)).toBe('unknown');
  });
});

describe('안내 문구', () => {
  it('도배 방지는 기준을 함께 알려 준다', () => {
    expect(guardText('rate-limited', 'post')).toBe('글은 10분에 5개까지 올릴 수 있어요. 잠시 후 다시 올려 주세요.');
    expect(guardText('rate-limited', 'comment')).toBe('댓글은 10분에 20개까지 올릴 수 있어요. 잠시 후 다시 올려 주세요.');
  });
  it('개인정보·이미 신고·본인 아님·기타', () => {
    expect(guardText('personal-info')).toContain('개인정보');
    expect(guardText('already-reported')).toBe('이미 신고한 글이에요.');
    expect(guardText('not-owner')).toContain('본인');
    expect(guardText('unknown', 'post')).toBe('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
  });
});

describe('신고 이유', () => {
  it('광고·도배 / 개인정보 노출 / 욕설·비방 / 기타', () => {
    expect(REPORT_REASONS.map((item) => item.id)).toEqual(['spam', 'personal', 'abuse', 'etc']);
  });
  it('아는 이유만 통과', () => {
    expect(validateReport('spam')).toEqual({ ok: true, reason: 'spam' });
    expect(validateReport('')).toEqual({ ok: false });
    expect(validateReport('hack')).toEqual({ ok: false });
  });
});

describe('신고 버튼 상태', () => {
  const post = { userId: 'u1' };
  it('로그인 확인 중·로그아웃이면 버튼 없음', () => {
    expect(getReportState({ user: undefined, post, reported: false })).toBe('hidden');
    expect(getReportState({ user: null, post, reported: false })).toBe('hidden');
  });
  it('내 글은 신고할 수 없다', () => {
    expect(getReportState({ user: { id: 'u1' }, post, reported: false })).toBe('hidden');
  });
  it('이미 신고했으면 reported, 아니면 can-report', () => {
    expect(getReportState({ user: { id: 'u2' }, post, reported: true })).toBe('reported');
    expect(getReportState({ user: { id: 'u2' }, post, reported: false })).toBe('can-report');
  });
});

// 운영자 페이지 규칙 — 화면 상태·회원 통계 정리·서버 오류 해석 (SPEC.md '운영자 페이지')
import { describe, it, expect } from 'vitest';
import { adminProblem, completionRate, getAdminState, normalizeOverview, normalizeReported, shortDay } from '../src/lib/adminView.js';
import { serverProblem, guardText } from '../src/lib/communityGuard.js';
import { normalizeComments, normalizePost } from '../src/lib/communityView.js';

const courses = [{ id: 'c002', title: 'XLOOKUP' }, { id: 'c003', title: '마케팅 실습' }];
const user = { id: 'u1' };

describe('getAdminState', () => {
  it('서버 연결 전 → unavailable, 확인 중 → loading, 로그아웃 → signed-out', () => {
    expect(getAdminState({ configured: false, user, role: 'super_admin', status: 'ready' })).toBe('unavailable');
    expect(getAdminState({ configured: true, user: undefined, status: 'ready' })).toBe('loading');
    expect(getAdminState({ configured: true, user, status: 'loading' })).toBe('loading');
    expect(getAdminState({ configured: true, user: null, status: 'ready' })).toBe('signed-out');
  });

  it('운영자 명단에 없으면 not-admin, 있으면 ready', () => {
    expect(getAdminState({ configured: true, user, role: null, status: 'ready' })).toBe('not-admin');
    expect(getAdminState({ configured: true, user, role: 'super_admin', status: 'ready' })).toBe('ready');
  });

  it('DB 적용 전·오류는 그대로', () => {
    expect(getAdminState({ configured: true, user, role: null, status: 'not-ready' })).toBe('not-ready');
    expect(getAdminState({ configured: true, user, role: 'admin', status: 'error' })).toBe('error');
  });
});

describe('adminProblem', () => {
  it('함수가 없으면(운영자 SQL 적용 전) not-ready', () => {
    expect(adminProblem({ code: 'PGRST202', message: 'Could not find the function public.hanclass_admin_role' })).toBe('not-ready');
  });
  it('운영자가 아니면 not-admin, 없는 글이면 not-found, 나머지는 unknown', () => {
    expect(adminProblem({ code: 'P0001', message: 'hanclass_not_admin' })).toBe('not-admin');
    expect(adminProblem({ code: 'P0001', message: 'hanclass_not_found' })).toBe('not-found');
    expect(adminProblem(new Error('network'))).toBe('unknown');
    expect(adminProblem(null)).toBe('unknown');
  });
});

describe('normalizeOverview', () => {
  it('숫자를 정리하고 강의 제목·완성률을 붙여 신청 많은 순으로', () => {
    const view = normalizeOverview({
      members: 3, newMembers7d: '2', activeMembers7d: -1, enrollments: 5,
      byCourse: [{ courseId: 'c003', enrollments: 1, outcomes: 0 }, { courseId: 'c002', enrollments: 4, outcomes: 3 }, { courseId: 7 }],
      newMembersByDay: [{ day: '2026-10-19', count: 2 }, { day: 'bad', count: 1 }],
    }, courses);
    expect(view.members.map((item) => item.value)).toEqual([3, 2, 0]);
    expect(view.activity.find((item) => item.id === 'enrollments').value).toBe(5);
    expect(view.byCourse).toEqual([
      { courseId: 'c002', title: 'XLOOKUP', enrollments: 4, outcomes: 3, rate: 75 },
      { courseId: 'c003', title: '마케팅 실습', enrollments: 1, outcomes: 0, rate: 0 },
    ]);
    expect(view.days).toEqual([{ day: '2026-10-19', count: 2 }]);
  });

  it('깨진 값이 와도 0과 빈 목록으로', () => {
    const view = normalizeOverview(null, courses);
    expect(view.members.every((item) => item.value === 0)).toBe(true);
    expect(view.byCourse).toEqual([]);
    expect(view.days).toEqual([]);
  });

  it('매출·결제라는 이름을 쓰지 않는다 (데모 기록)', () => {
    const labels = [...normalizeOverview({}, courses).members, ...normalizeOverview({}, courses).activity].map((item) => item.label).join(' ');
    expect(labels).not.toMatch(/매출|결제|구매/);
  });
});

describe('completionRate·shortDay', () => {
  it('신청 0이면 null, 완성이 신청보다 많아도 100%를 넘지 않는다', () => {
    expect(completionRate(0, 0)).toBeNull();
    expect(completionRate(2, 5)).toBe(100);
    expect(completionRate(3, 1)).toBe(33);
  });
  it("'2026-10-09' → '10.9'", () => {
    expect(shortDay('2026-10-09')).toBe('10.9');
  });
});

describe('normalizeReported', () => {
  it('신고 사유를 묶고 깨진 행은 버린다', () => {
    const rows = normalizeReported([
      { id: 1, title: '광고', author_name: 'a', hidden: true, report_count: 3, reasons: ['spam', 'spam', 'etc'], created_at: '2026-10-19T00:00:00Z' },
      { id: 'x', title: '깨진 행' },
    ]);
    expect(rows).toEqual([{ id: 1, title: '광고', authorName: 'a', hidden: true, reportCount: 3, reasons: '광고·도배 2 · 기타 1', createdAt: '2026-10-19T00:00:00Z' }]);
    expect(normalizeReported(null)).toEqual([]);
  });
});

describe('운영자 표시(취메)·닉네임', () => {
  const post = { id: 1, category: 'free', title: '안내', body: '이용 안내예요', author_name: '취메', created_at: '2026-10-19T00:00:00Z' };

  it('DB가 채운 is_official만 운영자 표시로 쓴다 (칸이 없으면 false)', () => {
    expect(normalizePost({ ...post, is_official: true }).official).toBe(true);
    expect(normalizePost(post).official).toBe(false);
    expect(normalizeComments([{ id: 1, body: '답변', author_name: '취메', created_at: post.created_at, is_official: true }])[0].official).toBe(true);
  });

  it('운영자처럼 보이는 닉네임을 DB가 거절하면 안내 문구를 보여 준다', () => {
    const problem = serverProblem({ code: 'P0001', message: 'community_reserved_name' });
    expect(problem).toBe('reserved-name');
    expect(guardText(problem)).toContain('닉네임');
  });
});

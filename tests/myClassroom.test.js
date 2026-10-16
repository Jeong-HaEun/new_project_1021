// 내 강의실·서버 데모 수강 기록 — SPEC.md 5절 기준
import { describe, it, expect } from 'vitest';
import {
  getClassroomState,
  getOutcomeTarget,
  mergeOutcomes,
  mergePurchases,
  normalizeEnrollments,
  normalizeOutcomeRows,
  toEnrollmentRows,
  toPurchaseRecords,
} from '../src/lib/myClassroom.js';

// 테스트용 가상 강의
const courses = [
  { id: 't001', status: 'open' },
  { id: 't002', status: 'open' },
  { id: 't003', status: 'planned' },
];
const row = (course_id, enrolled_at) => ({ course_id, enrolled_at });

describe('getClassroomState — 내 강의실 화면 상태', () => {
  const base = { configured: true, user: { id: 'u1' }, status: 'ready', enrollments: [] };

  it('서버 설정이 없으면 unavailable (로그인 버튼을 보여 주지 않는다)', () => {
    expect(getClassroomState({ ...base, configured: false })).toBe('unavailable');
  });

  it('로그인 여부 확인 자체가 실패하면 error (로그아웃으로 오해하지 않게)', () => {
    expect(getClassroomState({ ...base, user: undefined, status: 'error' })).toBe('error');
  });

  it('로그인 여부를 확인하는 중이면 loading', () => {
    expect(getClassroomState({ ...base, user: undefined })).toBe('loading');
  });

  it('로그인하지 않았으면 signed-out (기록 상태와 상관없이)', () => {
    expect(getClassroomState({ ...base, user: null, status: 'error' })).toBe('signed-out');
  });

  it('기록을 불러오는 중이면 loading, 실패하면 error', () => {
    expect(getClassroomState({ ...base, status: 'loading' })).toBe('loading');
    expect(getClassroomState({ ...base, status: 'error' })).toBe('error');
  });

  it('기록이 없으면 empty, 있으면 list', () => {
    expect(getClassroomState(base)).toBe('empty');
    expect(getClassroomState({ ...base, enrollments: [{ course: courses[0] }] })).toBe('list');
  });
});

describe('normalizeEnrollments — 서버 기록 정리', () => {
  it('강의 정보를 붙이고 최근 신청 순으로 정렬한다', () => {
    const result = normalizeEnrollments([row('t001', '2026-10-01T00:00:00Z'), row('t002', '2026-10-05T00:00:00Z')], courses);
    expect(result.map((item) => item.course.id)).toEqual(['t002', 't001']);
    expect(result[0].enrolledAt).toBe('2026-10-05T00:00:00Z');
  });

  it('없는 강의·깨진 값은 버리고, 같은 강의는 한 번만', () => {
    const result = normalizeEnrollments(
      [row('t001', '2026-10-01T00:00:00Z'), row('t001', '2026-10-02T00:00:00Z'), row('zzz', '2026-10-03T00:00:00Z'), null, { course_id: 7 }],
      courses,
    );
    expect(result.map((item) => item.course.id)).toEqual(['t001']);
  });

  it('응답이 배열이 아니면 빈 목록', () => {
    expect(normalizeEnrollments(null, courses)).toEqual([]);
  });
});

describe('toEnrollmentRows — 서버로 보내는 값', () => {
  it('강의 id만 보낸다. 사용자 id는 보내지 않는다 (서버가 로그인 정보로 채움)', () => {
    const rows = toEnrollmentRows(['t001', 't002']);
    expect(rows).toEqual([{ course_id: 't001' }, { course_id: 't002' }]);
    rows.forEach((item) => expect(item).not.toHaveProperty('user_id'));
  });
});

describe('계정 기록을 수강 여부에 반영 — 같은 계정이면 어느 기기에서나 같게', () => {
  const enrollments = [{ course: courses[0], enrolledAt: '2026-10-05T00:00:00Z' }];

  it('toPurchaseRecords: 서버 신청 기록을 구매 기록 모양으로 바꾼다', () => {
    expect(toPurchaseRecords(enrollments)).toEqual([{ courseId: 't001', purchasedAt: '2026-10-05T00:00:00Z' }]);
  });

  it('mergePurchases: 브라우저 기록 + 계정 기록, 같은 강의는 브라우저 기록 하나만', () => {
    const local = [{ courseId: 't002', purchasedAt: '2026-10-01T00:00:00Z' }];
    const account = [
      { courseId: 't001', purchasedAt: '2026-10-05T00:00:00Z' },
      { courseId: 't002', purchasedAt: '2026-10-06T00:00:00Z' },
    ];
    expect(mergePurchases(local, account)).toEqual([
      { courseId: 't002', purchasedAt: '2026-10-01T00:00:00Z' },
      { courseId: 't001', purchasedAt: '2026-10-05T00:00:00Z' },
    ]);
  });

  it('mergePurchases: 원래 배열을 바꾸지 않는다', () => {
    const local = [];
    mergePurchases(local, [{ courseId: 't001', purchasedAt: 'x' }]);
    expect(local).toEqual([]);
  });
});

describe('결과물 완성 체크 — 계정 기록과 브라우저 기록', () => {
  const account = [{ courseId: 't001', purchasedAt: '2026-10-05T00:00:00Z' }];

  it('normalizeOutcomeRows: 서버 응답에서 아는 강의 id만, 한 번씩', () => {
    expect(normalizeOutcomeRows([{ course_id: 't001' }, { course_id: 't001' }, { course_id: 'zzz' }, null], courses)).toEqual(['t001']);
    expect(normalizeOutcomeRows(null, courses)).toEqual([]);
  });

  it('mergeOutcomes: 브라우저 체크 + 계정 체크, 중복 없이', () => {
    expect(mergeOutcomes(['t002', 't001'], ['t001', 't003'])).toEqual(['t002', 't001', 't003']);
  });

  it('getOutcomeTarget: 계정에 신청한 강의는 account, 이 브라우저에서만 산 강의는 local', () => {
    expect(getOutcomeTarget('t001', account)).toBe('account');
    expect(getOutcomeTarget('t002', account)).toBe('local');
  });
});

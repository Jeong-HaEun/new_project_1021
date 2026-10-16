// 모집 상태 — 강좌에 기간을 넣으면 오늘 날짜 기준으로 모집중·모집 예정·마감을 정한다 (한국 시간 기준)
import { describe, it, expect } from 'vitest';
import { ENROLLMENT_LABELS, getCourseBadge, getEnrollmentStatus, isValidDate } from '../src/lib/enrollment.js';

const period = { startDate: '2026-10-01', endDate: '2026-10-31' };
const course = (enrollment) => ({ id: 't001', status: 'open', enrollment });

// 한국 시간으로 시각 만들기
const kst = (dateTime) => new Date(`${dateTime}+09:00`);

describe('getEnrollmentStatus — 신호등 색', () => {
  it('기간이 없으면 상시 모집(green)', () => {
    expect(getEnrollmentStatus(course(undefined), kst('2026-10-16T12:00:00'))).toBe('green');
  });

  it('기간 안이면 모집중(green)', () => {
    expect(getEnrollmentStatus(course(period), kst('2026-10-16T12:00:00'))).toBe('green');
  });

  it('시작 전이면 모집 예정(yellow)', () => {
    expect(getEnrollmentStatus(course(period), kst('2026-09-30T23:59:59'))).toBe('yellow');
  });

  it('끝난 뒤면 마감(red)', () => {
    expect(getEnrollmentStatus(course(period), kst('2026-11-01T00:00:00'))).toBe('red');
  });

  it('시작일 0시와 마감일 23시 59분은 모집중 (날짜 포함)', () => {
    expect(getEnrollmentStatus(course(period), kst('2026-10-01T00:00:00'))).toBe('green');
    expect(getEnrollmentStatus(course(period), kst('2026-10-31T23:59:59'))).toBe('green');
  });

  it('한국 시간 기준이다 (UTC로는 전날이어도 한국은 마감 다음 날)', () => {
    // 2026-10-31T15:30Z = 한국 11월 1일 00:30 → 마감
    expect(getEnrollmentStatus(course(period), new Date('2026-10-31T15:30:00Z'))).toBe('red');
  });

  it('시작일만 있으면 그날부터 계속 모집, 마감일만 있으면 그날까지 모집', () => {
    expect(getEnrollmentStatus(course({ startDate: '2026-10-20' }), kst('2026-10-16T12:00:00'))).toBe('yellow');
    expect(getEnrollmentStatus(course({ startDate: '2026-10-01' }), kst('2027-05-01T12:00:00'))).toBe('green');
    expect(getEnrollmentStatus(course({ endDate: '2026-10-10' }), kst('2026-10-16T12:00:00'))).toBe('red');
  });
});

describe('ENROLLMENT_LABELS — 화면 표시 이름', () => {
  it('색마다 이름이 있다', () => {
    expect(ENROLLMENT_LABELS).toEqual({ green: '모집중', yellow: '모집 예정', red: '모집 마감' });
  });
});

describe('isValidDate — 날짜 형식 검사', () => {
  it('YYYY-MM-DD 형식의 실제 날짜만 통과', () => {
    expect(isValidDate('2026-10-01')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-1-1')).toBe(false);
    expect(isValidDate('10/01/2026')).toBe(false);
    expect(isValidDate(20261001)).toBe(false);
  });
});

describe('getCourseBadge — 카드·상세에 붙는 상태 표시', () => {
  const now = kst('2026-10-16T12:00:00');

  it('제작 예정 강좌는 기간과 상관없이 제작 예정', () => {
    expect(getCourseBadge({ status: 'planned', enrollment: period }, now)).toEqual({ tone: 'planned', label: '제작 예정' });
  });

  it('기간이 없는 열린 강좌는 표시 없음 (상시 모집)', () => {
    expect(getCourseBadge({ status: 'open' }, now)).toBeNull();
  });

  it('기간이 있으면 신호등 색과 이름', () => {
    expect(getCourseBadge({ status: 'open', enrollment: period }, now)).toEqual({ tone: 'green', label: '모집중' });
    expect(getCourseBadge({ status: 'open', enrollment: { startDate: '2026-11-01' } }, now)).toEqual({ tone: 'yellow', label: '모집 예정' });
    expect(getCourseBadge({ status: 'open', enrollment: { endDate: '2026-10-01' } }, now)).toEqual({ tone: 'red', label: '모집 마감' });
  });
});

describe('formatEnrollmentPeriod — 모집 기간 문구', () => {
  it('기간 표시', async () => {
    const { formatEnrollmentPeriod } = await import('../src/lib/enrollment.js');
    expect(formatEnrollmentPeriod(period)).toBe('2026.10.01 ~ 2026.10.31');
    expect(formatEnrollmentPeriod({ startDate: '2026-10-01' })).toBe('2026.10.01부터 상시');
    expect(formatEnrollmentPeriod({ endDate: '2026-10-31' })).toBe('2026.10.31까지');
    expect(formatEnrollmentPeriod(undefined)).toBe('상시 모집');
  });
});

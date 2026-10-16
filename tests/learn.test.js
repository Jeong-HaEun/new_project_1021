// 수강 화면 — SPEC.md 5절 기준
import { describe, it, expect } from 'vitest';
import { getLearnView, toggleOutcome } from '../src/lib/learn.js';

// 테스트용 가상 강의
const lessons = [
  { id: 'l1', title: '맛보기', minutes: 3, isPreview: true },
  { id: 'l2', title: '본문 1', minutes: 4, isPreview: false },
  { id: 'l3', title: '본문 2', minutes: 5, isPreview: false },
];
const open = { id: 't001', status: 'open', lessons };
const planned = { id: 't002', status: 'planned', lessons };
const owned = (courseId) => ({ courseId, purchasedAt: '2026-10-01T00:00:00.000Z' });

describe('getLearnView — 수강 화면 상태', () => {
  it('구매 전: 맛보기만 열리고 나머지는 잠김, 결과물 체크 불가', () => {
    const view = getLearnView(open, [], []);
    expect(view.state).toBe('preview');
    expect(view.lessons.map((lesson) => lesson.access)).toEqual(['preview', 'locked', 'locked']);
    expect(view.openCount).toBe(1);
    expect(view.canCheckOutcome).toBe(false);
    expect(view.outcomeDone).toBe(false);
  });

  it('구매 후: 모든 차시가 열리고 결과물 체크 가능', () => {
    const view = getLearnView(open, [owned('t001')], []);
    expect(view.state).toBe('owned');
    expect(view.lessons.map((lesson) => lesson.access)).toEqual(['owned', 'owned', 'owned']);
    expect(view.openCount).toBe(3);
    expect(view.canCheckOutcome).toBe(true);
  });

  it('완성 체크한 강의는 outcomeDone', () => {
    expect(getLearnView(open, [owned('t001')], ['t001']).outcomeDone).toBe(true);
  });

  it('구매 안 한 강의는 완성 기록이 남아 있어도 outcomeDone이 아니다', () => {
    expect(getLearnView(open, [], ['t001']).outcomeDone).toBe(false);
  });

  it('제작 예정 강의는 planned (맛보기만, 체크 불가)', () => {
    const view = getLearnView(planned, [], []);
    expect(view.state).toBe('planned');
    expect(view.canCheckOutcome).toBe(false);
    expect(view.openCount).toBe(1);
  });

  it('차시 제목·길이를 그대로 넘기고 원래 데이터는 바꾸지 않는다', () => {
    const view = getLearnView(open, [], []);
    expect(view.lessons[1]).toEqual({ id: 'l2', title: '본문 1', minutes: 4, isPreview: false, access: 'locked' });
    expect(lessons[1]).not.toHaveProperty('access');
  });
});

describe('toggleOutcome — 결과물 완성 체크 켜고 끄기', () => {
  it('구매한 강의: 체크 → 다시 누르면 취소', () => {
    const checked = toggleOutcome([], open, [owned('t001')]);
    expect(checked).toEqual(['t001']);
    expect(toggleOutcome(checked, open, [owned('t001')])).toEqual([]);
  });

  it('구매 안 한 강의는 체크되지 않는다', () => {
    expect(toggleOutcome([], open, [])).toEqual([]);
  });

  it('다른 강의 체크는 그대로 둔다', () => {
    expect(toggleOutcome(['t009'], open, [owned('t001')])).toEqual(['t009', 't001']);
  });
});

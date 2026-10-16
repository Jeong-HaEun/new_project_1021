// 메인 A/B 측정 — 탭 세션 기준 노출 1회, 노출 뒤 첫 강의 상세 도달 1회 (planning/home-ab-v2 지시서)
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  consumeCourseOpen,
  createExposureWatcher,
  markClassesView,
  recordExposure,
  setPendingCourse,
} from '../src/lib/experimentTracking.js';

function fakeStorage({ broken = false } = {}) {
  const map = new Map();
  return {
    getItem: (key) => {
      if (broken) throw new Error('blocked');
      return map.has(key) ? map.get(key) : null;
    },
    setItem: (key, value) => {
      if (broken) throw new Error('blocked');
      map.set(key, value);
    },
  };
}
const A = { variant: 'A', mode: 'experiment', measured: true };

describe('recordExposure — 메인 노출은 탭당 1회', () => {
  it('처음이면 보낼 값을 돌려주고, 같은 탭에서 다시 오면 null', () => {
    const session = fakeStorage();
    expect(recordExposure(session, A)).toEqual({ experiment_id: 'hc_home_strategy_v1', variant: 'A', mode: 'experiment', placement: 'home' });
    expect(recordExposure(session, A)).toBeNull();
  });

  it('측정 대상이 아니면(시연·실험 끔·저장 실패) 보내지 않는다', () => {
    expect(recordExposure(fakeStorage(), { variant: 'B', mode: 'preview', measured: false })).toBeNull();
  });

  it('탭 저장소를 못 쓰면 중복을 막을 수 없으므로 보내지 않는다', () => {
    expect(recordExposure(fakeStorage({ broken: true }), A)).toBeNull();
  });
});

describe('강의 상세 도달 — 노출 뒤, 클릭한 강의의 상세에 처음 도달했을 때 1회', () => {
  it('메인 카드 클릭 → 그 강의 상세 도달이면 기록', () => {
    const session = fakeStorage();
    recordExposure(session, A);
    expect(setPendingCourse(session, { courseId: 'c002', source: 'home_card' })).toBe(true);
    expect(consumeCourseOpen(session, 'c002')).toEqual({
      experiment_id: 'hc_home_strategy_v1', variant: 'A', mode: 'experiment', placement: 'course', course_id: 'c002', source: 'home_card',
    });
  });

  it('한 번 기록하면 다시 기록하지 않는다 (뒤로 가기·다른 강의 포함)', () => {
    const session = fakeStorage();
    recordExposure(session, A);
    setPendingCourse(session, { courseId: 'c002', source: 'home_card' });
    consumeCourseOpen(session, 'c002');
    expect(consumeCourseOpen(session, 'c002')).toBeNull();
    expect(setPendingCourse(session, { courseId: 'c003', source: 'course_list' })).toBe(false);
  });

  it('메인 노출 없이 상세에 바로 들어오면 제외', () => {
    const session = fakeStorage();
    expect(setPendingCourse(session, { courseId: 'c002', source: 'course_list' })).toBe(false);
    expect(consumeCourseOpen(session, 'c002')).toBeNull();
  });

  it('클릭 없이(주소 입력 등) 들어오거나 다른 강의면 기록하지 않는다', () => {
    const session = fakeStorage();
    recordExposure(session, A);
    expect(consumeCourseOpen(session, 'c002')).toBeNull();
    setPendingCourse(session, { courseId: 'c002', source: 'home_path' });
    expect(consumeCourseOpen(session, 'c003')).toBeNull();
  });

  it('검색 결과 목록을 거쳐도 같은 탭이면 기록 (source=course_list)', () => {
    const session = fakeStorage();
    recordExposure(session, A);
    setPendingCourse(session, { courseId: 'c003', source: 'course_list' });
    expect(consumeCourseOpen(session, 'c003').source).toBe('course_list');
  });
});

describe('markClassesView — 보조 지표: 강의 구역 도달, 탭당 1회', () => {
  it('노출 뒤 처음 한 번만', () => {
    const session = fakeStorage();
    expect(markClassesView(session)).toBeNull(); // 노출 전
    recordExposure(session, A);
    expect(markClassesView(session)).toEqual({ experiment_id: 'hc_home_strategy_v1', variant: 'A', mode: 'experiment', placement: 'home' });
    expect(markClassesView(session)).toBeNull();
  });
});

describe('createExposureWatcher — 화면이 1초 연속 보일 때 노출', () => {
  afterEach(() => vi.useRealTimers());

  function fakeDoc(state) {
    const listeners = [];
    return {
      visibilityState: state,
      addEventListener: (_type, fn) => listeners.push(fn),
      removeEventListener: () => {},
      change(next) {
        this.visibilityState = next;
        listeners.forEach((fn) => fn());
      },
    };
  }

  it('보이는 상태로 1초가 지나면 한 번 부른다', () => {
    vi.useFakeTimers();
    const onExpose = vi.fn();
    createExposureWatcher({ doc: fakeDoc('visible'), onExpose });
    vi.advanceTimersByTime(999);
    expect(onExpose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(5000);
    expect(onExpose).toHaveBeenCalledTimes(1);
  });

  it('1초 전에 다른 탭으로 가면 취소, 다시 보이면 처음부터 1초', () => {
    vi.useFakeTimers();
    const onExpose = vi.fn();
    const doc = fakeDoc('visible');
    createExposureWatcher({ doc, onExpose });
    vi.advanceTimersByTime(600);
    doc.change('hidden');
    vi.advanceTimersByTime(2000);
    expect(onExpose).not.toHaveBeenCalled();
    doc.change('visible');
    vi.advanceTimersByTime(1000);
    expect(onExpose).toHaveBeenCalledTimes(1);
  });

  it('숨겨진 상태로 열리면 보일 때까지 기다린다', () => {
    vi.useFakeTimers();
    const onExpose = vi.fn();
    const doc = fakeDoc('hidden');
    createExposureWatcher({ doc, onExpose });
    vi.advanceTimersByTime(3000);
    expect(onExpose).not.toHaveBeenCalled();
    doc.change('visible');
    vi.advanceTimersByTime(1000);
    expect(onExpose).toHaveBeenCalledTimes(1);
  });
});

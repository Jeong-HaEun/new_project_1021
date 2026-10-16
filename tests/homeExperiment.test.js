// 메인 A/B — 감성 몰입형(A) vs 정보 탐색형(B). 시연·배정 규칙
// 기준: docs/planning/home-ab-v2/claude-development-brief.md (planning/home-ab-v2 브랜치)
import { describe, it, expect } from 'vitest';
import {
  ASSIGNMENT_KEY,
  DEFAULT_HOME_VARIANT,
  HOME_EXPERIMENT_ID,
  isPreviewSession,
  markPreviewSession,
  resolveHomeVariant,
} from '../src/lib/homeExperiment.js';

// 테스트용 가짜 저장소 (실패하는 경우도 흉내)
function fakeStorage({ broken = false, initial = {} } = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
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
const saved = (storage) => JSON.parse(storage.map.get(ASSIGNMENT_KEY));

describe('시연·기본', () => {
  it('실험 id는 이전 카드 실험과 다른 새 id, 기본은 B', () => {
    expect(HOME_EXPERIMENT_ID).toBe('hc_home_strategy_v1');
    expect(DEFAULT_HOME_VARIANT).toBe('B');
  });

  it('실험을 끄면 모두 B, 측정하지 않음', () => {
    expect(resolveHomeVariant('', { active: false, local: fakeStorage() })).toEqual({ variant: 'B', mode: 'default', measured: false });
  });

  it('?ab_preview=A/B 는 시연 (대소문자 무관), 측정하지 않음', () => {
    expect(resolveHomeVariant('?ab_preview=A')).toEqual({ variant: 'A', mode: 'preview', measured: false });
    expect(resolveHomeVariant('?ab_preview=b', { active: true })).toEqual({ variant: 'B', mode: 'preview', measured: false });
  });

  it('모르는 시연 값은 무시', () => {
    expect(resolveHomeVariant('?ab_preview=C').mode).toBe('default');
  });

  it('시연은 저장된 배정을 덮어쓰지 않는다', () => {
    const local = fakeStorage({ initial: { [ASSIGNMENT_KEY]: JSON.stringify({ hc_home_strategy_v1: 'B' }) } });
    resolveHomeVariant('?ab_preview=A', { active: true, local });
    expect(saved(local).hc_home_strategy_v1).toBe('B');
  });
});

describe('무작위 배정 (실험 켬)', () => {
  it('처음 방문: 난수 < 0.5 이면 A, 아니면 B. 브라우저에 저장하고 측정', () => {
    const local = fakeStorage();
    expect(resolveHomeVariant('', { active: true, local, random: () => 0.2 })).toEqual({ variant: 'A', mode: 'experiment', measured: true });
    expect(saved(local).hc_home_strategy_v1).toBe('A');
    expect(resolveHomeVariant('', { active: true, local: fakeStorage(), random: () => 0.7 }).variant).toBe('B');
  });

  it('다시 방문하면 난수와 상관없이 같은 안', () => {
    const local = fakeStorage();
    resolveHomeVariant('', { active: true, local, random: () => 0.2 });
    expect(resolveHomeVariant('', { active: true, local, random: () => 0.9 }).variant).toBe('A');
  });

  it('저장값이 깨졌으면 새로 배정한다', () => {
    const local = fakeStorage({ initial: { [ASSIGNMENT_KEY]: '{깨짐' } });
    expect(resolveHomeVariant('', { active: true, local, random: () => 0.9 }).variant).toBe('B');
    const odd = fakeStorage({ initial: { [ASSIGNMENT_KEY]: JSON.stringify({ hc_home_strategy_v1: 'Z' }) } });
    expect(resolveHomeVariant('', { active: true, local: odd, random: () => 0.1 }).variant).toBe('A');
  });

  it('다른 실험 id의 저장값은 그대로 둔다 (버전이 바뀌면 새 id로 따로)', () => {
    const local = fakeStorage({ initial: { [ASSIGNMENT_KEY]: JSON.stringify({ old_exp: 'X' }) } });
    resolveHomeVariant('', { active: true, local, random: () => 0.1 });
    expect(saved(local)).toEqual({ old_exp: 'X', hc_home_strategy_v1: 'A' });
  });

  it('localStorage를 못 쓰면 sessionStorage로', () => {
    const session = fakeStorage();
    const result = resolveHomeVariant('', { active: true, local: fakeStorage({ broken: true }), session, random: () => 0.2 });
    expect(result).toEqual({ variant: 'A', mode: 'experiment', measured: true });
    expect(saved(session).hc_home_strategy_v1).toBe('A');
  });

  it('둘 다 못 쓰면 B + 측정 제외', () => {
    const broken = fakeStorage({ broken: true });
    expect(resolveHomeVariant('', { active: true, local: broken, session: broken, random: () => 0.2 })).toEqual({ variant: 'B', mode: 'fallback', measured: false });
    expect(resolveHomeVariant('', { active: true, local: null, session: null })).toEqual({ variant: 'B', mode: 'fallback', measured: false });
  });
});

describe('시연 탭 표시 — 시연 뒤 상세로 이동해도 측정하지 않도록', () => {
  it('표시하면 같은 탭에서 시연 중으로 본다', () => {
    const storage = fakeStorage();
    expect(isPreviewSession(storage)).toBe(false);
    markPreviewSession(storage);
    expect(isPreviewSession(storage)).toBe(true);
  });

  it('저장소를 못 쓰면 표시는 조용히 실패하고, 확인은 false', () => {
    const storage = fakeStorage({ broken: true });
    expect(() => markPreviewSession(storage)).not.toThrow();
    expect(isPreviewSession(storage)).toBe(false);
  });
});

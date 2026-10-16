// 서류 도우미 입력 임시 저장 — 이 탭에만(sessionStorage), 새로고침해도 남고 탭을 닫으면 사라진다
import { describe, it, expect } from 'vitest';
import { clearDrafts, loadDraft, saveDraft } from '../src/lib/docHelperDraft.js';

function fakeStorage({ broken = false } = {}) {
  const map = new Map();
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
    removeItem: (key) => map.delete(key),
  };
}

describe('saveDraft / loadDraft — 길잡이별로 따로', () => {
  it('저장한 값을 다시 불러온다', () => {
    const storage = fakeStorage();
    saveDraft(storage, 'cover_letter', { job: '마케터', question: '지원 동기' });
    expect(loadDraft(storage, 'cover_letter')).toEqual({ job: '마케터', question: '지원 동기' });
    expect(loadDraft(storage, 'interview')).toEqual({});
  });

  it('문자열이 아닌 값·모르는 칸은 버린다', () => {
    const storage = fakeStorage();
    saveDraft(storage, 'edit', { question: '문항', letter: 7, hack: '<script>' });
    expect(loadDraft(storage, 'edit')).toEqual({ question: '문항' });
  });

  it('깨진 값이나 저장소를 못 쓰면 빈 값 (오류를 내지 않는다)', () => {
    const storage = fakeStorage();
    storage.map.set('hanclass.helperDraft.v1', '{깨짐');
    expect(loadDraft(storage, 'edit')).toEqual({});
    const broken = fakeStorage({ broken: true });
    expect(() => saveDraft(broken, 'edit', { question: 'x' })).not.toThrow();
    expect(loadDraft(broken, 'edit')).toEqual({});
  });
});

describe('clearDrafts — 모두 지우기', () => {
  it('모든 길잡이의 입력을 지운다', () => {
    const storage = fakeStorage();
    saveDraft(storage, 'cover_letter', { job: '마케터' });
    saveDraft(storage, 'edit', { question: '문항' });
    clearDrafts(storage);
    expect(loadDraft(storage, 'cover_letter')).toEqual({});
    expect(loadDraft(storage, 'edit')).toEqual({});
  });
});

// 서류 도우미 — Gemini 요청 만들기·답 읽기 (서버 함수 doc-helper가 쓴다)
import { describe, it, expect } from 'vitest';
import { buildGeminiRequest, GEMINI_MAX_OUTPUT_TOKENS, GEMINI_RETRY_DELAYS_MS, isBusyStatus, isRetryableStatus, readGeminiText } from '../supabase/functions/_shared/gemini.js';

const fields = { job: '퍼포먼스 마케터', question: '지원 동기를 적어 주세요.' };

describe('buildGeminiRequest — 지시문은 systemInstruction, 입력은 user', () => {
  it('공통 규칙의 지시문·입력을 Gemini 형식으로 옮긴다', () => {
    const request = buildGeminiRequest('cover_letter', fields);
    expect(request.systemInstruction.parts[0].text).toContain('지어내');
    expect(request.contents).toHaveLength(1);
    expect(request.contents[0].role).toBe('user');
    expect(request.contents[0].parts[0].text).toContain('지원 동기를 적어 주세요.');
  });

  it('답 길이에 상한을 둔다', () => {
    expect(buildGeminiRequest('interview', { job: 'x', letter: 'y' }).generationConfig.maxOutputTokens).toBe(GEMINI_MAX_OUTPUT_TOKENS);
    expect(GEMINI_MAX_OUTPUT_TOKENS).toBeLessThanOrEqual(4096);
  });
});

describe('readGeminiText — 답 글만 꺼낸다', () => {
  it('여러 조각을 이어 붙이고 앞뒤 공백을 정리한다', () => {
    const data = { candidates: [{ content: { parts: [{ text: ' 첫째 ' }, { text: '둘째 ' }] } }] };
    expect(readGeminiText(data)).toBe('첫째 둘째');
  });

  it('생각(thought) 조각은 빼고, 답이 없으면 빈 글', () => {
    const data = { candidates: [{ content: { parts: [{ text: '속생각', thought: true }, { text: '답' }] } }] };
    expect(readGeminiText(data)).toBe('답');
    expect(readGeminiText({})).toBe('');
    expect(readGeminiText({ candidates: [{ finishReason: 'SAFETY' }] })).toBe('');
  });
});

describe('Gemini 일시 오류 — 잠깐 붐비면 다시 묻고, 그래도 안 되면 "이용이 많아요"', () => {
  it('서버 과부하(500·503)만 다시 시도한다', () => {
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(429)).toBe(false); // 무료 한도 — 바로 다시 물어도 안 풀림
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
  });

  it('다시 시도는 2번, 기다림은 서버 함수 시간 안에 끝난다', () => {
    expect(GEMINI_RETRY_DELAYS_MS).toHaveLength(2);
    expect(GEMINI_RETRY_DELAYS_MS.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(5000);
  });

  it('한도(429)·과부하(503·500)는 사용자에게 "이용이 많아요"로 안내한다', () => {
    expect(isBusyStatus(429)).toBe(true);
    expect(isBusyStatus(503)).toBe(true);
    expect(isBusyStatus(500)).toBe(true);
    expect(isBusyStatus(400)).toBe(false);
  });
});

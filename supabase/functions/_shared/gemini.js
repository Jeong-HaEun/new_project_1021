// 서류 도우미 — Gemini API 요청 만들기·답 읽기 (서버 함수 doc-helper에서만 사용)
// 무료 등급으로 쓴다: 키는 결제를 연결하지 않은 Google AI Studio 프로젝트에서 만든다 (SPEC.md '서류 도우미')
import { buildMessages } from './docHelperRules.js';

export const GEMINI_MAX_OUTPUT_TOKENS = 4096; // 답 길이 상한 (생각 토큰 포함이라 넉넉히)

// 지시문은 systemInstruction, 사용자가 입력한 자료는 user 내용으로
export function buildGeminiRequest(mode, fields) {
  const [system, user] = buildMessages(mode, fields);
  return {
    systemInstruction: { parts: [{ text: system.content }] },
    contents: [{ role: 'user', parts: [{ text: user.content }] }],
    generationConfig: { maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS },
  };
}

// 첫 번째 답에서 글 조각만 이어 붙인다 (생각 조각 제외). 없으면 ''
export function readGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((part) => !part.thought && typeof part.text === 'string').map((part) => part.text).join('').trim();
}

// 일시 오류: 서버 과부하(503 "high demand", 500)는 잠깐 뒤 다시 물으면 대개 풀린다
// 무료 한도(429)는 바로 다시 물어도 안 풀리므로 다시 묻지 않는다
export const GEMINI_RETRY_DELAYS_MS = [1000, 2500];

export function isRetryableStatus(status) {
  return status === 500 || status === 503;
}

// 사용자에게 "지금 이용이 많아요"로 안내할 오류 (그 밖은 일반 실패 안내)
export function isBusyStatus(status) {
  return status === 429 || isRetryableStatus(status);
}

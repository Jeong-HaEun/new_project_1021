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

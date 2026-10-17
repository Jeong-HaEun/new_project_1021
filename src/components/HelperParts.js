// 서류 도우미 화면 조각 — 탭, 입력 칸, 결과 상자, 안내 상자
// 입력·결과 글은 textContent로만 넣는다 (AI 답변도 HTML로 실행하지 않음)
import { el } from '../lib/dom.js';
import { FIELD_LABELS, FIELD_LIMITS, MODES } from '../../supabase/functions/_shared/docHelperRules.js';

const PLACEHOLDERS = {
  job: '예: 퍼포먼스 마케터 (신입)',
  company: '예: 지원하려는 기업 이름 (선택)',
  question: '자소서 문항을 그대로 붙여 넣으세요',
  posting: '채용공고의 자격요건·우대사항·인재상 (선택)',
  letter: '작성한 자소서를 붙여 넣으세요',
  documents: '자격증, 활동, 아르바이트·인턴 경험 등 (선택)',
  limit: '예: 700 (선택)',
};
const LONG_FIELDS = ['question', 'posting', 'letter', 'documents'];

export const MODE_INTRO = {
  cover_letter: '자소서 문항을 넣으면 인사 담당자가 이 문항으로 보고 싶은 지원자의 모습과 경험을 알려 드려요.',
  interview: '자소서와 서류 내용(자격증·경험 등)을 넣으면 면접에서 나올 만한 질문과 답변 방향을 알려 드려요.',
  edit: '완성한 자소서를 넣으면, 내 AI(ChatGPT 등)에 첨삭을 잘 부탁하는 질문(프롬프트)을 만들어 드려요.',
};

export function Tabs(current, onSelect) {
  return el(
    'div',
    { className: 'helper-tabs', role: 'tablist', 'aria-label': '길잡이 선택' },
    Object.entries(MODES).map(([mode, config]) =>
      el('button', {
        type: 'button', role: 'tab', id: `tab-${mode}`, className: 'helper-tab',
        'aria-selected': String(mode === current), 'aria-controls': 'helper-panel',
        onClick: () => onSelect(mode), text: config.label,
      }),
    ),
  );
}

// 입력 칸 하나 — 필수 표시, 글자 수 제한
export function Field(mode, name, value, onInput) {
  const required = MODES[mode].required.includes(name);
  const id = `helper-${mode}-${name}`;
  const props = { id, name, className: 'helper-input', placeholder: PLACEHOLDERS[name], onInput };
  if (FIELD_LIMITS[name]) props.maxlength = String(FIELD_LIMITS[name]);
  const input = LONG_FIELDS.includes(name)
    ? el('textarea', { ...props, rows: name === 'letter' ? '8' : '4' })
    : el('input', { ...props, type: name === 'limit' ? 'number' : 'text', ...(name === 'limit' && { min: '1', max: '5000' }) });
  input.value = value ?? '';
  return el('label', { className: 'helper-field', for: id }, [
    el('span', { className: 'helper-field__label' }, [
      el('span', { text: FIELD_LABELS[name] }),
      el('span', { className: required ? 'helper-field__req' : 'helper-field__opt', text: required ? '필수' : '선택' }),
    ]),
    input,
  ]);
}

// 결과 상자 — 제목, 글(줄바꿈 유지), 버튼들
export function ResultBox(title, text, actions) {
  return el('section', { className: 'helper-result', 'aria-live': 'polite' }, [
    el('h2', { className: 'helper-result__title', text: title }),
    el('div', { className: 'helper-result__text', text }),
    el('div', { className: 'helper-actions' }, actions),
  ]);
}

export function Notice(text, tone = 'info') {
  return el('p', { className: `helper-notice helper-notice--${tone}`, role: tone === 'error' ? 'alert' : 'note', text });
}

// 오류 → 안내 문구 (입력 확인 실패·서버 응답 공통)
export function errorText({ error, field }) {
  const label = FIELD_LABELS[field] ?? '입력';
  const messages = {
    required: `'${label}'을(를) 입력해 주세요.`,
    too_long: `'${label}'이(가) 너무 길어요. ${FIELD_LIMITS[field] ?? ''}자 이내로 줄여 주세요.`,
    quota: '오늘 이용 횟수(3번)를 모두 썼어요. 내일 다시 이용해 주세요.',
    closed: '실습 기간이 끝나 AI 답변은 쉬고 있어요. 첨삭 길잡이는 계속 쓸 수 있어요.',
    busy: '지금 AI 답변 이용이 많아 잠시 쉬고 있어요. 잠시 뒤나 내일 다시 이용해 주세요. (이번 시도는 횟수에서 빠지지 않아요)',
    login: '로그인이 풀렸어요. 다시 로그인해 주세요.',
    not_configured: 'AI 연결 설정을 준비하고 있어요. 잠시 후 다시 시도해 주세요.',
  };
  return messages[error] ?? '답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요. (이번 시도는 횟수에서 빠지지 않아요)';
}

// '준비 중' 표시 — 아직 만들지 않은 기능은 링크 대신 비활성 버튼으로 보여준다 (빈 링크 금지)
import { el } from '../lib/dom.js';

export function SoonBadge() {
  return el('span', { className: 'badge badge--soon', text: '준비 중' });
}

// 아이콘·글자와 함께 쓰는 비활성 버튼
export function SoonButton({ label, iconNode, className = '' }) {
  return el(
    'button',
    {
      type: 'button',
      className: `soon-button ${className}`.trim(),
      disabled: '',
      title: `${label} — 준비 중`,
      'aria-label': `${label} (준비 중)`,
    },
    [iconNode, el('span', { className: 'soon-button__label', text: label }), SoonBadge()],
  );
}

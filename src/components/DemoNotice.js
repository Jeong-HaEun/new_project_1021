// 데모 고지 띠 — 모든 페이지 하단에 고정. 실제 판매 전까지 유지한다
import { el } from '../lib/dom.js';

export function DemoNotice() {
  return el('p', {
    className: 'demo-notice',
    role: 'note',
    text: '발표용 데모 사이트입니다. 아직 강의를 판매하지 않습니다.',
  });
}

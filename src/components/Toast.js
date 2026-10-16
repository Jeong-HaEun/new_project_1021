// 짧은 알림 — 화면 아래쪽에 잠깐 떴다 사라진다. 화면 읽기 프로그램에도 읽힌다(aria-live)
import { el } from '../lib/dom.js';

let region = null;
let timer = null;

export function showToast(message) {
  if (!region) {
    region = el('div', { className: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(region);
  }
  region.textContent = message;
  region.classList.add('toast--show');
  clearTimeout(timer);
  timer = setTimeout(() => region.classList.remove('toast--show'), 2400);
}

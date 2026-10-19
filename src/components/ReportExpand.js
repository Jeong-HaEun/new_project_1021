// 광고 보고서 크게 보기 — 새 창(Adporter 단독 화면) 대신 지금 창에서 보고서 틀을 화면 가득 넓힌다
// iframe을 옮기지 않고 감싼 틀의 클래스만 바꿔서, 보고서가 다시 불러와지지 않고 올린 CSV도 그대로 남는다
// 넓힌 화면 위에 한클래스 막대(이름·데모 고지·[작게 보기])를 두고, Esc로도 닫는다
import { el } from '../lib/dom.js';

const EXPANDED = 'report-frame-wrap--expanded';

// wrapper: iframe을 감싼 틀. 돌려주는 버튼을 화면에 놓는다
export function ReportExpandButton(wrapper) {
  const open = el('button', { type: 'button', className: 'report-open button button--secondary', 'data-analytics': 'report-example-open', 'aria-expanded': 'false', text: '크게 보기' });
  const close = el('button', { type: 'button', className: 'button button--ghost report-expand-bar__close', text: '작게 보기 ✕' });
  const bar = el('div', { className: 'report-expand-bar' }, [
    el('strong', { text: '한클래스 · 광고 성과 보고서' }),
    el('span', { className: 'report-expand-bar__note', text: '발표용 데모 사이트 · 샘플 숫자는 설명용 가상 수치예요' }),
    close,
  ]);
  wrapper.prepend(bar);

  function handleKey(event) {
    if (event.key === 'Escape') setExpanded(false);
  }

  function setExpanded(expanded) {
    wrapper.classList.toggle(EXPANDED, expanded);
    document.body.classList.toggle('report-expanded', expanded); // 뒤 페이지 스크롤 막기
    open.setAttribute('aria-expanded', String(expanded));
    if (expanded) {
      document.addEventListener('keydown', handleKey);
      close.focus();
    } else {
      document.removeEventListener('keydown', handleKey);
      open.focus();
    }
  }

  open.addEventListener('click', () => setExpanded(true));
  close.addEventListener('click', () => setExpanded(false));
  return open;
}

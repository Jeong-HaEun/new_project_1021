// 선 아이콘 — 직접 그린 단순 경로. 문자열 HTML 대신 SVG 요소를 직접 만든다
const SVG_NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35',
  cart: 'M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6M9 20h.01M17 20h.01',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 4-6 8-6s8 2 8 6',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  book: 'M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14',
  excel: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14',
  ppt: 'M3 4h18v12H3zM12 16v4M8 20h8M7 12l3-3 2 2 4-4',
  'marketing-basic': 'M3 10v4h4l6 4V6l-6 4zM17 9a4 4 0 0 1 0 6',
  'marketing-practice': 'M4 20V11M10 20V5M16 20v-6M2 20h20',
  ai: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z',
  docs: 'M6 3h9l5 5v13H6zM14 3v6h6M9 13h8M9 17h6',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  play: 'M8 5v14l11-7z',
  check: 'M5 12l5 5 9-10',
  back: 'M19 12H5M12 19l-7-7 7-7',
  chat: 'M4 5h16v11H8l-4 4z',
  wand: 'M4 20L16 8M14 4v3M18 6h3M19 10v3M11 6H8',
};

// 아이콘 하나 만들기. 장식용이라 화면 읽기 프로그램에서는 숨긴다
export function icon(name, size = 24) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icon');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', PATHS[name] ?? PATHS.grid);
  svg.append(path);
  return svg;
}

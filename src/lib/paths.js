// 주소 도우미 — GitHub Pages는 /new_project_1021/ 아래에서 열리므로
// 이미지 경로에는 base를 붙이고, 페이지 링크는 같은 폴더 기준 상대 주소로 만든다

// public/ 안의 파일 주소 (예: images/courses/c001.svg)
export function assetUrl(path) {
  return `${import.meta.env.BASE_URL}${path}`;
}

// 페이지 주소 + 검색 조건. 빈 값과 'all'은 주소에서 뺀다
export function pageUrl(page, params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value && value !== 'all');
  const search = new URLSearchParams(entries).toString();
  return search ? `${page}?${search}` : page;
}

// 현재 주소의 검색 조건 읽기
export function readParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

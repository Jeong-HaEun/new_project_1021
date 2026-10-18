// 내용을 바꾼 뒤 요소의 맨 위로 스르르 올라간다.
// 바뀐 내용이 짧으면 페이지 높이가 먼저 줄어 화면이 한 번에 튀어 오르므로,
// 바꾸기 전 높이를 잠시 붙잡아 두고 스크롤이 끝나면 푼다.
const RELEASE_FALLBACK_MS = 1500;

export function keepHeightWhile(element, change) {
  element.style.minHeight = `${element.offsetHeight}px`;
  change();
}

export function scrollToStartSmoothly(element) {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let released = false;
  const handleRelease = () => {
    if (released) return;
    released = true;
    element.style.minHeight = '';
  };
  window.addEventListener('scrollend', handleRelease, { once: true });
  setTimeout(handleRelease, RELEASE_FALLBACK_MS);
  element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

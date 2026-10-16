// 화면 요소를 짧게 만드는 도우미
// 글자는 textContent로만 넣는다 → 사용자가 쓴 글에 HTML이 섞여도 실행되지 않는다(XSS 방지)
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'text') node.textContent = value;
    else if (key === 'className') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  });
  node.append(...[].concat(children).filter(Boolean));
  return node;
}

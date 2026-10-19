// 운영자 배지 '취업메이트' (닉네임 '취메' 옆에 붙어 '취메 [취업메이트]'로 보인다) — DB가 운영자 글·댓글에만 is_official을 채운다 (회원이 닉네임으로 흉내 낼 수 없음)
import { el } from '../lib/dom.js';

export function OfficialBadge() {
  return el('span', { className: 'badge community-official', title: '취업메이트 · 한클래스 운영자', text: '취업메이트' });
}

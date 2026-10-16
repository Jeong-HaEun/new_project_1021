// 방문 통계 안내 — GA4를 쓸 때만 본문 맨 아래에 한 줄 + [자세히] (privacy.html)
import { el } from '../lib/dom.js';
import '../styles/visit-notice.css';
import { isAnalyticsConfigured } from '../lib/analytics.js';

export const VISIT_NOTICE_TEXT =
  '더 나은 서비스를 위해 Google Analytics로 방문 통계를 수집해요. 이름·이메일 등 개인을 알아볼 수 있는 정보는 수집하지 않아요.';

export function VisitNotice() {
  if (!isAnalyticsConfigured()) return null;
  return el('p', { className: 'visit-notice' }, [
    el('span', { text: `${VISIT_NOTICE_TEXT} ` }),
    el('a', { href: 'privacy.html', text: '자세히' }),
  ]);
}

// GA4 방문 통계 — 공통 모듈 한 곳 (docs/analytics-plan.md)
// 측정 ID(VITE_GA4_ID)가 있을 때만 동작한다. 허용한 항목만 보내고 검색어 원문·이메일·입력 내용은 보내지 않는다
// 데모 주문은 실제 결제가 아니므로 GA4 표준 구매 이벤트 대신 demo_ 이벤트로 따로 보낸다 (가짜 매출 방지)

import { isPreviewSession } from './homeExperiment.js';

export const GA_ID = import.meta.env.VITE_GA4_ID ?? '';

// 이벤트별 허용 항목 — 여기에 없는 이벤트·항목은 보내지 않는다
export const EVENT_PARAMS = {
  view_item_list: ['item_list_id', 'result_count'],
  select_item: ['item_id', 'item_category', 'placement'],
  view_item: ['item_id', 'item_category', 'price', 'currency'],
  course_search: ['query_length', 'result_count'],
  course_filter: ['category_id', 'result_count'],
  report_example_open: ['placement', 'item_id'],
  demo_add_to_cart: ['item_id', 'item_category', 'price'],
  demo_begin_checkout: ['item_count', 'order_mode'],
  demo_order_complete: ['item_count', 'order_mode', 'payment_method'],
  // 메인 A/B (experimentTracking.js) — 탭 세션 기준
  experiment_home_exposure: ['experiment_id', 'variant', 'mode', 'placement'],
  experiment_course_open: ['experiment_id', 'variant', 'mode', 'placement', 'course_id', 'source'],
  experiment_classes_view: ['experiment_id', 'variant', 'mode', 'placement'],
};

// 주소에서 지울 값: 검색어, 로그인 결과(code·토큰·오류)
const BLOCKED_QUERY_KEYS = ['q', 'code', 'error', 'error_code', 'error_description', 'access_token', 'refresh_token'];

// 한클래스 배포 주소 — 여기서만 수집한다 (같은 github.io의 세시드·Adporter 등 다른 사이트는 제외)
const SITE_HOST = 'jeong-haeun.github.io';
const SITE_PATH = '/new_project_1021/';

// 불러올지: 측정 ID가 G- 형식이고, 한클래스 배포 주소일 때만. 내 컴퓨터(localhost)는 ?ga_debug=1 일 때만 (확인용)
// A/B 시연 주소(?ab_preview)와 시연 중인 탭(previewSession)은 측정하지 않는다 (시연 데이터 제외)
export function shouldLoadAnalytics(id, href, { previewSession = false } = {}) {
  if (!/^G-[A-Z0-9]+$/.test(id)) return false;
  const url = new URL(href);
  if (previewSession || url.searchParams.has('ab_preview')) return false;
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return url.searchParams.get('ga_debug') === '1';
  return url.hostname === SITE_HOST && url.pathname.startsWith(SITE_PATH);
}

// 보낼 주소: 지울 값과 # 뒷부분을 뺀다
export function cleanPageLocation(href) {
  const url = new URL(href);
  BLOCKED_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));
  url.hash = '';
  return url.toString();
}

// 허용한 항목만, 빈 값 없이. 모르는 이벤트는 null
export function pickParams(name, params = {}) {
  const allowed = EVENT_PARAMS[name];
  if (!allowed) return null;
  return Object.fromEntries(allowed.filter((key) => params[key] !== undefined && params[key] !== '').map((key) => [key, params[key]]));
}

let loaded = false;

// 페이지마다 한 번 (PageLayout.renderPage). page_type: 페이지 종류(home, courses, course …)
export function initAnalytics(pageType) {
  if (loaded || !shouldLoadAnalytics(GA_ID, window.location.href, { previewSession: isPreviewSession() })) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments); // GA4 공식 코드 형태 그대로 (arguments 객체를 넣어야 동작)
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    page_location: cleanPageLocation(window.location.href),
    page_referrer: document.referrer ? cleanPageLocation(document.referrer) : undefined,
    page_type: pageType,
    debug_mode: new URL(window.location.href).searchParams.get('ga_debug') === '1' || undefined,
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.append(script);
  document.addEventListener('click', handleTrackedClick, true);
}

// 이벤트 보내기 — GA4를 불러오지 않았으면 아무것도 하지 않는다
export function track(name, params) {
  const picked = pickParams(name, params);
  if (!loaded || !picked) return;
  window.gtag('event', name, picked);
}

// 표시만 해 둔 링크 클릭 (강의 카드·추천 순서·보고서 열기)
function handleTrackedClick(event) {
  const target = event.target.closest('a[data-course-id], [data-analytics="report-example-open"]');
  if (!target) return;
  if (target.dataset.analytics === 'report-example-open') {
    track('report_example_open', { placement: document.body.dataset.pageType, item_id: 'c003' });
    return;
  }
  track('select_item', {
    item_id: target.dataset.courseId,
    item_category: target.dataset.courseCategory,
    placement: target.dataset.placement ?? document.body.dataset.pageType,
  });
}

// 방문 통계를 쓰는지 (안내 문구 표시용)
export function isAnalyticsConfigured() {
  return /^G-[A-Z0-9]+$/.test(GA_ID);
}

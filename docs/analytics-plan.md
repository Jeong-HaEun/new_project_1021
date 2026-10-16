# GA4 연결 — 코드 준비 완료, 측정 ID 등록 전

공통 모듈 `src/lib/analytics.js` 한 곳에서 연결한다. 측정 ID(`VITE_GA4_ID`, 공개 값)가 없으면 스크립트·쿠키를 넣지 않는다.
수집 주소는 `https://jeong-haeun.github.io/new_project_1021/` 아래뿐이다. 같은 github.io의 다른 사이트(세시드·Adporter 등)·다른 도메인·내부망 주소(192.168.x.x)에서는 불러오지 않는다.
내 컴퓨터(localhost)에서는 `?ga_debug=1`일 때만 불러온다 (개발 방문 제외, DebugView 확인용). report.html 안에 끼워 넣은 Adporter 화면에는 GA 코드가 없다.
page_view는 GA4 config가 자동으로 한 번 보낸다(정리한 page_location·page_type). 수동 page_view는 보내지 않는다.
안내: 본문 맨 아래 한 줄(VisitNotice) + `privacy.html`. GA4 설정: Google 신호 끔, 데이터 보관 2개월, 향상된 측정의 사이트 검색·양식 상호작용 끔.

## 퍼널

메인 방문 → 강의 탐색 → 상세 조회 → 장바구니 담기(데모) → 주문 확인(데모) → 데모 주문 완료.
데모 주문은 실제 결제가 아니므로 GA4 표준 add_to_cart·begin_checkout·purchase를 쓰지 않고 demo_ 이벤트로 따로 보낸다 (가짜 매출 방지, 금액 value 없음).

| 이벤트 | 시점 | 허용 속성 |
|---|---|---|
| page_view | 각 HTML 최초 진입 | page_type, 개인정보를 제거한 page_location |
| view_item_list | 메인·목록의 강의 표시 | item_list_id, 강의 id 목록, result_count |
| select_item | 강의 카드·추천 학습 순서 클릭 | item_id, item_category, placement |
| view_item | 유효한 강의 상세 표시 | item_id, item_category, price, currency=KRW |
| course_search | 검색 제출 (입력마다 X) | query_length |
| course_filter | 분야 선택 | category_id, result_count |
| report_example_open | 보고서 열기 클릭 (report.html 이동·새 창) | placement(page_type), item_id=c003 |
| demo_add_to_cart | 장바구니 담기 성공 | item_id, item_category, price |
| demo_begin_checkout | 주문 화면 첫 표시 (한 번) | item_count, order_mode(cart/direct) |
| demo_order_complete | 데모 주문 완료 | item_count, order_mode, payment_method |

허용 항목 목록은 `EVENT_PARAMS`(analytics.js)가 기준이며, 그 밖의 항목은 보내지 않는다 (tests/analytics.test.js).

## 코드의 연결 지점

- 카드·학습 순서: `data-course-id`, `data-course-category`, 필요한 경우 `data-placement`.
- 검색 폼: `data-analytics="course-search"`. 현재 입력마다 결과를 갱신하므로 입력 이벤트마다 검색을 기록하지 않는다. 제출 시에만 측정한다.
- 분야 버튼: `data-category-id`.
- 보고서: `data-analytics="report-example-open"`. 보고서 안에서의 이용(CSV 업로드 등)은 이 이벤트로 추정할 수 없다.

검색어 원문, 이메일, 기업명·직무·자소서·경험 입력값은 전송하지 않는다. 검색어가 포함된 q 쿼리는 page_location/referrer에서 제거하고 GA4 향상된 측정의 사이트 검색·URL 수집 설정도 함께 확인한다.
Adporter는 별도 저장소로 report.html에 끼워 넣어 보여 준다. 한클래스 GA4 연결만으로 보고서 안의 행동이나 로그인 계정을 연결하지 않는다.

## 검증

연결 후 GA4 DebugView에서 한 동작당 이벤트 한 번, 0건 검색, 잘못된 강의 주소, 외부 링크 클릭을 확인한다.
계정 로그인 정보와 검색어가 이벤트·페이지 URL에 실리지 않는지 네트워크 요청으로 확인한다.

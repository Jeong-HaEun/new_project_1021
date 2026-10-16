# GA4 연결 계획 — 아직 수집하지 않음

현재는 추적 스크립트·쿠키·측정 ID를 넣지 않았다. 아래는 후속 연결을 위한 설계이며, 실시간 측정이 되고 있다는 뜻이 아니다.
측정 ID(G-...)와 운영 시 개인정보 안내를 확정한 뒤 한 곳의 공통 모듈에서 연결한다. GA4 자동 페이지 조회와 수동 전송이 중복되지 않도록 한다.

## 퍼널

메인 방문 → 강의 탐색 → 상세 조회 → (후속) 장바구니 → 주문 확인 → 실제 구매.
현재 구현된 단계는 상세 조회까지다. 준비 중 버튼 클릭을 add_to_cart, begin_checkout, purchase로 보내지 않는다.

| 이벤트 | 시점 | 허용 속성 |
|---|---|---|
| page_view | 각 HTML 최초 진입 | page_type, 개인정보를 제거한 page_location |
| view_item_list | 메인·목록의 강의 표시 | item_list_id, 강의 id 목록, result_count |
| select_item | 강의 카드·추천 학습 순서 클릭 | item_id, item_category, placement |
| view_item | 유효한 강의 상세 표시 | item_id, item_category, price, currency=KRW |
| course_search | 검색 제출 | query_length, result_count, category_id |
| course_filter | 분야 선택 | category_id, result_count |
| report_example_open | 보고서 열기 클릭 (report.html 이동·새 창) | placement=home/detail, item_id=c003 |

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

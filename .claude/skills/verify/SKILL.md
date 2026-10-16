---
name: verify
description: 한클래스 화면을 브라우저에서 375·768·1080px로 확인하고 콘솔 에러·사이트 규칙을 점검해 보고한다. 화면 작업을 마친 뒤, 커밋 전, 또는 사용자가 /verify나 "화면 확인해줘"라고 할 때 사용.
---

# /verify — 화면 확인 절차

코드는 고치지 않는다. 확인하고 보고만 한다. 문제가 있으면 보고 끝에 "고칠까요?"라고 묻는다.

## 1. 준비
1. `npm test`를 실행해 결과(통과/실패 개수, 실패한 파일)를 기록한다
2. 내장 브라우저(`mcp__Claude_Browser__*`)에서 `preview_start`로 `.claude/launch.json`의 `dev` 서버를 연다
3. 주소는 `http://localhost:<포트>/new_project_1021/` (vite.config.js의 base). 포트는 `preview_start` 결과에 나온 번호를 쓴다
   (다른 세션이 5173을 쓰고 있으면 5174 등으로 바뀐다). 페이지 목록은 vite.config.js의 `input`에서 가져온다
4. 사용자가 특정 페이지를 말했으면 그 페이지만 확인한다

## 2. 페이지마다 폭 3개 확인
폭 순서: **375 → 768 → 1080** (`resize_window`에 width·height를 직접 지정. 375×812, 768×1024, 1080×800)

폭마다:
- 화면 캡처(`computer` screenshot)로 겉모습 확인
- 확인할 것
  - 가로 스크롤이 생기지 않는다: `document.documentElement.scrollWidth <= window.innerWidth`
  - 글자·버튼이 잘리거나 겹치지 않는다
  - 데모 고지 띠("발표용 데모 사이트입니다…")가 보인다
  - 가격이 "1,000원" 형식이다

## 3. 페이지 규칙 점검 (폭과 상관없이 1번만)
`javascript_tool`로 확인한다.
- `meta[name="robots"][content="noindex"]`가 있다
- 빈 링크가 없다: `a[href="#"]`, `a[href=""]`, href 없는 `a` 개수 0
- 모든 `img`에 `alt` 속성이 있다
- 과장 표현이 없다: 본문에 "합격 보장", "100% 취업" 같은 말이 없다

## 4. 콘솔 에러
`read_console_messages`(onlyErrors: true)로 페이지마다 에러를 확인한다.

## 5. 마무리
- `resize_window`를 preset `desktop`으로 되돌린다
- 아래 형식으로 보고한다

```
## /verify 결과
- npm test: 통과 N개 / 실패 N개 (실패 파일)
| 페이지 | 375 | 768 | 1080 | 콘솔 에러 | 규칙 점검 |
|---|---|---|---|---|---|
| index.html | 정상 | 정상 | 가로 스크롤 생김 | 없음 | 정상 |
- 발견한 문제: (어느 페이지, 어느 폭, 무엇이 왜 문제인지 쉬운 말로)
```

다른 세션이 작업 중인 파일 때문에 생긴 문제로 보이면, 그렇다고 따로 적는다.

# 한클래스

> 지금 필요한 실무, 한 강씩.

엑셀·PPT부터 마케팅 실습까지. 마케터 취업준비생과 실무 초보에게 필요한 강의만 골라 1,000~2,000원에 한 강씩, 구독 없이 배우는 서비스의 **발표용 데모 사이트**입니다.

- 데모 사이트: https://jeong-haeun.github.io/new_project_1021/
- 한 강의 = 작은 결과물 1개. 가짜 후기·별점·수강생 수·취업 보장 표현은 쓰지 않습니다.

> ⚠ 실제로 강의를 판매하지 않습니다. 결제는 결제수단 이름만 고르는 데모이며, 카드 정보를 받지 않습니다. 강의 본문·영상·실습 파일은 아직 공개하지 않습니다.

## 페이지

| 페이지 | 내용 |
|---|---|
| `index.html` | 메인 (A/B 실험: 감성형·정보형) |
| `courses.html` | 강의 목록 — 검색·분야 필터 |
| `course.html?id=c002` | 강의 상세 — 목표·대상·차시·결과물·준비물·가격·수강 기간·환불 규정 |
| `cart.html` → `order.html` | 비로그인 장바구니 → 데모 주문 |
| `learn.html?id=c002` | 수강 화면·결과물 완성 체크 |
| `myclass.html` | 내 강의실 — 카카오 로그인 후 데모 수강 기록 |
| `report.html` | 광고 성과 보고서 (Adporter를 한클래스 틀 안에 연결) |
| `helper.html` | 서류 도우미 — 자소서·면접 길잡이 |
| `community.html` | 커뮤니티 — 결과물 공유·질문·자유 |
| `admin.html` | 운영자 페이지 — 회원 통계·신고 글 처리·강의 영상 시험 업로드 (운영자만) |
| `privacy.html` | 개인정보·방문 통계 안내 |

## 기술

- Vite + Vanilla JS, 다중 HTML 페이지, GitHub Pages 배포 (base `/new_project_1021/`)
- Supabase — 카카오 로그인, DB(RLS), Storage, 서버 함수(`doc-helper`)
- 테스트: Vitest

## 로컬에서 실행

```bash
npm install
cp .env.example .env.local   # Supabase URL·공개용(publishable) 키를 채운다. 비밀키는 넣지 않는다
npm run dev                  # http://localhost:5173/new_project_1021/
npm test
npm run build
npm run review               # 강좌 데이터 검토 (🟢/🟡/🔴)
```

`.env.local` 값이 없으면 서버 기능은 '준비 중'으로 표시되고, 나머지 화면은 그대로 동작합니다.

## 폴더

```
*.html               페이지 (Vite 입력, 배포 주소 때문에 루트에 둔다)
src/pages/           페이지별 시작 코드
src/components/      화면 조각
src/lib/             규칙·서버 호출 (순수 함수는 tests/에서 검사)
src/data/courses/    강의별 데이터 (c001~c006)
src/styles/          스타일 (색·글꼴·여백 토큰은 variables.css)
supabase/migrations/ DB 정의 (SQL Editor에 순서대로 적용)
supabase/rollback/   되돌리기 SQL
supabase/functions/  서버 함수
tests/               테스트
docs/                측정 계획·기획 자료
```

## 문서

- [CLAUDE.md](CLAUDE.md) — 작업 규칙
- [SPEC.md](SPEC.md) — 데이터 계약·주소·기능 명세
- [DESIGN.md](DESIGN.md) — 디자인 기준
- [IMAGES.md](IMAGES.md) — 임시 이미지 목록
- [CHANGELOG.md](CHANGELOG.md) — 변경 기록

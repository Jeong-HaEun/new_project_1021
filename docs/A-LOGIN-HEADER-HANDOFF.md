# 작업 A 인계 — 로그인 유지 선택·헤더 회원 표시
확인일: 2026-10-21 / 작업 폴더: C:/Users/dodo7/Desktop/new_project_1021-codex
브랜치: codex/login-header / 기준 HEAD: f054618 / **미커밋·미스테이징**

## 상태

한클래스 작업 A의 구현과 로컬 검증은 완료했습니다. **배포 전 Adporter 패치 적용 및 실제 계정 로그인 왕복 확인이 필요**합니다. 따라서 한클래스만 먼저 배포하고 광고 보고서까지 확인했다고 처리하지 마세요.

원본 main, 다른 worktree, Adporter 소스는 수정하지 않았습니다. 아래 Adporter 패치는 이 작업 폴더 안에 준비만 했고, 현재 Adporter 코드에 대해 git apply --check가 통과한 상태입니다.

## 구현

- 카카오·이메일 로그인/가입 화면과 공통 LoginButtons에 ‘로그인 상태 유지’ 체크박스. 기본 해제.
- 해제 시 sessionStorage, 선택 시 localStorage. 저장소 사용 불가 시 메모리로 대체하며 지속 저장을 강제하지 않음.
- SDK가 실제로 이 저장소와 전용 storageKey를 쓰도록 연결. 초기화 실패 시 기본 localStorage로 조용히 되돌아가지 않음.
- 전용 키: hanclass-sb-<프로젝트 참조>-auth-token. 같은 Supabase를 쓰는 다른 서비스의 기존 기본 저장값은 건드리지 않음. 기존의 무조건 지속 저장 로그인은 새 정책에서 자동으로 재사용하지 않아, 적용 후 한클래스 재로그인이 한 번 필요함.
- OAuth verifier도 선택한 저장소에 보관. 토큰을 iframe URL·로그·HTML 속성으로 넘기지 않음.
- 로그인 처리 중 체크박스 변경을 막음. 로그아웃 성공 후 유지 선택도 해제.
- 헤더 회원 아이콘 오른쪽에 별명 + ‘님’. 긴 별명은 이름만 말줄임하고 ‘님’은 남김.
- 별명 우선순위: user_metadata.nickname → preferred_username → user_name. 이메일·full_name·이전 계정의 커뮤니티 로컬 별명은 대체 표시하지 않음.
- 별명 없으면 한국 시간의 가입일 MMDD + 계정 ID 해시의 고정 6자리. 예: 1021_123456님. 가입일이 잘못됐으면 회원_123456님.
- 번호를 가입 순번으로 만들지 않은 이유: 브라우저에서 전체 회원 목록이나 auth.users 순번을 읽을 필요가 없고, 새로고침·접속 기기가 달라도 안정적이기 때문. 6자리 해시는 충돌 가능성이 있는 표시용 값이며 고유 회원번호·권한 판단에 사용하지 않음.
- 로그인/로그아웃·계정 변경 반영. 로그아웃보다 늦게 도착한 이전 계정 조회 결과는 버림.

## 변경 파일

기존 파일:
- src/components/LoginButtons.js
- src/components/SiteHeader.js
- src/lib/account.js
- src/lib/server.js
- src/pages/loginPage.js
- src/styles/login.css
- CHANGELOG.md

새 소스:
- src/components/HeaderAccount.js
- src/components/RememberLogin.js
- src/lib/authPreference.js
- src/lib/authStorage.js
- src/lib/memberName.js
- src/styles/header-account.css

새 테스트:
- tests/accountSession.test.js
- tests/authSdk.test.js
- tests/authStorage.test.js
- tests/headerAccount.test.js
- tests/memberName.test.js
- tests/serverAuth.test.js

인계 자료:
- docs/A-LOGIN-HEADER-HANDOFF.md (이 파일)
- docs/adporter-session.patch
- docs/verification-login-header/header-widths.png
- docs/verification-login-header/login-widths.png

**변경하지 않음:** myclass·order 관련 소스, supabase/migrations, 강의 데이터·카드·A/B 구조, main 및 다른 worktree. layout.css는 최종적으로 원본 그대로이며 헤더 전용 새 CSS에만 추가 스타일을 둠.

## 검증 결과

- npm test: **41개 파일·631개 테스트 통과**.
- npm run build: 성공.
- git diff --check: 통과. Git의 LF/CRLF 안내는 있으나 공백 오류 없음.
- src 파일 200줄 제한 통과.
- 실제 Supabase SDK를 사용하는 네트워크 차단 모의 테스트:
  - 선택/해제 두 모드에서 같은 탭·같은 출처 iframe용 클라이언트의 세션 공유.
  - 카카오 PKCE URL 생성, verifier의 다음 페이지 보존.
  - 새 탭 세션에서 해제 로그인 소멸, 선택 로그인 지속.
  - 다른 서비스 저장값 격리, 저장소 제한, 늦은 계정 조회와 로그아웃, 이름의 HTML 실행 방지.
- 실제 브라우저 로그인 화면: 기본 체크 해제, 클릭해 선택, 회원가입 탭 전환 뒤 선택 유지 확인.
- 375·768·1080px 실제 iframe viewport에서 화면 확인. 헤더 긴 별명은 **표시 전용 모형**이며 실제 계정 로그인으로 위장하지 않음.
  - 헤더 document.scrollWidth: 375 / 768 / 1080, 회원 링크 오른쪽: 359 / 736 / 1048. 가로 넘침 없음.
  - 로그인 본문 scrollWidth: 360 / 753 / 1065 (세로 스크롤바 15px 제외), 기본 체크 false. 가로 넘침 없음.
- 작업 A 코드로 로컬 13개 페이지 비로그인 콘솔 점검: error/warn 없음.
  index(?ab_preview=B), courses, course(c002), cart, order, learn(c002), myclass, report, helper, community, admin, login, privacy.
- 화면 검증용 임시 HTML은 삭제했고 빌드에 포함되지 않음.
- 실제 카카오/이메일 계정의 로그인 왕복·브라우저 종료 실물 테스트·배포된 Adporter iframe 테스트는 아직 하지 않음. 모의 테스트를 실제 계정 확인으로 표현하지 않음.

## 필수 통합: Adporter에도 같은 정책 적용

현재 Adporter src/api/supabase.js는 Supabase 기본 localStorage를 읽습니다. 한클래스의 기본 해제 로그인은 탭 저장소와 전용 키를 쓰므로 **패치를 함께 적용하지 않으면 광고 보고서가 로그인되지 않은 것으로 보일 수 있습니다.**

CLI가 담당하는 Adporter 작업 공간에서:
1. 변경 파일이 겹치는지 먼저 확인.
2. docs/adporter-session.patch를 Adporter에 적용. 패치가 적용하는 파일은 src/api/authStorage.js(새 파일), src/api/supabase.js 두 개뿐.
3. 같은 Supabase URL·출처·탭의 iframe인지 확인. iframe이 다른 출처이거나 별도 탭이면 해제 세션은 공유되지 않음.
4. Adporter 테스트·빌드 후 한클래스와 함께 검증/배포. 기존 flowType: pkce는 유지.
5. 한클래스와 Adporter 모두 동일 storageKey와 createBrowserAuthStorage 구현이어야 함.

참고 적용 명령(Adporter 폴더에서 실행):
    git apply --check --ignore-space-change C:/Users/dodo7/Desktop/new_project_1021-codex/docs/adporter-session.patch
    git apply --ignore-space-change C:/Users/dodo7/Desktop/new_project_1021-codex/docs/adporter-session.patch

이 패치는 Codex가 다른 저장소에 적용하거나 커밋하지 않았습니다. 기존 Adporter 수정이 있으면 파일 단위로 검토 후 맞춰 주세요.

## 실제 계정으로 남은 확인

- 카카오와 이메일 각각, 기본 해제/선택 로그인 → 헤더 → 내 강의실 → report.html iframe.
- 로그아웃하면 헤더·iframe 모두 로그아웃되고, 다른 계정으로 바꿔도 이전 별명이 보이지 않는지.
- 해제: 새로고침에는 유지, 탭 닫기/브라우저 종료 후 새 세션에는 유지하지 않는지.
- 선택: 새 탭·브라우저 재시작 뒤에도 유지되는지.
- 카카오 복귀, 이메일 인증/비밀번호 재설정 링크가 기존 동선으로 돌아오는지.
- 로컬 검증 포트는 5183. Supabase Redirect URLs 허용 여부는 확인하지 않았으므로, 실제 OAuth는 허용된 로컬 주소 또는 최종 배포 주소에서 검증.

sessionStorage는 브라우저의 이전 탭/세션 복원 설정에 따라 복원될 수 있습니다. 브라우저 종료·전원 종료 자체를 웹 페이지가 확실히 감지할 수는 없습니다. 이번 정책은 탭 세션 저장이며, 모든 복원 시나리오에서 서버 세션까지 즉시 만료시키는 기능으로 표현하면 안 됩니다. 공용 기기는 명시적 로그아웃이 필요합니다.
- Supabase: https://supabase.com/docs/reference/javascript/auth
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage

## 병합·커밋

- 현재 HEAD는 f054618, 변경은 아직 작업 트리에만 있습니다. **빈 브랜치를 그대로 merge/cherry-pick해도 변경이 오지 않습니다.**
- CLI가 이 작업 폴더의 변경을 리뷰하고 사용자 승인 흐름에 따라 codex/login-header에 커밋한 후 main 통합을 진행해 주세요.
- main 커밋·푸시·병합은 Codex가 하지 않았습니다.
- 작업 B에서 헤더에 포인트를 붙일 때 HeaderAccount 옆에 별도 요소를 추가하고, 인증·이름 로직은 중복 구현하지 않도록 권장.
- CHANGELOG.md는 작업 B도 추가했을 수 있으니 두 작업 기록을 모두 살려 병합.

## 발표 자료로 넘길 협업 기록

사용자가 요청한 ‘여러 AI 세션으로 함께 개발하며 생긴 문제와 해결’을 이후 발표 자료에 반영할 때 사용할 사실 목록:
- 같은 폴더의 Claude 데스크톱·Claude CLI·Codex 동시 작업.
- 장바구니 테스트 중복, 이미 다른 세션에서 만들던 주문 화면, CHANGELOG 병합 충돌.
- 파일 분담과 커밋·푸시 단일 담당 규칙.
- 커뮤니티, 출석 포인트, 로그인·헤더를 별도 worktree/브랜치로 격리.
- noindex·데모 고지·빈 링크·과장 표현 검사, 로직 TDD, 강좌 신호등(npm run review), 테스트 완료 hook, /verify 화면 확인 절차.
- 사용자 제공 배운 점: “AI를 여러 개 쓸수록 역할·파일·커밋 담당을 먼저 정해야 한다.”
발표 파일은 이번 작업 폴더 밖이므로 이번 작업 A에서 직접 변경하지 않았습니다.

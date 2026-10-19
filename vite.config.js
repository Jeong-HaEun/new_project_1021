import { defineConfig } from 'vite';

// GitHub Pages는 https://<아이디>.github.io/<저장소이름>/ 주소로 열리므로
// base를 저장소 이름으로 맞춰야 CSS·JS 경로가 깨지지 않는다.
const REPO_NAME = 'new_project_1021';

export default defineConfig({
  base: `/${REPO_NAME}/`,
  build: {
    // 여러 페이지 사이트: 페이지를 추가할 때마다 여기에 HTML 파일을 등록한다
    rolldownOptions: {
      input: {
        main: 'index.html',
        courses: 'courses.html',
        course: 'course.html',
        cart: 'cart.html',
        order: 'order.html',
        learn: 'learn.html',
        myclass: 'myclass.html',
        report: 'report.html',
        privacy: 'privacy.html',
        helper: 'helper.html',
        community: 'community.html',
        admin: 'admin.html',
      },
    },
  },
  // 개발 서버: /new_project_oct/ 를 로컬 Adporter(5176)로 넘겨 배포처럼 같은 주소에서 열리게 한다 (로그인 공유 확인용)
  // Adporter는 `npx vite --port 5176 --base /new_project_oct/` 로 켠다
  server: {
    proxy: {
      '/new_project_oct': { target: 'http://localhost:5176', changeOrigin: true, ws: true },
    },
  },
  test: {
    // 테스트 파일은 tests/ 폴더에만 둔다
    include: ['tests/**/*.test.js'],
  },
});

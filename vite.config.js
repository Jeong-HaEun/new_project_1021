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
      },
    },
  },
  test: {
    // 테스트 파일은 tests/ 폴더에만 둔다
    include: ['tests/**/*.test.js'],
  },
});

// 메인 페이지 시작 파일 — 지금은 뼈대만. 섹션은 하나씩 추가한다
import '../styles/variables.css';
import '../styles/base.css';
import { el } from '../lib/dom.js';
import { SITE_NAME, SITE_TAGLINE } from '../lib/site.js';
import { DemoNotice } from '../components/DemoNotice.js';

document.title = SITE_NAME;

const app = document.querySelector('#app');
app.append(
  el('main', {}, [
    el('h1', { text: SITE_NAME }),
    el('p', { className: 'text-muted', text: SITE_TAGLINE }),
  ]),
  DemoNotice(),
);

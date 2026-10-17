// 광고 성과 보고서 — report.html. 한클래스 틀(헤더·데모 고지·탭바) 안에 Adporter 화면을 끼워 넣는다 (SPEC.md 5절)
// 로그인은 한클래스가 맡고, Adporter는 같은 도메인의 로그인 정보로 내 보고서를 연다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { isServerConfigured } from '../lib/server.js';
import { getCurrentUser, onAuthChange, signInWithKakao } from '../lib/account.js';
import { getReportPageState, REPORT_APP_PATH, REPORT_FRAME_PATH } from '../lib/report.js';
import { renderPage } from '../components/PageLayout.js';
import { showToast } from '../components/Toast.js';
import '../styles/courses.css';
import '../styles/myclass.css';
import '../styles/report-page.css';

const configured = isServerConfigured();
const body = el('div', { className: 'report-body' });
const view = { user: undefined, failed: false };

const REPORT_NOTE = '실습용 광고 데이터를 CSV로 올려 지표를 확인해요. 샘플 숫자는 설명용 가상 수치예요.';

// 모바일(768px 미만)에서는 보고서 대신 이 안내만 보인다 (CSS로 전환, 제작 우선으로 PC 전용)
function MobileNotice() {
  return el('div', { className: 'empty-state report-mobile-notice', role: 'note' }, [
    icon('marketing-practice', 32),
    el('strong', { text: '광고 보고서는 PC에서 이용할 수 있어요' }),
    el('p', { className: 'text-muted', text: 'CSV 업로드·내려받기가 필요한 기능이라 지금은 PC 화면에서만 제공해요. 모바일에서 보이지 않는 점 양해 부탁드려요.' }),
  ]);
}

async function handleLogin() {
  try {
    await signInWithKakao('report.html');
  } catch {
    showToast('카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
}

function Panel(children) {
  return el('div', { className: 'empty-state myclass-panel' }, children);
}

const PANELS = {
  unavailable: () => Panel([icon('marketing-practice', 32), el('strong', { text: '보고서 서버 연결을 준비하고 있어요' })]),
  loading: () => Panel([el('p', { className: 'text-muted', role: 'status', text: '불러오는 중이에요…' })]),
  error: () =>
    Panel([
      el('strong', { role: 'alert', text: '로그인 상태를 확인하지 못했어요' }),
      el('button', { type: 'button', className: 'button button--primary', onClick: init, text: '다시 시도' }),
    ]),
  'signed-out': () =>
    Panel([
      icon('user', 32),
      el('strong', { text: '카카오로 로그인하면 내 광고 보고서가 열려요' }),
      el('p', { className: 'text-muted', text: '올린 CSV는 내 계정에만 저장돼요. 다른 사람은 볼 수 없어요.' }),
      el('button', { type: 'button', className: 'button kakao-login', onClick: handleLogin, text: '카카오로 로그인' }),
    ]),
  ready: () => {
    const openLink = el('a', {
      href: REPORT_APP_PATH, target: '_blank', rel: 'noopener noreferrer', className: 'report-open button button--secondary',
      text: '새 창에서 크게 보기 ↗', 'data-analytics': 'report-example-open',
    });
    const hint = el('p', { className: 'report-frame-hint text-muted', text: '보고서를 연결하고 있어요…' });
    const wrapper = el('div', { className: 'report-frame-wrap' }, [hint]);

    // fetch 탐색: 같은 출처 요청이라 CORS 없이 확인 가능 (localhost 프록시·GitHub Pages 모두)
    fetch(REPORT_FRAME_PATH, { method: 'HEAD', cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        const frame = el('iframe', { className: 'report-frame', src: REPORT_FRAME_PATH, title: 'Adporter 광고 성과 보고서' });
        frame.addEventListener('load', () => hint.remove(), { once: true });
        wrapper.appendChild(frame);
      })
      .catch(() => {
        body.replaceChildren(
          Panel([
            icon('marketing-practice', 32),
            el('strong', { text: '보고서를 불러오지 못했어요' }),
            el('p', { className: 'text-muted', text: '잠시 후 다시 시도하거나 새 창에서 열어 주세요.' }),
            el('a', {
              href: REPORT_APP_PATH, target: '_blank', rel: 'noopener noreferrer',
              className: 'button button--primary',
              text: '새 창에서 열기 ↗', 'data-analytics': 'report-example-open',
            }),
            el('button', { type: 'button', className: 'button button--ghost', onClick: init, text: '다시 시도' }),
          ])
        );
      });

    return [openLink, wrapper];
  },
};

function render() {
  const state = getReportPageState({ configured, ...view });
  body.setAttribute('aria-busy', String(state === 'loading'));
  body.replaceChildren(...[].concat(PANELS[state]()));
}

async function init() {
  Object.assign(view, { user: undefined, failed: false });
  render();
  try {
    view.user = await getCurrentUser();
    await onAuthChange((user) => {
      if ((user?.id ?? null) !== (view.user?.id ?? null)) {
        view.user = user;
        render();
      }
    });
  } catch {
    view.failed = true;
  }
  render();
}

renderPage({
  active: 'report',
  title: '광고 성과 보고서',
  content: [
    el('h1', { className: 'page-title', text: '광고 성과 보고서' }),
    el('p', { className: 'page-desc text-muted', text: REPORT_NOTE }),
    MobileNotice(),
    body,
  ],
});

if (configured) init();
else render();

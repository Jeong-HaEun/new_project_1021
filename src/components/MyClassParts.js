// 내 강의실 화면 조각 — 상태별 안내(서버 연결 전·로그인 안내·불러오는 중·실패·빈 화면)와 신청 강의 목록
// 데모 수강 신청은 실제 구매가 아니다. 목록의 [수강 화면]도 제목·길이만 보여 준다 (유료 본문 없음)
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { assetUrl } from '../lib/paths.js';

export const DEMO_ENROLL_NOTE = '데모 수강 신청 기록이에요. 실제 구매가 아니며 유료 콘텐츠가 열리지 않아요.';

const formatDate = (iso) => new Date(iso).toLocaleDateString('ko-KR');

function Panel(className, children) {
  return el('div', { className: `empty-state myclass-panel ${className}`.trim() }, children);
}

const browseLink = () => el('a', { href: 'courses.html', className: 'button button--primary', text: '강의 둘러보기' });

export function UnavailablePanel() {
  return Panel('', [
    icon('book', 32),
    el('strong', { text: '내 강의실은 서버 연결 준비 중이에요' }),
    el('p', { className: 'text-muted', text: '지금은 데모 주문 기록이 이 브라우저에만 남아요. 아래 목록에서 수강 화면을 열 수 있어요.' }),
  ]);
}

export function SignedOutPanel(onLogin) {
  return Panel('', [
    icon('user', 32),
    el('strong', { text: '로그인하면 데모 수강 신청 기록을 계정에 저장해요' }),
    el('p', { className: 'text-muted', text: '다른 기기에서 같은 계정으로 들어와도 신청한 강의를 볼 수 있어요.' }),
    el('button', { type: 'button', className: 'button kakao-login', onClick: onLogin, text: '카카오로 로그인' }),
    el('p', { className: 'myclass-note', text: '이 브라우저의 데모 주문 기록은 계정으로 자동으로 옮겨지지 않아요.' }),
  ]);
}

export function LoadingPanel() {
  return Panel('', [el('p', { className: 'text-muted', role: 'status', text: '불러오는 중이에요…' })]);
}

export function ErrorPanel(onRetry) {
  return Panel('', [
    el('strong', { role: 'alert', text: '내 강의실을 불러오지 못했어요' }),
    el('p', { className: 'text-muted', text: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.' }),
    el('button', { type: 'button', className: 'button button--primary', onClick: onRetry, text: '다시 시도' }),
  ]);
}

export function EmptyPanel() {
  return Panel('', [
    icon('book', 32),
    el('strong', { text: '아직 데모 수강 신청한 강의가 없어요' }),
    el('p', { className: 'text-muted', text: '로그인한 상태로 데모 주문을 하면 여기에 모여요.' }),
    browseLink(),
  ]);
}

// 강의 한 줄 — 썸네일·제목·결과물·날짜·[수강 화면]
function ClassItem({ course, enrolledAt }, label, done = false) {
  return el('li', { className: 'cart-item myclass-item' }, [
    el('a', { href: `course.html?id=${course.id}`, className: 'cart-item__thumb' }, [
      el('img', { src: assetUrl(course.thumbnail), alt: `${course.title} 임시 이미지`, width: '640', height: '400' }),
    ]),
    el('div', { className: 'cart-item__info' }, [
      el('div', { className: 'myclass-badges' }, [
        el('span', { className: 'badge badge--preview', text: label }),
        done ? el('span', { className: 'badge myclass-done', text: '결과물 완성' }) : null,
      ]),
      el('a', { href: `course.html?id=${course.id}`, className: 'cart-item__title', text: course.title }),
      el('p', { className: 'cart-item__outcome', text: `결과물 · ${course.outcome}` }),
      enrolledAt ? el('p', { className: 'myclass-date', text: `${formatDate(enrolledAt)} 신청` }) : null,
    ]),
    el('a', { href: `learn.html?id=${course.id}`, className: 'button button--ghost myclass-item__learn', text: '수강 화면' }),
  ]);
}

// outcomes: 결과물 완성 체크한 강의 id
export function EnrollmentList(enrollments, outcomes = []) {
  return el('section', { className: 'myclass-section' }, [
    el('h2', { className: 'myclass-section__title', text: `데모 수강 신청 ${enrollments.length}개` }),
    el('ul', { className: 'cart-list' }, enrollments.map((item) => ClassItem(item, '데모 신청', outcomes.includes(item.course.id)))),
  ]);
}

// 이 브라우저에만 있는 데모 주문 — 계정 기록과 섞지 않고 따로 보여 준다
export function BrowserOrders(courses) {
  if (courses.length === 0) return null;
  return el('section', { className: 'myclass-section' }, [
    el('h2', { className: 'myclass-section__title', text: '이 브라우저의 데모 주문' }),
    el('p', { className: 'myclass-note', text: '계정에 저장되지 않은 기록이에요. 브라우저 기록을 지우면 사라져요.' }),
    el('ul', { className: 'cart-list' }, courses.map((course) => ClassItem({ course }, '이 브라우저'))),
  ]);
}

export function AccountBar(onLogout) {
  return el('div', { className: 'myclass-account' }, [
    el('span', { text: '카카오 계정으로 로그인했어요' }),
    el('button', { type: 'button', className: 'button button--ghost', onClick: onLogout, text: '로그아웃' }),
  ]);
}

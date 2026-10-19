// 운영자 페이지 화면 조각 — 상태 안내, 회원 통계, 강의별 신청, 날짜별 새 회원, 신고·숨김 글 처리
// 숫자는 DB에 저장된 로그인 회원 기록만이다. 실제 결제·매출이 아니며, 비로그인 데모 주문은 세지 않는다
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { shortDay } from '../lib/adminView.js';
import { formatPostDate } from '../lib/communityView.js';
import { OfficialBadge } from './OfficialBadge.js';

export const ADMIN_NOTE = '로그인한 회원이 서버에 남긴 기록만 세요. 실제 결제·매출이 아니고, 비로그인 데모 주문은 포함되지 않아요.';

function Panel(children) {
  return el('div', { className: 'empty-state admin-panel' }, children);
}

export function UnavailablePanel() {
  return Panel([icon('lock', 32), el('strong', { text: '운영자 페이지는 서버 연결 준비 중이에요' })]);
}

export function LoadingPanel() {
  return Panel([el('p', { className: 'text-muted', role: 'status', text: '불러오는 중이에요…' })]);
}

export function SignedOutPanel(onLogin) {
  return Panel([
    icon('lock', 32),
    el('strong', { text: '운영자만 볼 수 있는 페이지예요' }),
    el('p', { className: 'text-muted', text: '운영자 계정으로 로그인해 주세요.' }),
    el('button', { type: 'button', className: 'button kakao-login', onClick: onLogin, text: '카카오로 로그인' }),
  ]);
}

// 운영자 명단에 없는 계정 — 최초 지정용으로 본인 계정 ID만 보여 준다 (다른 사람 정보는 없음)
export function NotAdminPanel(userId, onLogout, notReady = false) {
  return Panel([
    icon('lock', 32),
    el('strong', { text: notReady ? '운영자 기능이 아직 서버에 적용되지 않았어요' : '이 계정은 운영자가 아니에요' }),
    el('p', { className: 'text-muted', text: '운영자 지정은 Supabase SQL Editor에서 사람이 직접 해요. 지정할 때 아래 내 계정 ID를 써요.' }),
    el('code', { className: 'admin-id', text: userId }),
    el('button', { type: 'button', className: 'button button--ghost', onClick: onLogout, text: '로그아웃' }),
  ]);
}

export function ErrorPanel(onRetry) {
  return Panel([
    el('strong', { role: 'alert', text: '운영 정보를 불러오지 못했어요' }),
    el('button', { type: 'button', className: 'button button--primary', onClick: onRetry, text: '다시 시도' }),
  ]);
}

export function AccountBar(role, onLogout) {
  return el('div', { className: 'admin-account' }, [
    OfficialBadge(),
    el('span', { text: role === 'super_admin' ? '최고 관리자로 로그인했어요' : '운영자로 로그인했어요' }),
    el('button', { type: 'button', className: 'button button--ghost', onClick: onLogout, text: '로그아웃' }),
  ]);
}

function Section(title, children, note = null) {
  return el('section', { className: 'admin-section' }, [
    el('h2', { className: 'admin-section__title', text: title }),
    note ? el('p', { className: 'admin-note', text: note }) : null,
    ...children,
  ]);
}

function StatGrid(items) {
  return el('dl', { className: 'admin-stats' }, items.map((item) =>
    el('div', { className: 'admin-stat' }, [
      el('dt', { text: item.label }),
      el('dd', { text: item.value.toLocaleString('ko-KR') }),
    ])));
}

function Table(caption, head, rows) {
  return el('div', { className: 'admin-table-wrap' }, [
    el('table', { className: 'admin-table', 'aria-label': caption }, [
      el('thead', {}, el('tr', {}, head.map((text) => el('th', { scope: 'col', text })))),
      el('tbody', {}, rows),
    ]),
  ]);
}

export function OverviewSections(overview) {
  const courseRows = overview.byCourse.length
    ? overview.byCourse.map((row) => el('tr', {}, [
      el('th', { scope: 'row', text: row.title }),
      el('td', { text: String(row.enrollments) }),
      el('td', { text: String(row.outcomes) }),
      el('td', { text: row.rate === null ? '-' : `${row.rate}%` }),
    ]))
    : [el('tr', {}, el('td', { colspan: '4', text: '아직 데모 수강 신청이 없어요' }))];
  const dayRows = overview.days.map((row) => el('tr', {}, [el('th', { scope: 'row', text: shortDay(row.day) }), el('td', { text: String(row.count) })]));
  return [
    Section('회원', [StatGrid(overview.members)], '한클래스에 신청·완성 체크·글·댓글·서류 도우미 기록이 하나라도 있는 회원이에요.'),
    Section('활동', [StatGrid(overview.activity)]),
    Section('강의별 데모 수강 신청', [Table('강의별 데모 수강 신청과 완성 체크', ['강의', '신청', '완성 체크', '완성률'], courseRows)]),
    Section('최근 14일 새 회원', [Table('날짜별 새 회원 수', ['날짜', '새 회원'], dayRows)]),
  ];
}

// 신고·숨김 글 — 숨긴 글은 [다시 보이기], 신고만 있는 글은 [숨기기], 둘 다 [삭제](두 번 눌러야 실행)
export function ReportedSection(posts, { onToggle, onDelete, busyId }) {
  const item = (post) => {
    const busy = busyId === post.id;
    const remove = el('button', { type: 'button', className: 'button button--ghost community-danger', text: '삭제' });
    remove.addEventListener('click', () => {
      if (remove.dataset.armed) onDelete(post);
      else Object.assign(remove, { textContent: '한 번 더 누르면 삭제' }).dataset.armed = '1';
    });
    if (busy) remove.setAttribute('disabled', '');
    return el('li', { className: 'admin-report' }, [
      el('div', { className: 'admin-report__head' }, [
        post.hidden ? el('span', { className: 'badge badge--soon', text: '숨김' }) : null,
        post.hidden // 숨긴 글은 글쓴이에게만 보여서 링크를 걸지 않는다
          ? el('strong', { className: 'admin-report__title', text: post.title })
          : el('a', { href: `community.html?post=${post.id}`, className: 'admin-report__title', text: post.title }),
      ]),
      el('p', { className: 'admin-note', text: `${post.authorName} · ${formatPostDate(post.createdAt)} · 신고 ${post.reportCount}${post.reasons ? ` (${post.reasons})` : ''}` }),
      el('div', { className: 'community-actions' }, [
        el('button', { type: 'button', className: 'button button--ghost', onClick: () => onToggle(post), ...(busy && { disabled: '' }), text: post.hidden ? '다시 보이기' : '숨기기' }),
        remove,
      ]),
    ]);
  };
  const body = posts.length ? el('ul', { className: 'admin-reports' }, posts.map(item)) : el('p', { className: 'text-muted', text: '처리할 신고가 없어요' });
  return Section('신고·숨김 글', [body], '다시 보이게 하면 쌓인 신고는 지워져요. 처리 내용은 활동 기록에 남아요.');
}

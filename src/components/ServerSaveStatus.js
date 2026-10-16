// 주문 완료 후 내 강의실(서버)에 데모 수강 신청 저장 — 로그인했을 때만. 실패하면 다시 저장 버튼
// 브라우저 기록을 계정으로 자동으로 옮기지 않는다. 이번 주문에서 새로 신청한 강의만 저장한다
import { el } from '../lib/dom.js';
import { isServerConfigured } from '../lib/server.js';
import { getCurrentUser } from '../lib/account.js';
import { saveDemoEnrollments } from '../lib/enrollmentApi.js';

const myClassLink = (text) => el('a', { href: 'myclass.html', className: 'button button--ghost', text });

export function ServerSaveStatus(courseIds) {
  const box = el('div', { className: 'server-save', role: 'status' });
  const show = (children) => box.replaceChildren(...children);

  async function handleSave() {
    show([el('p', { text: '내 강의실에 저장하는 중이에요…' })]);
    try {
      await saveDemoEnrollments(courseIds);
      show([el('p', { text: '내 강의실에 데모 수강 신청으로 저장했어요.' }), myClassLink('내 강의실 보기')]);
    } catch {
      show([
        el('p', { text: '내 강의실 저장에 실패했어요. 이번 기록은 이 브라우저에는 남아 있어요.' }),
        el('button', { type: 'button', className: 'button button--primary', onClick: handleSave, text: '다시 저장' }),
      ]);
    }
  }

  async function start() {
    if (!isServerConfigured()) {
      show([el('p', { text: '내 강의실 서버 연결은 준비 중이에요. 이번 데모 주문은 이 브라우저에만 남아요.' })]);
      return;
    }
    try {
      if (await getCurrentUser()) {
        handleSave();
        return;
      }
    } catch {
      // 로그인 확인 실패 — 로그인 안내로 넘어간다
    }
    show([
      el('p', { text: '카카오로 로그인하면 다음 데모 주문부터 내 강의실에 저장돼요. 이번 주문은 이 브라우저에만 남아요.' }),
      myClassLink('내 강의실에서 로그인'),
    ]);
  }

  start();
  return box;
}

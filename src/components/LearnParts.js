// 수강 화면 조각 — 차시 목록, 결과물 완성 체크, 데모 초기화
// 열린 차시도 제목·길이만 보여 준다. 영상·실습 파일은 준비 중 (유료 본문은 사이트에 올리지 않음)
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { SoonButton } from './ComingSoon.js';

const STATE_TEXT = {
  owned: '구매한 강의예요. 모든 차시가 열려 있어요.',
  preview: '구매 전이에요. 맛보기 차시만 볼 수 있어요.',
  planned: '제작 예정 강의예요. 맛보기 차시만 미리 볼 수 있어요.',
};

const RESET_CONFIRM_MS = 5000;

export function LearnStatus(course, view) {
  return el('div', { className: `learn-status learn-status--${view.state}` }, [
    el('p', { text: STATE_TEXT[view.state] }),
    el('p', { className: 'learn-status__count', text: `열린 차시 ${view.openCount} / ${view.lessons.length}` }),
    view.state === 'preview'
      ? el('a', { href: `course.html?id=${course.id}`, className: 'button button--primary', text: '강의 상세에서 구매하기' })
      : null,
  ]);
}

function LessonAccess(lesson) {
  if (lesson.access === 'locked') {
    return el('span', { className: 'learn-lesson__locked' }, [icon('lock', 16), el('span', { text: '구매 후 열림' })]);
  }
  return el('span', { className: 'learn-lesson__open' }, [
    el('span', { className: 'badge badge--preview', text: lesson.access === 'preview' ? '맛보기' : '열림' }),
    SoonButton({ label: '재생', iconNode: icon('play', 16) }),
  ]);
}

export function LessonList(view) {
  return el('section', { className: 'learn-section' }, [
    el('h2', { className: 'learn-section__title', text: '차시' }),
    el(
      'ol',
      { className: 'lesson-list' },
      view.lessons.map((lesson, index) =>
        el('li', { className: `lesson learn-lesson learn-lesson--${lesson.access}` }, [
          el('span', { className: 'lesson__no', text: String(index + 1) }),
          el('span', { className: 'lesson__title', text: lesson.title }),
          el('span', { className: 'lesson__meta' }, [el('span', { text: `${lesson.minutes}분` }), LessonAccess(lesson)]),
        ]),
      ),
    ),
    el('p', { className: 'learn-note', text: '영상과 실습 파일은 준비 중이에요. 데모 사이트에는 유료 본문을 올리지 않아요.' }),
  ]);
}

// 결과물 완성 체크 — 구매한 강의만. 다시 누르면 취소
export function OutcomeCheck(course, view, onToggle) {
  const action = view.canCheckOutcome
    ? el(
        'button',
        {
          type: 'button',
          className: `button ${view.outcomeDone ? 'button--ghost button--done' : 'button--primary'} outcome-toggle`,
          'aria-pressed': String(view.outcomeDone),
          onClick: onToggle,
        },
        [icon('check', 18), el('span', { text: view.outcomeDone ? '완성 체크됨 (다시 누르면 취소)' : '결과물을 완성했어요' })],
      )
    : el('p', { className: 'text-muted', text: '구매한 뒤에 완성 체크를 할 수 있어요.' });
  return el('section', { className: 'learn-section' }, [
    el('h2', { className: 'learn-section__title', text: '결과물 완성 체크' }),
    el('div', { className: 'outcome-box' }, [
      el('span', { className: 'outcome-box__label', text: '이 강의의 결과물' }),
      el('strong', { className: 'outcome-box__value', text: course.outcome }),
    ]),
    action,
  ]);
}

// 데모 초기화 — 실수로 지우지 않도록 두 번 눌러야 실행된다
export function DemoReset(onReset) {
  let timer = null;
  const label = el('span', { text: '데모 초기화' });
  const button = el('button', { type: 'button', className: 'button button--ghost demo-reset__button' }, [label]);

  function disarm() {
    button.dataset.armed = '';
    label.textContent = '데모 초기화';
  }

  function handleResetClick() {
    if (button.dataset.armed === 'true') {
      clearTimeout(timer);
      disarm();
      onReset();
      return;
    }
    button.dataset.armed = 'true';
    label.textContent = '한 번 더 누르면 모두 지워져요';
    timer = setTimeout(disarm, RESET_CONFIRM_MS);
  }

  button.addEventListener('click', handleResetClick);
  return el('section', { className: 'learn-section demo-reset' }, [
    el('h2', { className: 'learn-section__title', text: '데모 초기화' }),
    el('p', { className: 'text-muted', text: '발표 시연을 처음부터 다시 할 때 써요. 이 브라우저의 장바구니·구매 기록·결과물 체크가 모두 지워져요.' }),
    button,
  ]);
}

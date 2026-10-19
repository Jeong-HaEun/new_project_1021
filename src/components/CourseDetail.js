// 강의 상세의 구역들 — 학습 목표·추천 대상·커리큘럼·결과물·준비물·구매 전 확인 (가격·구매 버튼은 PurchaseBox.js)
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { assetUrl } from '../lib/paths.js';
import { getCategoryName, totalMinutes } from '../lib/courseQuery.js';
import { StatusBadge } from './CourseCard.js';
import { formatEnrollmentPeriod } from '../lib/enrollment.js';

const section = (title, children) =>
  el('section', { className: 'detail-section' }, [el('h2', { className: 'detail-section__title', text: title }), ...children]);

const bulletList = (items, className = 'bullet-list') =>
  el('ul', { className }, items.map((item) => el('li', { text: item })));

export function DetailHero(course, categories) {
  return el('div', { className: 'detail-hero' }, [
    el('div', { className: 'detail-hero__thumb' }, [
      el('img', { src: assetUrl(course.thumbnail), alt: `${course.title} 임시 이미지`, width: '640', height: '400' }),
    ]),
    el('div', { className: 'detail-hero__info' }, [
      el('div', { className: 'detail-hero__badges' }, [
        el('span', { className: 'chip chip--small', text: getCategoryName(course.category, categories) }),
        StatusBadge(course),
      ]),
      el('h1', { className: 'page-title', text: course.title }),
      el('p', { className: 'text-muted', text: course.summary }),
      el('div', { className: 'outcome-box' }, [
        el('span', { className: 'outcome-box__label', text: '이 강의를 마치면' }),
        el('strong', { className: 'outcome-box__value', text: course.outcome }),
      ]),
    ]),
  ]);
}

export function Curriculum(course) {
  const lessons = course.lessons.map((lesson, index) =>
    el('li', { className: 'lesson' }, [
      el('span', { className: 'lesson__no', text: String(index + 1) }),
      el('span', { className: 'lesson__title', text: lesson.title }),
      el('span', { className: 'lesson__meta' }, [
        lesson.isPreview ? el('span', { className: 'badge badge--preview', text: '맛보기' }) : icon('lock', 16),
        el('span', { text: `${lesson.minutes}분` }),
      ]),
    ]),
  );
  return section('커리큘럼', [
    el('p', { className: 'detail-section__sub', text: `총 ${course.lessons.length}차시 · ${totalMinutes(course)}분` }),
    el('ol', { className: 'lesson-list' }, lessons),
  ]);
}

// extra: 준비물 바로 아래에 붙일 구역 (강의 자료 목록 — 자료가 없으면 스스로 숨는다)
export function DetailBody(course, extra = null) {
  return el('div', { className: 'detail-body' }, [
    section('학습 목표', [bulletList(course.learn, 'check-list')]),
    section('이런 분께 추천해요', [bulletList(course.target)]),
    Curriculum(course),
    section('준비물', [bulletList(course.materials)]),
    extra,
    section('구매 전 확인해 주세요', [
      el('dl', { className: 'info-list' }, [
        ['완성 결과물', course.outcome],
        ['모집 기간', formatEnrollmentPeriod(course.enrollment)],
        ['추가 도구 비용', course.extraCost],
        ['수강 기간', course.accessPeriod],
        ['환불 규정', course.refundPolicy],
      ].flatMap(([term, desc]) => [el('dt', { text: term }), el('dd', { text: desc })])),
    ]),
  ]);
}

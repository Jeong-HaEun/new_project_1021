// 강의 상세의 구역들 — 학습 목표·추천 대상·커리큘럼·결과물·준비물·구매 전 확인
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { assetUrl } from '../lib/paths.js';
import { formatPrice } from '../lib/price.js';
import { getCategoryName, totalMinutes } from '../lib/courseQuery.js';
import { StatusBadge } from './CourseCard.js';
import { formatEnrollmentPeriod, getCourseBadge } from '../lib/enrollment.js';
import { SoonButton } from './ComingSoon.js';

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

export function DetailBody(course) {
  return el('div', { className: 'detail-body' }, [
    section('학습 목표', [bulletList(course.learn, 'check-list')]),
    section('이런 분께 추천해요', [bulletList(course.target)]),
    Curriculum(course),
    section('준비물', [bulletList(course.materials)]),
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

// 가격·구매 영역 — 넓은 화면은 오른쪽 고정 상자, 모바일은 하단 바
export function PurchaseBox(course, { compact = false } = {}) {
  // 제작 예정·모집 예정·모집 마감이면 버튼에 그 상태를, 아니면 '바로 구매'를 보여준다
  const badge = getCourseBadge(course);
  const blocked = badge && badge.tone !== 'green' ? badge.label : null;
  return el('div', { className: compact ? 'purchase-bar' : 'purchase-box' }, [
    el('div', { className: 'purchase__price' }, [
      el('strong', { className: 'price', text: formatPrice(course.price) }),
      el('span', { className: 'text-muted', text: blocked ? `${blocked} · 구독 없이 한 강` : '구독 없이 한 강' }),
    ]),
    el('div', { className: 'purchase__actions' }, [
      SoonButton({ label: '장바구니', iconNode: icon('cart', 18), className: 'button button--ghost' }),
      SoonButton({ label: blocked ?? '바로 구매', className: 'button button--primary' }),
    ]),
    compact ? null : el('p', { className: 'purchase__note', text: '장바구니·구매 기능은 준비 중이에요. 실제 결제는 이루어지지 않는 데모 사이트입니다.' }),
  ]);
}

// 강의 카드 — 목록·메인에서 공통 사용. 결과물을 가장 눈에 띄게 보여준다
import { el } from '../lib/dom.js';
import { assetUrl } from '../lib/paths.js';
import { formatPrice } from '../lib/price.js';
import { getCategoryName, totalMinutes } from '../lib/courseQuery.js';
import { getCourseMark } from '../lib/purchase.js';
import { bindOwnedState } from '../lib/cartStore.js';

// 상태 배지 — 구매한 강의(대표색) / 제작 예정 / 데모 체험 가능(초록, 상시 포함) / 모집 예정(노랑) / 모집 마감(빨강)
// 구매 기록이 나중에 도착해도(로그인 계정 기록) 다시 그린다
export function StatusBadge(course) {
  const node = el('span', { className: 'badge' });
  return bindOwnedState(node, (purchases) => {
    const badge = getCourseMark(course, purchases);
    node.className = badge ? `badge badge--${badge.tone}` : 'badge';
    node.textContent = badge ? badge.label : '';
    node.hidden = !badge;
  });
}

export function CourseCard(course, categories) {
  return el('article', { className: 'course-card' }, [
    el('a', { href: `course.html?id=${course.id}`, className: 'course-card__link', 'data-course-id': course.id, 'data-course-category': course.category }, [
      el('div', { className: 'course-card__thumb' }, [
        el('img', {
          src: assetUrl(course.thumbnail),
          alt: `${course.title} 임시 이미지`,
          loading: 'lazy',
          width: '640',
          height: '400',
        }),
        StatusBadge(course),
      ]),
      el('div', { className: 'course-card__body' }, [
        el('span', { className: 'chip chip--small', text: getCategoryName(course.category, categories) }),
        el('h3', { className: 'course-card__title', text: course.title }),
        el('p', { className: 'course-card__outcome' }, [
          el('span', { className: 'course-card__outcome-label', text: '결과물' }),
          el('span', { text: course.outcome }),
        ]),
        el('div', { className: 'course-card__meta' }, [
          el('span', { className: 'text-muted', text: `총 ${totalMinutes(course)}분 · ${course.lessons.length}차시` }),
          el('strong', { className: 'price', text: formatPrice(course.price) }),
        ]),
      ]),
    ]),
  ]);
}

// 카드 목록 — 결과가 없으면 안내 문구
export function CourseGrid(courses, categories, emptyNode = null) {
  if (courses.length === 0) return emptyNode;
  return el(
    'div',
    { className: 'course-grid' },
    courses.map((course) => CourseCard(course, categories)),
  );
}

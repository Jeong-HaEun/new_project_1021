import { el } from '../lib/dom.js';
import { pageUrl } from '../lib/paths.js';
import { formatPrice } from '../lib/price.js';
import { COURSES } from '../data/courses/index.js';
import { LEARNING_PATH } from '../data/learningPath.js';

export function LearningPath() {
  return el('section', { className: 'section', 'aria-labelledby': 'learning-path-title' }, [
    el('div', { className: 'section__head' }, [
      el('h2', { id: 'learning-path-title', className: 'section__title', text: '마케팅 취업 준비, 어디서 시작할까요?' }),
    ]),
    el('p', { className: 'learning-path__intro text-muted', text: '기획부터 정리·분석·발표까지. 순서는 참고하고, 지금 부족한 한 강만 골라도 괜찮아요.' }),
    el('ol', { className: 'learning-path' }, LEARNING_PATH.map((step, index) => {
      const course = COURSES.find((item) => item.id === step.courseId);
      return el('li', {}, [
        el('a', {
          href: pageUrl('course.html', { id: course.id }), className: 'learning-step',
          'data-course-id': course.id, 'data-course-category': course.category, 'data-placement': 'learning-path',
        }, [
          el('span', { className: 'learning-step__number', text: `0${index + 1}` }),
          el('h3', { text: step.label }),
          el('p', { className: 'text-muted', text: step.description }),
          el('span', { className: 'learning-step__outcome', text: course.outcome }),
          el('span', { className: 'learning-step__meta', text: `${formatPrice(course.price)} · 제작 예정 →` }),
        ]),
      ]);
    })),
  ]);
}

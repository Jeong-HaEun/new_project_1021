// 주문 확인 화면 조각 — 주문 강의 줄, 빠진 강의 안내, 결제수단 선택, 완료 화면 (데모, 실제 결제 없음)
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { assetUrl } from '../lib/paths.js';
import { formatPrice } from '../lib/price.js';
import { PAYMENT_METHODS, SKIP_REASONS } from '../lib/order.js';
import { ServerSaveStatus } from './ServerSaveStatus.js';

export const DEMO_PAYMENT_NOTE = '데모 결제입니다. 실제로 결제되지 않습니다.';

// learnLink: 완료 화면에서 [수강하기] 링크를 붙인다
export function OrderItem(course, { learnLink = false } = {}) {
  return el('li', { className: 'cart-item order-item' }, [
    el('a', { href: `course.html?id=${course.id}`, className: 'cart-item__thumb' }, [
      el('img', { src: assetUrl(course.thumbnail), alt: `${course.title} 임시 이미지`, width: '640', height: '400' }),
    ]),
    el('div', { className: 'cart-item__info' }, [
      el('a', { href: `course.html?id=${course.id}`, className: 'cart-item__title', text: course.title }),
      el('p', { className: 'cart-item__outcome', text: `결과물 · ${course.outcome}` }),
      el('strong', { className: 'price', text: formatPrice(course.price) }),
    ]),
    learnLink
      ? el('a', { href: `learn.html?id=${course.id}`, className: 'button button--primary order-item__learn', text: '수강하기' })
      : null,
  ]);
}

// 주문에서 빠진 강의와 이유 (모집 마감·이미 구매 등)
export function SkippedNotice(skipped, courses) {
  if (skipped.length === 0) return null;
  return el('div', { className: 'order-skipped', role: 'note' }, [
    el('strong', { text: '주문에서 빠진 강의' }),
    el(
      'ul',
      {},
      skipped.map(({ id, reason }) => {
        const course = courses.find((item) => item.id === id);
        return el('li', { text: `${course ? course.title : id} · ${SKIP_REASONS[reason] ?? '살 수 없는 강의'}` });
      }),
    ),
  ]);
}

// 결제수단 — 이름만 고른다. 카드번호 등 결제 정보 입력칸은 두지 않는다
export function PaymentMethods() {
  return el('fieldset', { className: 'order-methods' }, [
    el('legend', { className: 'order-section__title', text: '결제수단 (데모)' }),
    ...PAYMENT_METHODS.map((method) =>
      el('label', { className: 'order-method' }, [
        el('input', { type: 'radio', name: 'method', value: method.id }),
        el('span', { text: method.label }),
      ]),
    ),
    el('p', { className: 'order-note', text: '결제 정보는 입력하지 않아요. 고른 결제수단도 저장하지 않아요.' }),
  ]);
}

export function OrderComplete(courses) {
  const total = courses.reduce((sum, course) => sum + course.price, 0);
  return el('div', { className: 'order-complete' }, [
    el('span', { className: 'order-complete__icon' }, [icon('check', 32)]),
    el('h2', { className: 'order-complete__title', tabindex: '-1', text: '데모 주문이 끝났어요' }),
    el('p', { className: 'text-muted', text: '실제로 결제되지 않았어요. 구매 기록은 이 브라우저에만 남아요.' }),
    el('ul', { className: 'cart-list' }, courses.map((course) => OrderItem(course, { learnLink: true }))),
    el('p', { className: 'order-complete__total' }, [el('span', { text: '합계 ' }), el('strong', { className: 'price', text: formatPrice(total) })]),
    ServerSaveStatus(courses.map((course) => course.id)),
    el('div', { className: 'order-complete__actions' }, [
      el('a', { href: 'courses.html', className: 'button button--ghost', text: '강의 더 둘러보기' }),
    ]),
  ]);
}

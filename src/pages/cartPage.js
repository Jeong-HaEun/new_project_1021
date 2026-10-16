// 장바구니 페이지 — 비로그인으로 담은 강의 목록, 빼기, 합계 (SPEC.md 5절)
// 주문하기(주문 확인·결제수단 선택 데모)는 다음 단계에서 연결
import { el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { assetUrl } from '../lib/paths.js';
import { formatPrice } from '../lib/price.js';
import { getCategoryName } from '../lib/courseQuery.js';
import { getCartCourses, getCartTotal } from '../lib/cart.js';
import { CART_CHANGE_EVENT, isCartPersistent, readCartState, removeCourseFromCart } from '../lib/cartStore.js';
import { COURSES } from '../data/courses/index.js';
import { CATEGORIES } from '../data/categories.js';
import { renderPage } from '../components/PageLayout.js';
import { SoonButton } from '../components/ComingSoon.js';
import { showToast } from '../components/Toast.js';
import '../styles/courses.css';
import '../styles/cart-page.css';

const body = el('div', { className: 'cart-body' });

function handleRemove(course) {
  removeCourseFromCart(course.id);
  showToast(`'${course.title}'을(를) 뺐어요`);
}

function CartItem(course) {
  return el('li', { className: 'cart-item' }, [
    el('a', { href: `course.html?id=${course.id}`, className: 'cart-item__thumb' }, [
      el('img', { src: assetUrl(course.thumbnail), alt: `${course.title} 임시 이미지`, width: '640', height: '400' }),
    ]),
    el('div', { className: 'cart-item__info' }, [
      el('span', { className: 'chip chip--small', text: getCategoryName(course.category, CATEGORIES) }),
      el('a', { href: `course.html?id=${course.id}`, className: 'cart-item__title', text: course.title }),
      el('p', { className: 'cart-item__outcome', text: `결과물 · ${course.outcome}` }),
      el('strong', { className: 'price', text: formatPrice(course.price) }),
    ]),
    el(
      'button',
      { type: 'button', className: 'cart-item__remove', 'aria-label': `${course.title} 빼기`, onClick: () => handleRemove(course) },
      [el('span', { text: '빼기' })],
    ),
  ]);
}

function Summary(courses, total) {
  return el('aside', { className: 'cart-summary' }, [
    el('dl', { className: 'cart-summary__rows' }, [
      el('dt', { text: '강의' }),
      el('dd', { text: `${courses.length}개` }),
      el('dt', { text: '합계' }),
      el('dd', { className: 'price cart-summary__total', text: formatPrice(total) }),
    ]),
    el('p', { className: 'cart-summary__note', text: '구독 없이 담은 강의만 결제해요. 묶음 할인은 없어요.' }),
    SoonButton({ label: '주문하기', className: 'button button--primary cart-summary__order' }),
    el('p', { className: 'cart-summary__note', text: '주문·결제 화면은 준비 중이에요. 데모 결제이며 실제로 결제되지 않습니다.' }),
  ]);
}

function EmptyCart() {
  return el('div', { className: 'empty-state' }, [
    icon('cart', 32),
    el('strong', { text: '장바구니가 비어 있어요' }),
    el('p', { className: 'text-muted', text: '필요한 실무 강의를 한 강씩 담아 보세요.' }),
    el('a', { href: 'courses.html', className: 'button button--primary', text: '강의 둘러보기' }),
  ]);
}

// 장바구니가 바뀔 때마다 다시 그린다 (이 화면에서 빼거나, 다른 탭에서 담았을 때)
function render() {
  const { cart } = readCartState();
  const courses = getCartCourses(cart, COURSES);
  if (courses.length === 0) {
    body.replaceChildren(EmptyCart());
    return;
  }
  body.replaceChildren(
    el('div', { className: 'cart-layout' }, [
      el('ul', { className: 'cart-list' }, courses.map(CartItem)),
      Summary(courses, getCartTotal(cart, COURSES)),
    ]),
  );
}

renderPage({
  active: 'cart',
  title: '장바구니',
  content: [
    el('h1', { className: 'page-title', text: '장바구니' }),
    el('p', { className: 'page-desc text-muted', text: '로그인 없이 이 브라우저에 저장돼요.' }),
    isCartPersistent()
      ? null
      : el('p', { className: 'cart-warning', role: 'note', text: '이 브라우저에서는 저장이 막혀 있어 창을 닫으면 장바구니가 비워져요.' }),
    body,
  ],
});

render();
window.addEventListener(CART_CHANGE_EVENT, render);

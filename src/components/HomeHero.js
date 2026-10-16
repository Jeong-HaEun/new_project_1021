// 메인 A/B의 윗부분 — A 감성 몰입형(큰 이미지·메시지) / B 정보 탐색형(짧은 소개). 아래 공통 구역은 homePage.js
// 대표 문구·설명·가격은 두 안이 같다. 문구는 이미지에 굽지 않고 HTML로 올린다 (planning/home-ab-v2 지시서)
import { el } from '../lib/dom.js';
import { assetUrl } from '../lib/paths.js';
import { SITE_DESCRIPTION, SITE_TAGLINE } from '../lib/site.js';

const EYEBROW = '마케터를 꿈꾸는 실무 초보에게';
const PRICE_NOTE = ['한 강 1,000~2,000원', '구독 없이, 필요한 만큼'];

// "지금 필요한 실무, 한 강씩." → 두 줄 (A는 줄을 나누고, B는 CSS로 한 줄)
function Title(className) {
  const [first, second] = SITE_TAGLINE.split(', ');
  return el('h1', { className }, [el('span', { text: `${first},` }), el('span', { text: ` ${second}` })]);
}

function Actions() {
  return el('div', { className: 'home-top__actions' }, [
    el('a', { href: '#classes', className: 'button home-top__cta' }, [el('span', { text: '강의 둘러보기' }), el('span', { 'aria-hidden': 'true', text: '↗' })]),
    el('p', { className: 'home-top__price' }, PRICE_NOTE.map((line) => el('span', { text: line }))),
  ]);
}

// A — 헤더 아래 꽉 찬 이미지. 배경은 장식이라 alt="" (의미는 화면 글자가 담당)
export function HeroA() {
  return el('section', { className: 'home-hero', 'aria-labelledby': 'home-title' }, [
    el('img', {
      className: 'home-hero__art', src: assetUrl('images/home/hero-art.webp'), alt: '',
      width: '1536', height: '1024', fetchpriority: 'high', decoding: 'async',
    }),
    el('div', { className: 'home-hero__inner' }, [
      el('p', { className: 'home-top__eyebrow', text: EYEBROW }),
      Object.assign(Title('home-top__title'), { id: 'home-title' }),
      el('p', { className: 'home-top__desc', text: SITE_DESCRIPTION }),
      Actions(),
      el('p', { className: 'home-hero__caption' }, [el('strong', { text: 'MAKE YOUR FIRST WORK.' }), el('span', { text: '첫 결과물을 만드는 작은 시작.' })]),
    ]),
  ]);
}

// A — 이미지 아래 강의 탐색으로 이어지는 제목
export function DiscoveryHead() {
  return el('div', { className: 'home-discovery' }, [
    el('p', { className: 'home-kicker', text: 'FIND YOUR NEXT STEP' }),
    el('h2', { className: 'section__title', text: '어떤 실무가 필요한가요?' }),
    el('p', { className: 'text-muted', text: '지금 막히는 것부터 작게 시작해 보세요.' }),
  ]);
}

// B — 이미지 없이 짧은 소개. 바로 아래 검색·강의가 첫 화면에 보이게
export function IntroB() {
  return el('section', { className: 'home-intro', 'aria-labelledby': 'home-title' }, [
    el('div', {}, [
      el('p', { className: 'home-top__eyebrow', text: EYEBROW }),
      Object.assign(Title('home-top__title'), { id: 'home-title' }),
      el('p', { className: 'home-top__desc', text: SITE_DESCRIPTION }),
    ]),
    Actions(),
  ]);
}

// 시연 전용 띠 — ?ab_preview=A/B 일 때만. 일반 방문에는 보이지 않는다
export function PreviewBar(variant) {
  const link = (value, label) =>
    el('a', {
      href: `index.html?ab_preview=${value}`, className: 'ab-preview__link', text: label,
      ...(variant === value && { 'aria-current': 'page' }),
    });
  return el('div', { className: 'ab-preview', role: 'note' }, [
    el('span', { className: 'ab-preview__label', text: '기획 시연 · 측정 제외' }),
    el('div', { className: 'ab-preview__links', role: 'group', 'aria-label': '메인 시안 선택' }, [
      link('A', 'A · 감성 몰입형'),
      link('B', 'B · 정보 탐색형'),
    ]),
  ]);
}

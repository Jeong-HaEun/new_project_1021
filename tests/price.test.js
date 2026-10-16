import { describe, it, expect } from 'vitest';
import { formatPrice, sumPrices } from '../src/lib/price.js';

describe('formatPrice', () => {
  it('천 단위 쉼표와 원을 붙인다', () => {
    expect(formatPrice(500)).toBe('500원');
    expect(formatPrice(1000)).toBe('1,000원');
    expect(formatPrice(12500)).toBe('12,500원');
  });

  it('0원은 무료로 표시한다', () => {
    expect(formatPrice(0)).toBe('무료');
  });

  it('잘못된 가격은 오류를 낸다', () => {
    expect(() => formatPrice(-1)).toThrow();
    expect(() => formatPrice(9.5)).toThrow();
  });
});

describe('sumPrices', () => {
  it('강의 가격을 모두 더한다', () => {
    expect(sumPrices([{ price: 500 }, { price: 1000 }])).toBe(1500);
  });

  it('빈 장바구니는 0원', () => {
    expect(sumPrices([])).toBe(0);
  });
});

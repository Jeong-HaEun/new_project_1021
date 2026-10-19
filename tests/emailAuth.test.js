// 이메일 로그인·가입 — 입력 확인, 오류 안내, 로그인 뒤 돌아갈 페이지
import { describe, it, expect } from 'vitest';
import { authErrorText, MIN_PASSWORD_LENGTH, safeNextPage, validateAuthForm } from '../src/lib/emailAuth.js';

describe('validateAuthForm — 서버에 보내기 전에 입력 확인', () => {
  const ok = { email: 'test@example.com', password: 'abcd1234', passwordConfirm: 'abcd1234' };

  it('로그인: 이메일·비밀번호가 맞는 모양이면 통과하고 이메일 앞뒤 공백을 지운다', () => {
    expect(validateAuthForm('login', { email: '  test@example.com ', password: 'abcd1234' })).toEqual({ ok: true, email: 'test@example.com', password: 'abcd1234' });
  });

  it('이메일이 비었거나 모양이 틀리면 email 칸을 알려 준다', () => {
    expect(validateAuthForm('login', { ...ok, email: '' })).toMatchObject({ ok: false, field: 'email' });
    expect(validateAuthForm('login', { ...ok, email: 'test@' })).toMatchObject({ ok: false, field: 'email' });
    expect(validateAuthForm('login', { ...ok, email: 'a b@c.com' })).toMatchObject({ ok: false, field: 'email' });
  });

  it('비밀번호가 비면 password 칸을 알려 준다', () => {
    expect(validateAuthForm('login', { ...ok, password: '' })).toMatchObject({ ok: false, field: 'password' });
  });

  it('가입: 비밀번호는 8자 이상, 확인 칸과 같아야 한다', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(validateAuthForm('signup', ok)).toMatchObject({ ok: true });
    expect(validateAuthForm('signup', { ...ok, password: 'abc123', passwordConfirm: 'abc123' })).toMatchObject({ ok: false, field: 'password' });
    expect(validateAuthForm('signup', { ...ok, passwordConfirm: 'abcd12345' })).toMatchObject({ ok: false, field: 'passwordConfirm' });
  });

  it('로그인은 길이를 따지지 않는다 (예전 비밀번호도 서버가 판단)', () => {
    expect(validateAuthForm('login', { ...ok, password: 'abc' })).toMatchObject({ ok: true });
  });
});

describe('authErrorText — Supabase 오류를 쉬운 말로', () => {
  it('자주 나는 오류는 상황에 맞게 안내한다', () => {
    expect(authErrorText({ code: 'invalid_credentials' })).toContain('이메일 또는 비밀번호');
    expect(authErrorText({ code: 'email_not_confirmed' })).toContain('인증 메일');
    expect(authErrorText({ code: 'user_already_exists' })).toContain('이미 가입');
    expect(authErrorText({ code: 'over_email_send_rate_limit' })).toContain('잠시 뒤');
    expect(authErrorText({ code: 'weak_password' })).toContain('비밀번호');
  });

  it('모르는 오류는 일반 안내를 하고, 서버 원문은 보여 주지 않는다', () => {
    const text = authErrorText({ code: 'something_new', message: 'internal detail' });
    expect(text).toContain('다시 시도');
    expect(text).not.toContain('internal detail');
    expect(authErrorText(undefined)).toContain('다시 시도');
  });
});

describe('safeNextPage — 로그인 뒤에는 정해 둔 페이지로만 돌아간다', () => {
  it('로그인이 필요한 페이지는 그대로 돌려준다', () => {
    for (const page of ['myclass.html', 'helper.html', 'report.html', 'community.html']) expect(safeNextPage(page)).toBe(page);
  });

  it('없거나 모르는 주소·바깥 주소는 내 강의실로', () => {
    expect(safeNextPage(null)).toBe('myclass.html');
    expect(safeNextPage('https://evil.example/')).toBe('myclass.html');
    expect(safeNextPage('//evil.example/myclass.html')).toBe('myclass.html');
    expect(safeNextPage('cart.html')).toBe('myclass.html');
  });
});

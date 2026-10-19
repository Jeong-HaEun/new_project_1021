// 이메일 로그인·가입 규칙 — 입력 확인, 오류 안내, 로그인 뒤 돌아갈 페이지 (login.html)
// 비밀번호는 Supabase Auth가 맡는다. 이 파일은 비밀번호를 저장·기록하지 않는다

export const MIN_PASSWORD_LENGTH = 8;

// 로그인이 필요한 페이지만 돌아갈 곳으로 허용한다 (바깥 주소로 보내는 링크 악용 방지)
const NEXT_PAGES = ['myclass.html', 'helper.html', 'report.html', 'community.html'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (field, message) => ({ ok: false, field, message });

// mode: 'login' | 'signup'
export function validateAuthForm(mode, { email = '', password = '', passwordConfirm = '' }) {
  const trimmed = email.trim();
  if (!EMAIL_PATTERN.test(trimmed)) return fail('email', '이메일 주소를 확인해 주세요.');
  if (!password) return fail('password', '비밀번호를 입력해 주세요.');
  if (mode === 'signup') {
    if (password.length < MIN_PASSWORD_LENGTH) return fail('password', `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 정해 주세요.`);
    if (password !== passwordConfirm) return fail('passwordConfirm', '비밀번호 확인이 달라요. 다시 입력해 주세요.');
  }
  return { ok: true, email: trimmed, password };
}

const ERROR_TEXT = {
  invalid_credentials: '이메일 또는 비밀번호가 맞지 않아요.',
  email_not_confirmed: '아직 이메일 인증 전이에요. 받은 인증 메일의 링크를 눌러 주세요.',
  user_already_exists: '이미 가입한 이메일이에요. 로그인해 주세요.',
  email_exists: '이미 가입한 이메일이에요. 로그인해 주세요.',
  over_email_send_rate_limit: '메일 보내기가 잠시 막혔어요. 잠시 뒤 다시 시도해 주세요.',
  over_request_rate_limit: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
  weak_password: `비밀번호가 너무 쉬워요. 영문·숫자를 섞어 ${MIN_PASSWORD_LENGTH}자 이상으로 정해 주세요.`,
};

// 서버 원문(message)은 보여 주지 않는다
export function authErrorText(error) {
  return ERROR_TEXT[error?.code] ?? '로그인을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
}

export function safeNextPage(next) {
  return NEXT_PAGES.includes(next) ? next : 'myclass.html';
}

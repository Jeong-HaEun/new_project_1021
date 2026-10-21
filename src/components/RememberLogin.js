// 카카오·이메일 공통 선택. 기본은 해제.
import { el } from '../lib/dom.js';
export function RememberLogin({ checked = false, disabled = false, onChange = () => {} } = {}) {
  const input = el('input', { type: 'checkbox', name: 'rememberLogin' });
  input.checked = checked;
  input.disabled = disabled;
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { className: 'remember-login' }, [
    input, el('span', { text: '로그인 상태 유지' }),
  ]);
}

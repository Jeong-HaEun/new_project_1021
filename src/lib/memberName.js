// 표시용 별명. 권한이나 사용자의 유일한 식별자로 쓰지 않는다.
export function memberName(user) {
  if (!user) return '';
  const metadata = user.user_metadata ?? {};
  for (const raw of [metadata.nickname, metadata.preferred_username, metadata.user_name]) {
    if (typeof raw !== 'string') continue;
    const name = raw.replace(/[\u0000-\u001f\u007f\s]+/g, ' ').trim();
    if (name && !name.includes('@')) return [...name].slice(0, 24).join('');
  }
  const date = new Date(typeof user.created_at === 'string' ? user.created_at : NaN);
  const parts = Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const day = parts ? parts.find((p) => p.type === 'month').value + parts.find((p) => p.type === 'day').value : '회원';
  let hash = 2166136261;
  for (const char of String(user.id ?? 'member')) hash = Math.imul(hash ^ char.codePointAt(0), 16777619) >>> 0;
  return day + '_' + String(hash % 1000000).padStart(6, '0');
}

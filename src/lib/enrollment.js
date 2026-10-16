// 모집 상태 — 강좌 데이터의 enrollment: { startDate, endDate } ('YYYY-MM-DD', 한국 날짜, 양 끝 포함)
// 오늘이 기간 안이면 green(모집중), 시작 전이면 yellow(모집 예정), 끝났으면 red(모집 마감)
// 기간이 없으면 상시 모집(green) — 단건 구매 강의는 기본적으로 언제든 살 수 있다

export const ENROLLMENT_LABELS = { green: '모집중', yellow: '모집 예정', red: '모집 마감' };

// 'YYYY-MM-DD' 형식이고 실제로 있는 날짜인지 (2026-02-30 같은 날짜는 거짓)
export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// 한국 날짜의 시작·끝 시각 (밀리초)
const startOfDayKst = (date) => Date.parse(`${date}T00:00:00.000+09:00`);
const endOfDayKst = (date) => Date.parse(`${date}T23:59:59.999+09:00`);

// now: 기준 시각 (Date). 테스트에서 날짜를 고정할 수 있게 인자로 받는다
export function getEnrollmentStatus(course, now = new Date()) {
  const { startDate, endDate } = course.enrollment ?? {};
  const time = now.getTime();
  if (startDate && time < startOfDayKst(startDate)) return 'yellow';
  if (endDate && time > endOfDayKst(endDate)) return 'red';
  return 'green';
}

// 카드·상세에 붙는 상태 표시. 표시할 것이 없으면(기간 없는 열린 강좌 = 상시 모집) null
// tone: 'planned' | 'green' | 'yellow' | 'red' → CSS 배지 색
export function getCourseBadge(course, now = new Date()) {
  if (course.status === 'planned') return { tone: 'planned', label: '제작 예정' };
  if (!course.enrollment) return null;
  const tone = getEnrollmentStatus(course, now);
  return { tone, label: ENROLLMENT_LABELS[tone] };
}

// 모집 기간 문구 — '2026.10.01 ~ 2026.10.31'
export function formatEnrollmentPeriod(enrollment) {
  const { startDate, endDate } = enrollment ?? {};
  const dot = (date) => date.replaceAll('-', '.');
  if (startDate && endDate) return `${dot(startDate)} ~ ${dot(endDate)}`;
  if (startDate) return `${dot(startDate)}부터 상시`;
  if (endDate) return `${dot(endDate)}까지`;
  return '상시 모집';
}

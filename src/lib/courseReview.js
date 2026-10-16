// 강좌 데이터 검토 — 강좌를 새로 넣거나 고쳤을 때 신호등으로 알려 준다
//   green: 명료함 / yellow: 애매함(사람이 판단) / red: 맞지 않음(고쳐야 함, npm test 실패)
// 문제마다 무엇이 문제인지(message)와 어떻게 고치면 되는지(fix)를 함께 돌려준다. 자동으로 고치지는 않는다
import { BANNED_PHRASES, PRICE_MAX, PRICE_MIN } from '../data/policy.js';
import { getEnrollmentStatus, isValidDate } from './enrollment.js';

const TEXT_FIELDS = ['title', 'summary', 'outcome', 'extraCost', 'accessPeriod', 'refundPolicy', 'instructorId', 'thumbnail'];
const LIST_FIELDS = ['learn', 'target', 'materials', 'tags'];
const SUMMARY_MAX = 60;
const MINUTES_MIN = 10;
const MINUTES_MAX = 40;
// 결과물에 '1장', '3개'처럼 개수·단위가 있는지
const COUNTABLE_OUTCOME = /\d+\s*(개|장|건|편|쪽|줄|문단|부)/;

const isBlank = (value) => typeof value !== 'string' || value.trim() === '';
const isTextList = (value) => Array.isArray(value) && value.length > 0 && value.every((item) => !isBlank(item));

// red 검사 — 데이터 규칙(SPEC.md 2절)에 맞지 않는 것
function findRedIssues(course, { categories, courses }) {
  const issues = [];
  const red = (field, message, fix) => issues.push({ level: 'red', field, message, fix });

  if (!/^c\d{3}$/.test(course.id ?? '')) red('id', `id "${course.id}" 형식이 틀렸어요.`, "'c' + 숫자 3자리로 바꿔 주세요 (예: c007).");
  if (courses.filter((other) => other.id === course.id).length > 1)
    red('id', `id "${course.id}"가 다른 강좌와 겹쳐요.`, '아직 쓰지 않은 번호로 바꿔 주세요.');
  if (!/^[a-z0-9-]+$/.test(course.slug ?? '')) red('slug', 'slug 형식이 틀렸어요.', '영문 소문자·숫자·하이픈만 써 주세요.');

  TEXT_FIELDS.filter((field) => isBlank(course[field])).forEach((field) =>
    red(field, `${field}이(가) 비어 있어요.`, `${field}에 내용을 채워 주세요.`),
  );
  LIST_FIELDS.filter((field) => !isTextList(course[field])).forEach((field) =>
    red(field, `${field} 목록이 비어 있거나 빈 항목이 있어요.`, '항목을 1개 이상, 빈칸 없이 채워 주세요.'),
  );

  if (!categories.some((category) => category.id === course.category))
    red('category', `모르는 분야 "${course.category}"예요.`, `분야 id 중 하나로 바꿔 주세요: ${categories.map((c) => c.id).join(', ')}`);
  if (!['planned', 'open'].includes(course.status))
    red('status', `상태 "${course.status}"는 쓸 수 없어요.`, "'planned'(제작 예정) 또는 'open'으로 바꿔 주세요.");
  if (!Number.isInteger(course.price) || course.price < PRICE_MIN || course.price > PRICE_MAX)
    red('price', `가격 ${course.price}원이 기준(${PRICE_MIN}~${PRICE_MAX}원 정수)을 벗어나요.`, `${PRICE_MIN}~${PRICE_MAX}원 사이 정수로 정해 주세요.`);

  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  if (lessons.length === 0) red('lessons', '차시가 없어요.', '차시를 1개 이상 넣어 주세요.');
  else if (!lessons.some((lesson) => lesson.isPreview))
    red('lessons', '맛보기 차시가 없어요.', '첫 차시에 isPreview: true를 넣어 주세요.');
  if (lessons.some((lesson) => isBlank(lesson.title) || !Number.isInteger(lesson.minutes) || lesson.minutes <= 0))
    red('lessons', '제목이 비었거나 시간이 잘못된 차시가 있어요.', '차시마다 제목과 1 이상의 정수 분(minutes)을 넣어 주세요.');

  ['title', 'summary', 'outcome', 'learn', 'target'].forEach((field) => {
    const text = [].concat(course[field] ?? []).join(' ');
    const phrase = BANNED_PHRASES.find((banned) => text.includes(banned));
    if (phrase) red(field, `과장 표현 "${phrase}"이 있어요.`, '결과를 보장하는 표현을 빼고 배우는 내용·결과물로 설명해 주세요.');
  });

  const { startDate, endDate } = course.enrollment ?? {};
  [startDate, endDate].filter((date) => date !== undefined && !isValidDate(date)).forEach((date) =>
    red('enrollment', `모집 날짜 "${date}" 형식이 틀렸어요.`, "'2026-10-01'처럼 YYYY-MM-DD로 써 주세요."),
  );
  if (isValidDate(startDate) && isValidDate(endDate) && endDate < startDate)
    red('enrollment', `마감일(${endDate})이 시작일(${startDate})보다 빨라요.`, '두 날짜가 바뀌지 않았는지 확인해 주세요.');
  return issues;
}

// yellow 검사 — 규칙 위반은 아니지만 사람이 확인하면 좋은 것
function findYellowIssues(course, { now }) {
  const issues = [];
  const yellow = (field, message, fix) => issues.push({ level: 'yellow', field, message, fix });

  if (!isBlank(course.outcome) && !COUNTABLE_OUTCOME.test(course.outcome))
    yellow('outcome', `결과물 "${course.outcome}"에 개수·단위가 없어 무엇이 남는지 애매해요.`, "'보고서 1장', '완성 파일 1개'처럼 손에 남는 것으로 써 주세요.");
  if (!isBlank(course.summary) && course.summary.length > SUMMARY_MAX)
    yellow('summary', `한 줄 설명이 ${course.summary.length}자로 길어요.`, `${SUMMARY_MAX}자 안으로 줄여 주세요.`);
  if (isTextList(course.learn) && course.learn.length < 3)
    yellow('learn', `학습 목표가 ${course.learn.length}개뿐이에요.`, '배우는 단계를 3~6개로 나눠 적어 주세요.');
  if (isTextList(course.target) && course.target.length < 2)
    yellow('target', '추천 대상이 1개뿐이에요.', '어떤 사람에게 맞는지 2개 이상 적어 주세요.');
  if (isTextList(course.tags) && course.tags.length < 2)
    yellow('tags', '검색 태그가 1개뿐이에요.', '검색에 걸리도록 태그를 2개 이상 넣어 주세요.');

  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  const minutes = lessons.reduce((sum, lesson) => sum + (Number.isInteger(lesson.minutes) ? lesson.minutes : 0), 0);
  if (lessons.length && (minutes < MINUTES_MIN || minutes > MINUTES_MAX))
    yellow('lessons', `강의 길이가 총 ${minutes}분이에요.`, `한 강 기준(${MINUTES_MIN}~${MINUTES_MAX}분)에 맞는지 확인해 주세요.`);
  if (lessons.length && lessons.filter((lesson) => lesson.isPreview).length > lessons.length / 2)
    yellow('lessons', '맛보기 차시가 절반을 넘어요.', '맛보기는 1~2차시로 줄여 유료 차시의 가치를 지켜 주세요.');

  if (course.enrollment && course.status === 'planned')
    yellow('enrollment', '제작 예정 강좌인데 모집 기간이 있어요.', "강의가 준비되면 status를 'open'으로 바꾸거나 기간을 지워 주세요.");
  else if (course.enrollment && getEnrollmentStatus(course, now) === 'red')
    yellow('enrollment', '모집 기간이 끝나 목록에 "모집 마감"으로 보여요.', '계속 팔 강좌라면 마감일을 늘리거나 지워 주세요.');
  return issues;
}

// 강좌 1개 검토. context: { categories, courses(겹침 확인용 전체 목록), now }
export function reviewCourse(course, { categories, courses = [], now = new Date() }) {
  const red = findRedIssues(course, { categories, courses });
  const yellow = findYellowIssues(course, { now });
  const level = red.length ? 'red' : yellow.length ? 'yellow' : 'green';
  return { courseId: course.id, title: course.title, level, issues: [...red, ...yellow] };
}

export function reviewCourses(courses, categories, now = new Date()) {
  return courses.map((course) => reviewCourse(course, { categories, courses, now }));
}

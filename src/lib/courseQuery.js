// 강의 검색·분야 필터 — 화면과 분리된 순수 함수 (SPEC.md 3·4절, tests/courseQuery.test.js)

// 분야 이름 찾기. 없으면 빈 문자열
export function getCategoryName(categoryId, categories) {
  return categories.find((category) => category.id === categoryId)?.name ?? '';
}

// 주소에서 받은 분야 값 정리 — 모르는 값이면 '전체(all)'
export function normalizeCategory(value, categories) {
  return categories.some((category) => category.id === value) ? value : 'all';
}

// 검색어를 단어로 나누기 — 앞뒤·중복 공백 무시, 영문 소문자로 통일
function toKeywords(query = '') {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

// 강의 한 개에서 검색할 글자를 한 줄로 모으기
function searchableText(course, categories) {
  return [course.title, course.summary, course.outcome, ...course.tags, getCategoryName(course.category, categories)]
    .join(' ')
    .toLowerCase();
}

// 분야와 검색어를 함께 적용. 여러 단어는 모두 포함된 강의만 남긴다
export function filterCourses(courses, categories, { category = 'all', query = '' } = {}) {
  const keywords = toKeywords(query);
  return courses.filter((course) => {
    if (category !== 'all' && course.category !== category) return false;
    const text = searchableText(course, categories);
    return keywords.every((keyword) => text.includes(keyword));
  });
}

// 분야 순서(categories 배열 순서)대로 정렬. 같은 분야는 원래 순서 유지
export function sortByCategory(courses, categories) {
  const order = (course) => categories.findIndex((category) => category.id === course.category);
  return [...courses].sort((a, b) => order(a) - order(b));
}

// id로 강의 찾기. 없으면 null
export function findCourse(courses, id) {
  return courses.find((course) => course.id === id) ?? null;
}

// 강의 길이 = 차시 시간의 합
export function totalMinutes(course) {
  return course.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
}

// 강좌 검토 보고서 — npm run review
// 모든 강좌를 green/yellow/red로 검토해 화면에 요약하고 reports/에 기록한다
//   reports/course-review.md : 이번 검토 결과 + 문제마다 해결 방안 (매번 새로 씀)
//   reports/review-log.md    : 문제가 발견될 때마다 한 줄씩 쌓이는 기록
// 자동으로 고치지 않는다. 운영자가 보고서를 보고 판단한다. red가 있으면 종료 코드 1
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COURSES } from '../src/data/courses/index.js';
import { CATEGORIES } from '../src/data/categories.js';
import { reviewCourses } from '../src/lib/courseReview.js';
import { getCourseBadge } from '../src/lib/enrollment.js';

const ROOT = join(import.meta.dirname, '..');
const REPORT_DIR = join(ROOT, 'reports');
const LIGHT = { green: '🟢 명료', yellow: '🟡 애매', red: '🔴 맞지 않음' };
const LEVEL_NAME = { yellow: '🟡 애매', red: '🔴 맞지 않음' };

const now = new Date();
const stamp = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
const results = reviewCourses(COURSES, CATEGORIES, now);
const enrollmentOf = (id) => getCourseBadge(COURSES.find((course) => course.id === id), now)?.label ?? '상시 모집';
const cell = (text) => String(text).replaceAll('|', '\\|');

// ── 화면 요약 ──
console.log(`\n강좌 검토 (${stamp})\n`);
results.forEach((result) => {
  console.log(`${LIGHT[result.level]}  ${result.courseId}  ${result.title}  [${enrollmentOf(result.courseId)}]`);
  result.issues.forEach((issue) => console.log(`     - ${LEVEL_NAME[issue.level]} ${issue.field}: ${issue.message}\n       → ${issue.fix}`));
});

// ── 보고서 파일 ──
const lines = [
  '# 강좌 검토 보고서',
  '',
  `검토 시각: ${stamp} · 명령: \`npm run review\``,
  '',
  '> 자동으로 고치지 않았습니다. 해결 방안을 검토한 뒤 강좌 데이터 파일(`src/data/courses/cXXX.js`)을 직접 고치거나 Claude에게 고쳐 달라고 요청하세요.',
  '',
  '| 강좌 | 제목 | 검토 결과 | 모집 상태 | 문제 수 |',
  '|---|---|---|---|---|',
  ...results.map((r) => `| ${r.courseId} | ${cell(r.title)} | ${LIGHT[r.level]} | ${enrollmentOf(r.courseId)} | ${r.issues.length} |`),
  '',
];
results
  .filter((result) => result.issues.length)
  .forEach((result) => {
    lines.push(`## ${result.courseId} ${result.title} — ${LIGHT[result.level]}`, '', '| 등급 | 항목 | 문제 | 해결 방안 |', '|---|---|---|---|');
    result.issues.forEach((i) => lines.push(`| ${LEVEL_NAME[i.level]} | ${i.field} | ${cell(i.message)} | ${cell(i.fix)} |`));
    lines.push('');
  });
if (results.every((result) => result.level === 'green')) lines.push('모든 강좌가 🟢 명료합니다.', '');

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(join(REPORT_DIR, 'course-review.md'), lines.join('\n'));

// ── 문제 기록 쌓기 ──
const problems = results.flatMap((r) => r.issues.map((i) => `- ${stamp} · ${r.courseId} · ${LEVEL_NAME[i.level]} · ${i.field}: ${i.message} → ${i.fix}`));
if (problems.length) appendFileSync(join(REPORT_DIR, 'review-log.md'), `${problems.join('\n')}\n`);

const count = (level) => results.filter((result) => result.level === level).length;
console.log(`\n🟢 ${count('green')}개 · 🟡 ${count('yellow')}개 · 🔴 ${count('red')}개 → reports/course-review.md\n`);
process.exit(count('red') ? 1 : 0);

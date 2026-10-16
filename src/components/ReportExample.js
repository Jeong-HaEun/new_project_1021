import { el } from '../lib/dom.js';
import { pageUrl } from '../lib/paths.js';
import { REPORT_EXAMPLE } from '../data/learningPath.js';

// 한클래스 안의 보고서 페이지(report.html)로 연결한다. 가상 수치는 설명용이며 실제 계정 데이터가 아니다.
export function ReportExample({ compact = false } = {}) {
  const example = REPORT_EXAMPLE;
  return el('section', { className: 'section report-example', 'aria-label': '광고 보고서 실습 예시' }, [
    el('div', { className: 'report-example__copy' }, [
      el('p', { className: 'report-example__eyebrow', text: '마케팅 실습 · 결과물 미리 알아보기' }),
      el('h2', { className: 'section__title', text: example.title }),
      el('p', { className: 'text-muted', text: example.description }),
      el('div', { className: 'report-example__actions' }, [
        el('a', {
          href: example.url, className: 'button button--primary', text: '광고 보고서 열기',
          'data-analytics': 'report-example-open',
        }),
        compact ? null : el('a', {
          href: pageUrl('course.html', { id: example.courseId }), className: 'button button--ghost',
          text: '연결된 실습 강의 보기', 'data-course-id': example.courseId, 'data-placement': 'report-example',
        }),
      ]),
      el('p', { className: 'report-example__note text-muted', text: '한클래스 카카오 계정으로 로그인하면 내 보고서가 열려요. 보고서는 PC에서만 이용할 수 있어요. 연결된 강의는 제작 예정입니다.' }),
    ]),
    el('div', { className: 'report-example__preview' }, [
      el('p', { className: 'report-example__preview-label', text: '화면 구성 예시 · 가상 수치' }),
      el('p', { className: 'report-example__preview-title', text: '이번 주 광고, 어떻게 설명할까요?' }),
      el('dl', { className: 'report-metrics' }, example.metrics.map((metric) => el('div', {}, [
        el('dt', { text: metric.label }), el('dd', { text: metric.value }),
      ]))),
      el('p', { className: 'report-example__question', text: '생각해 보기: ROAS만 높으면 좋은 광고일까요? 광고비·매출·구매 수를 함께 살펴보세요.' }),
    ]),
  ]);
}

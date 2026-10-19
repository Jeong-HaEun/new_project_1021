// 강의 자료 목록 (수강생용) — 강의 상세(준비물 아래)·내 강의실에서 같이 쓴다 (SPEC.md '강의 자료')
// 목록(이름·크기·공개 범위)은 누구나 보고, [받기]는 받을 수 있는 사람에게만. 실제 권한은 Storage 정책이 확인한다
// 강의가 여러 개면 강의별 필터. 자료 SQL 적용 전이거나 불러오기에 실패하면 조용히 숨긴다 (다른 내용을 가리지 않게)
import { el } from '../lib/dom.js';
import { isServerConfigured } from '../lib/server.js';
import { getCurrentUser } from '../lib/account.js';
import { fetchMyEnrollments } from '../lib/enrollmentApi.js';
import { formatBytes } from '../lib/videoUpload.js';
import { MATERIAL_ACCESS, filterCourses, filterMaterials, materialState, normalizeMaterials } from '../lib/materials.js';
import { listMaterials, materialDownloadUrl } from '../lib/materialsApi.js';
import { showToast } from './Toast.js';

const LOCKED_TEXT = '수강 신청하면 내 강의실에서 받을 수 있어요';
const STYLES = {
  detail: { section: 'detail-section material-section', title: 'detail-section__title' },
  myclass: { section: 'myclass-section material-section', title: 'myclass-section__title' },
};

// courses: 보여 줄 강의들. variant: 'detail'(강의 상세) | 'myclass'(내 강의실)
export function CourseMaterials({ courses, title = '강의 자료', variant = 'detail', loginNext = 'myclass.html' }) {
  const style = STYLES[variant];
  const root = el('section', { className: style.section, 'aria-label': title, hidden: '' });
  const view = { materials: [], user: null, enrolledIds: new Set(), filter: 'all' };
  if (!isServerConfigured()) return root;

  async function handleDownload(material, button) {
    button.setAttribute('disabled', '');
    try {
      window.location.assign(await materialDownloadUrl(material));
    } catch {
      showToast('받지 못했어요. 수강 신청 여부를 확인하고 다시 시도해 주세요.');
    }
    button.removeAttribute('disabled');
  }

  function Action(material) {
    const state = materialState(material, view.user, view.enrolledIds);
    if (state === 'login') return el('a', { href: `login.html?next=${loginNext}`, className: 'button button--ghost', text: '로그인하고 받기' });
    if (state === 'locked') return el('span', { className: 'material-locked', text: LOCKED_TEXT });
    const button = el('button', { type: 'button', className: 'button button--primary', text: '받기', 'aria-label': `${material.title} 받기` });
    button.addEventListener('click', () => handleDownload(material, button));
    return button;
  }

  function Item(material) {
    const open = materialState(material, view.user, view.enrolledIds) === 'download';
    return el('li', { className: 'material-item' }, [
      el('div', { className: 'material-item__info' }, [
        el('strong', { text: `${open ? '🔓' : '🔒'} ${material.title}` }),
        el('span', { className: 'material-item__meta' }, [
          el('span', { className: `badge ${material.access === 'free' ? 'badge--green' : 'badge--soon'}`, text: MATERIAL_ACCESS[material.access].label }),
          el('span', { text: ` ${material.filePath.split('.').pop().toUpperCase()} · ${formatBytes(material.size)}${courses.length > 1 ? ` · ${material.courseTitle}` : ''}` }),
        ]),
      ]),
      Action(material),
    ]);
  }

  // 강의가 둘 이상일 때만 필터 — 엑셀 필터처럼 펼쳐지는 목록 하나 (강의가 많아도 한 칸). 고르면 그 강의 자료만
  function Filter() {
    const filterList = filterCourses(courses);
    if (!filterList.length) return null;
    const count = (id) => filterMaterials(view.materials, id).length;
    const option = (id, label) => el('option', { value: id, text: `${label} (${count(id)}개)`, ...(view.filter === id && { selected: '' }) });
    const select = el('select', { id: 'material-filter', className: 'helper-input material-filter__select', onChange: handleFilter }, [
      option('all', '전체'),
      ...filterList.map((course) => option(course.id, course.title)),
    ]);
    return el('label', { className: 'material-filter', for: 'material-filter' }, [el('span', { className: 'material-filter__label', text: '강의 선택' }), select]);
  }

  function handleFilter(event) {
    view.filter = event.currentTarget.value;
    render();
    root.querySelector('#material-filter')?.focus(); // 다시 그려도 키보드 위치 유지
  }

  function render() {
    const shown = filterMaterials(view.materials, view.filter);
    root.replaceChildren(...[
      el('h2', { className: style.title, text: title }),
      el('p', { className: 'myclass-note', text: '가상 회사·가상 데이터로 만든 실습 자료예요.' }),
      Filter(),
      shown.length ? el('ul', { className: 'material-list' }, shown.map(Item)) : el('p', { className: 'text-muted', text: '이 강의 자료는 준비 중이에요' }),
    ].filter(Boolean));
  }

  async function load() {
    try {
      const [rows, user] = await Promise.all([listMaterials(courses.map((course) => course.id)), getCurrentUser()]);
      const enrolled = user ? await fetchMyEnrollments().catch(() => []) : [];
      Object.assign(view, { materials: normalizeMaterials(rows, courses), user, enrolledIds: new Set(enrolled.map((row) => row.course_id)) });
      if (!view.materials.length) return;
      render();
      root.removeAttribute('hidden');
    } catch {
      // 자료 SQL 적용 전·연결 실패 — 영역을 숨긴 채로 둔다
    }
  }

  load();
  return root;
}

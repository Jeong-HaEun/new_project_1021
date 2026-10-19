// 운영자 페이지 — 강의 자료. 강의 고르기 → 자료 이름 → 공개 범위(결제 전·후) → 파일 → [올리기]
// 목록에서 [결제 전으로]/[결제 후로] 한 번 눌러 공개 범위를 바꾸고, [받아 보기]·[삭제] (SPEC.md '강의 자료')
// 스스로 상태를 가진 조각: 운영자 화면이 다시 그려져도 고른 파일·목록이 유지된다
import { el } from '../lib/dom.js';
import { formatBytes } from '../lib/videoUpload.js';
import { MATERIAL_ACCEPT, MATERIAL_ACCESS, MATERIAL_PROBLEMS, checkMaterialFile, materialProblem, normalizeMaterials, validateMaterialTitle } from '../lib/materials.js';
import { listMaterials, materialDownloadUrl, removeMaterial, setMaterialAccess, uploadMaterial } from '../lib/materialsApi.js';

const NOTE = '지금 결제는 데모라 \'결제 후 공개\' 자료도 데모 수강 신청만 하면 받을 수 있어요. 가상 실습 자료만 올려 주세요 (실제 유료 파일·고객 정보 금지). 파일 1개 50MB까지.';
const LOAD_PROBLEMS = { 'not-ready': '강의 자료 저장소가 아직 서버에 없어요. 강의 자료 SQL을 적용하면 열려요.', 'not-allowed': '운영자만 자료를 올릴 수 있어요.' };

export function AdminMaterials({ courses, toast }) {
  const state = { materials: [], status: 'loading', busy: false, busyId: null, error: '' };
  const root = el('section', { className: 'admin-section' });
  const course = el('select', { id: 'material-course', className: 'helper-input' }, [
    el('option', { value: '', text: '강의 고르기' }),
    ...courses.map((item) => el('option', { value: item.id, text: item.title })),
  ]);
  const title = el('input', { id: 'material-title', className: 'helper-input', maxlength: '40', placeholder: '예: 주문 내역·거래처 목록 실습 파일' });
  const file = el('input', { id: 'material-file', type: 'file', accept: MATERIAL_ACCEPT, className: 'helper-input admin-file' });
  const accessRadio = (value) => el('label', { className: 'community-picker__item' }, [
    el('input', { type: 'radio', name: 'material-access', value, ...(value === 'enrolled' && { checked: '' }) }),
    el('span', {}, [el('strong', { text: MATERIAL_ACCESS[value].label }), el('span', { className: 'community-hint', text: MATERIAL_ACCESS[value].hint })]),
  ]);
  const accessPicker = el('fieldset', { className: 'community-picker' }, [el('legend', { className: 'helper-field__label', text: '공개 범위' }), accessRadio('enrolled'), accessRadio('free')]);

  async function load() {
    try {
      state.materials = normalizeMaterials(await listMaterials(), courses);
      state.status = 'ready';
    } catch (error) {
      state.status = materialProblem(error);
    }
    render();
  }

  async function handleUpload(event) {
    event.preventDefault();
    const checkedFile = checkMaterialFile(file.files[0]);
    const checkedTitle = validateMaterialTitle(title.value);
    state.error = !course.value ? MATERIAL_PROBLEMS.course : !checkedTitle.ok ? MATERIAL_PROBLEMS.title : checkedFile.ok ? '' : MATERIAL_PROBLEMS[checkedFile.reason];
    if (state.error) return render();
    state.busy = true;
    render();
    try {
      const access = accessPicker.querySelector('input:checked')?.value ?? 'enrolled';
      await uploadMaterial({ courseId: course.value, title: checkedTitle.title, access, file: file.files[0], ext: checkedFile.ext });
      Object.assign(file, { value: '' });
      title.value = '';
      toast('자료를 올렸어요');
    } catch (error) {
      const problem = materialProblem(error);
      state.error = MATERIAL_PROBLEMS[problem] ?? LOAD_PROBLEMS[problem] ?? '올리지 못했어요. 잠시 후 다시 시도해 주세요.';
    }
    state.busy = false;
    load();
  }

  async function act(material, action, doneText) {
    state.busyId = material.id;
    render();
    try {
      await action();
      if (doneText) toast(doneText);
    } catch {
      toast('처리하지 못했어요. 다시 시도해 주세요.');
    }
    state.busyId = null;
    load();
  }

  const handleToggle = (material) => {
    const next = material.access === 'free' ? 'enrolled' : 'free';
    act(material, () => setMaterialAccess(material.id, next), `'${MATERIAL_ACCESS[next].label}'으로 바꿨어요`);
  };
  const handleOpen = (material) => act(material, async () => window.location.assign(await materialDownloadUrl(material)));

  function Item(material) {
    const busy = state.busyId === material.id ? { disabled: '' } : {};
    const remove = el('button', { type: 'button', className: 'button button--ghost community-danger', ...busy, text: '삭제' });
    remove.addEventListener('click', () => (remove.dataset.armed ? act(material, () => removeMaterial(material), '자료를 지웠어요') : Object.assign(remove, { textContent: '한 번 더 누르면 삭제' }).dataset.armed = '1'));
    const toFree = material.access === 'enrolled';
    return el('li', { className: 'admin-report' }, [
      el('strong', { className: 'admin-report__title', text: `${material.courseTitle} · ${material.title}` }),
      el('p', { className: 'admin-note' }, [
        el('span', { className: `badge ${material.access === 'free' ? 'badge--green' : 'badge--soon'}`, text: MATERIAL_ACCESS[material.access].label }),
        el('span', { text: ` ${formatBytes(material.size)} · ${material.filePath.split('.').pop().toUpperCase()}` }),
      ]),
      el('div', { className: 'community-actions' }, [
        el('button', { type: 'button', className: 'button button--ghost', ...busy, onClick: () => handleToggle(material), text: toFree ? '결제 전 공개로 바꾸기' : '결제 후 공개로 바꾸기' }),
        el('button', { type: 'button', className: 'button button--ghost', ...busy, onClick: () => handleOpen(material), text: '받아 보기' }),
        remove,
      ]),
    ]);
  }

  function List() {
    if (state.status === 'loading') return el('p', { className: 'text-muted', role: 'status', text: '불러오는 중이에요…' });
    if (state.status !== 'ready') return el('p', { className: 'text-muted', text: LOAD_PROBLEMS[state.status] ?? '자료 목록을 불러오지 못했어요.' });
    if (!state.materials.length) return el('p', { className: 'text-muted', text: '아직 올린 자료가 없어요' });
    return el('ul', { className: 'admin-reports' }, state.materials.map(Item));
  }

  function render() {
    const submit = el('button', { type: 'submit', className: 'button button--primary', text: state.busy ? '올리는 중…' : '올리기' });
    if (state.busy || state.status === 'not-ready') submit.setAttribute('disabled', '');
    root.replaceChildren(
      el('h2', { className: 'admin-section__title', text: '강의 자료' }),
      el('p', { className: 'admin-note', text: NOTE }),
      el('form', { className: 'admin-upload', onSubmit: handleUpload }, [
        el('label', { className: 'helper-field', for: 'material-course' }, [el('span', { text: '강의' }), course]),
        el('label', { className: 'helper-field', for: 'material-title' }, [el('span', { text: '자료 이름 (수강생에게 보여요)' }), title]),
        accessPicker,
        el('label', { className: 'helper-field', for: 'material-file' }, [el('span', { text: '파일 (xlsx·xls·csv·pptx·docx·pdf·zip)' }), file]),
        state.error ? el('p', { className: 'admin-error', role: 'alert', text: state.error }) : null,
        submit,
      ]),
      List(),
    );
  }

  render();
  load();
  return root;
}

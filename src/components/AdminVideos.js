// 운영자 페이지 — 강의 영상 시험 업로드. 강의·차시 고르기 → 파일 고르기 → [올리기], 올린 영상 목록·[재생 확인]·[삭제]
// 올린 영상은 운영자만 볼 수 있다. 수강생 재생은 아직 열지 않는다 (SPEC.md '강의 영상 올리기')
// 스스로 상태를 가진 조각: 운영자 화면이 다시 그려져도 고른 파일·목록이 유지된다
import { el } from '../lib/dom.js';
import { VIDEO_ACCEPT, VIDEO_PROBLEMS, checkVideoFile, formatBytes, lessonOptions, normalizeVideos, videoPath, videoProblem } from '../lib/videoUpload.js';
import { listVideos, removeVideo, uploadVideo, videoUrl } from '../lib/videoApi.js';

const NOTE = '제작 전 시험 업로드예요. 올린 영상은 운영자만 볼 수 있고 수강생에게는 아직 보이지 않아요. 파일 1개 50MB까지(mp4·webm·mov), 같은 차시에 다시 올리면 바뀌어요.';
const LOAD_PROBLEMS = { 'not-ready': '영상 저장소가 아직 서버에 없어요. 영상 SQL을 적용하면 열려요.', 'not-admin': '운영자만 영상을 볼 수 있어요.' };

export function AdminVideos({ courses, toast }) {
  const state = { videos: [], status: 'loading', busy: false, error: '', preview: null };
  const root = el('section', { className: 'admin-section' });
  const select = el('select', { id: 'video-lesson', className: 'helper-input' }, [
    el('option', { value: '', text: '강의·차시 고르기' }),
    ...lessonOptions(courses).map((item) => el('option', { value: item.value, text: item.label })),
  ]);
  const file = el('input', { id: 'video-file', type: 'file', accept: VIDEO_ACCEPT, className: 'helper-input admin-file' });

  async function load() {
    try {
      state.videos = normalizeVideos(await listVideos(courses.map((course) => course.id)), courses);
      state.status = 'ready';
    } catch (error) {
      state.status = videoProblem(error);
    }
    render();
  }

  async function handleUpload(event) {
    event.preventDefault();
    const [courseId, lessonId] = select.value.split('/');
    const checked = checkVideoFile(file.files[0]);
    state.error = !lessonId ? VIDEO_PROBLEMS.lesson : checked.ok ? '' : VIDEO_PROBLEMS[checked.reason];
    if (state.error) return render();
    Object.assign(state, { busy: true });
    render();
    try {
      await uploadVideo(videoPath(courseId, lessonId, checked.ext), file.files[0]);
      file.value = '';
      toast('영상을 올렸어요');
    } catch (error) {
      const problem = videoProblem(error);
      state.error = VIDEO_PROBLEMS[problem] ?? LOAD_PROBLEMS[problem] ?? '올리지 못했어요. 잠시 후 다시 시도해 주세요.';
    }
    state.busy = false;
    load();
  }

  async function handlePreview(video) {
    try {
      state.preview = { path: video.path, url: await videoUrl(video.path) };
    } catch {
      toast('재생 주소를 받지 못했어요. 다시 시도해 주세요.');
    }
    render();
  }

  async function handleRemove(video) {
    try {
      await removeVideo(video.path);
      if (state.preview?.path === video.path) state.preview = null;
      toast('영상을 지웠어요');
    } catch {
      toast('지우지 못했어요. 다시 시도해 주세요.');
    }
    load();
  }

  function Item(video) {
    const remove = el('button', { type: 'button', className: 'button button--ghost community-danger', text: '삭제' });
    remove.addEventListener('click', () => (remove.dataset.armed ? handleRemove(video) : Object.assign(remove, { textContent: '한 번 더 누르면 삭제' }).dataset.armed = '1'));
    const playing = state.preview?.path === video.path;
    return el('li', { className: 'admin-report' }, [
      el('strong', { className: 'admin-report__title', text: video.title }),
      el('p', { className: 'admin-note', text: `${formatBytes(video.size)}${video.updatedAt ? ` · ${new Date(video.updatedAt).toLocaleString('ko-KR')}` : ''}` }),
      playing ? el('video', { className: 'admin-video', src: state.preview.url, controls: '', preload: 'metadata', 'aria-label': `${video.title} 재생 확인` }) : null,
      el('div', { className: 'community-actions' }, [
        playing ? null : el('button', { type: 'button', className: 'button button--ghost', onClick: () => handlePreview(video), text: '재생 확인' }),
        remove,
      ]),
    ]);
  }

  function List() {
    if (state.status === 'loading') return el('p', { className: 'text-muted', role: 'status', text: '불러오는 중이에요…' });
    if (state.status !== 'ready') return el('p', { className: 'text-muted', text: LOAD_PROBLEMS[state.status] ?? '영상 목록을 불러오지 못했어요.' });
    if (!state.videos.length) return el('p', { className: 'text-muted', text: '아직 올린 영상이 없어요' });
    return el('ul', { className: 'admin-reports' }, state.videos.map(Item));
  }

  function render() {
    const submit = el('button', { type: 'submit', className: 'button button--primary', text: state.busy ? '올리는 중…' : '올리기' });
    if (state.busy || state.status === 'not-ready') submit.setAttribute('disabled', '');
    root.replaceChildren(
      el('h2', { className: 'admin-section__title', text: '강의 영상 (시험 업로드)' }),
      el('p', { className: 'admin-note', text: NOTE }),
      el('form', { className: 'admin-upload', onSubmit: handleUpload }, [
        el('label', { className: 'helper-field', for: 'video-lesson' }, [el('span', { text: '강의·차시' }), select]),
        el('label', { className: 'helper-field', for: 'video-file' }, [el('span', { text: '영상 파일' }), file]),
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

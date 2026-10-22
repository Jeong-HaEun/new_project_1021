// 수강 화면 영상 재생기 — 그 강의를 데모 수강 신청한 계정만 (SPEC.md '강의 영상 올리기')
// 실제 권한은 Storage 정책이 확인한다 (supabase/migrations/20261022000000_hanclass_videos_enrolled.sql)
// 차시의 [재생]을 누르면 10분짜리 임시 주소를 받아 이 자리에서 재생한다. 가상 시연용 영상만 올린다
import { el } from '../lib/dom.js';
import { videoUrl } from '../lib/videoApi.js';
import { showToast } from './Toast.js';

export function LessonPlayer() {
  const caption = el('p', { className: 'learn-player__caption' });
  const video = el('video', { className: 'learn-player__video', controls: '', playsinline: '', preload: 'metadata', controlslist: 'nodownload' });
  const root = el('section', { className: 'learn-section learn-player', 'aria-label': '강의 영상', hidden: '' }, [
    el('h2', { className: 'learn-section__title', text: '강의 영상' }),
    caption,
    video,
    el('p', { className: 'learn-note', text: '데모 사이트라 가상 시연용 영상만 올려요. 재생 주소는 10분 동안만 열려요.' }),
  ]);

  async function play(path, label) {
    try {
      video.src = await videoUrl(path);
    } catch {
      showToast('영상을 열지 못했어요. 수강 신청한 계정인지 확인하고 다시 눌러 주세요.');
      return;
    }
    caption.textContent = label;
    root.hidden = false;
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    video.focus();
    video.play().catch(() => {}); // 자동 재생이 막히면 재생 버튼을 직접 누르면 된다
  }

  return { root, play };
}

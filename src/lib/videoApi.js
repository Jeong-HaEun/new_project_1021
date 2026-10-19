// 강의 영상 저장소 호출 — 로그인한 운영자의 토큰으로만. 운영자인지는 Storage 정책이 확인한다
// (supabase/migrations/20261019020000_hanclass_videos.sql). 관리자 키는 쓰지 않는다
import { getServerClient } from './server.js';
import { VIDEO_BUCKET } from './videoUpload.js';

async function bucket() {
  return (await getServerClient()).storage.from(VIDEO_BUCKET);
}

async function run(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

// 같은 경로가 있으면 덮어쓴다
export async function uploadVideo(path, file) {
  return run((await bucket()).upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' }));
}

// 강의 폴더마다 목록 → [{ courseId, files }]
export async function listVideos(courseIds) {
  const store = await bucket();
  return Promise.all(courseIds.map(async (courseId) => ({ courseId, files: await run(store.list(courseId, { limit: 100 })) })));
}

// 운영자 확인용 10분짜리 임시 주소
export async function videoUrl(path) {
  return (await run((await bucket()).createSignedUrl(path, 600))).signedUrl;
}

export async function removeVideo(path) {
  return run((await bucket()).remove([path]));
}

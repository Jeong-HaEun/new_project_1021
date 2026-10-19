// 강의 자료 서버 호출 — 로그인한 사람의 토큰으로만. 운영자인지·받을 수 있는지는 DB·Storage 정책이 확인한다
// (supabase/migrations/20261019050000_hanclass_materials.sql). 관리자 키는 쓰지 않는다
import { getServerClient } from './server.js';
import { MATERIAL_BUCKET, downloadName, materialPath } from './materials.js';

const TABLE = 'hanclass_course_materials';
const COLUMNS = 'id, course_id, title, file_path, size, access, created_at';

async function run(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

// 자료 목록 (누구나). courseIds가 있으면 그 강의만
export async function listMaterials(courseIds) {
  const client = await getServerClient();
  let query = client.from(TABLE).select(COLUMNS).order('created_at');
  if (courseIds) query = query.in('course_id', courseIds);
  return run(query);
}

// 파일을 먼저 올리고 목록에 적는다. 목록 저장이 실패하면 올린 파일을 지워 남기지 않는다
export async function uploadMaterial({ courseId, title, access, file, ext }) {
  const client = await getServerClient();
  const path = materialPath(courseId, ext, crypto.randomUUID());
  await run(client.storage.from(MATERIAL_BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', cacheControl: '3600' }));
  const { error } = await client.from(TABLE).insert({ course_id: courseId, title, file_path: path, size: file.size, access });
  if (error) {
    await client.storage.from(MATERIAL_BUCKET).remove([path]);
    throw error;
  }
}

export async function setMaterialAccess(id, access) {
  const client = await getServerClient();
  await run(client.from(TABLE).update({ access }).eq('id', id));
}

// 목록에서 먼저 지우고(받기가 바로 막힘) 파일을 지운다
export async function removeMaterial(material) {
  const client = await getServerClient();
  await run(client.from(TABLE).delete().eq('id', material.id));
  await run(client.storage.from(MATERIAL_BUCKET).remove([material.filePath]));
}

// 1분짜리 받기 주소 — 받을 수 없는 사람이면 Storage 정책이 거절한다
export async function materialDownloadUrl(material) {
  const client = await getServerClient();
  const data = await run(client.storage.from(MATERIAL_BUCKET).createSignedUrl(material.filePath, 60, { download: downloadName(material) }));
  return data.signedUrl;
}

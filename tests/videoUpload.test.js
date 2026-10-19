// 강의 영상 올리기 — 파일 검사·경로·목록 정리·서버 규칙 (SPEC.md '강의 영상 올리기')
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_VIDEO_BYTES, VIDEO_BUCKET, checkVideoFile, formatBytes, lessonOptions, normalizeVideos, videoPath, videoProblem } from '../src/lib/videoUpload.js';

const courses = [{ id: 'c002', title: 'XLOOKUP', lessons: [{ id: 'l1', title: '업무 상황' }, { id: 'l2', title: '기본 형식' }] }];
const file = (type, size) => ({ type, size });

describe('checkVideoFile', () => {
  it('mp4·webm·mov만, 50MB까지', () => {
    expect(checkVideoFile(file('video/mp4', 1000))).toEqual({ ok: true, ext: 'mp4' });
    expect(checkVideoFile(file('video/quicktime', MAX_VIDEO_BYTES))).toEqual({ ok: true, ext: 'mov' });
    expect(checkVideoFile(file('video/mp4', MAX_VIDEO_BYTES + 1))).toEqual({ ok: false, reason: 'too-big' });
    expect(checkVideoFile(file('image/png', 10))).toEqual({ ok: false, reason: 'type' });
    expect(checkVideoFile(undefined)).toEqual({ ok: false, reason: 'required' });
    expect(checkVideoFile(file('video/mp4', 0))).toEqual({ ok: false, reason: 'required' });
  });
});

describe('경로·고르기 목록', () => {
  it("'강의id/차시id.확장자' — 같은 차시는 덮어쓴다", () => {
    expect(videoPath('c002', 'l1', 'mp4')).toBe('c002/l1.mp4');
  });
  it('강의·차시 순서로 고르기 목록', () => {
    expect(lessonOptions(courses)).toEqual([
      { value: 'c002/l1', label: 'XLOOKUP · 1차시 업무 상황' },
      { value: 'c002/l2', label: 'XLOOKUP · 2차시 기본 형식' },
    ]);
  });
});

describe('normalizeVideos', () => {
  it('폴더 표시(id 없음)는 버리고 차시 이름·크기를 붙인다', () => {
    const rows = normalizeVideos([{ courseId: 'c002', files: [
      { name: 'l2.mp4', id: 'b', metadata: { size: 2 * 1024 * 1024 }, updated_at: '2026-10-19T10:00:00Z' },
      { name: 'l1.webm', id: 'a', metadata: { size: 500 } },
      { name: '.emptyFolderPlaceholder', id: null },
    ] }, { courseId: 'c009', files: null }], courses);
    expect(rows.map((row) => [row.path, row.title, formatBytes(row.size)])).toEqual([
      ['c002/l1.webm', 'XLOOKUP · 1차시 업무 상황', '1KB'],
      ['c002/l2.mp4', 'XLOOKUP · 2차시 기본 형식', '2.0MB'],
    ]);
  });
});

describe('videoProblem', () => {
  it('저장소 SQL 적용 전·크기 초과·권한 없음', () => {
    expect(videoProblem({ message: 'Bucket not found', statusCode: '404' })).toBe('not-ready');
    expect(videoProblem({ message: 'The object exceeded the maximum allowed size', statusCode: '413' })).toBe('too-big');
    expect(videoProblem({ message: 'new row violates row-level security policy', statusCode: '403' })).toBe('not-admin');
    expect(videoProblem(new Error('network'))).toBe('unknown');
  });
});

describe('영상 저장소 SQL', () => {
  const sql = readFileSync(join(import.meta.dirname, '..', 'supabase/migrations/20261019020000_hanclass_videos.sql'), 'utf8').toLowerCase().replace(/--.*$/gm, '');
  it('비공개 버킷, 50MB, 영상 형식만 — 버킷 이름이 화면과 같다', () => {
    expect(sql).toContain(`values ('${VIDEO_BUCKET}', '${VIDEO_BUCKET}', false, ${MAX_VIDEO_BYTES}, array['video/mp4', 'video/webm', 'video/quicktime'])`);
  });
  it('보기·올리기·바꾸기·지우기 모두 운영자만, 비로그인 정책 없음', () => {
    const policies = [...sql.matchAll(/create policy "[^"]+"\s+on storage\.objects for (\w+)\s+to (\w+)/g)].map((m) => `${m[1]}:${m[2]}`);
    expect(policies).toEqual(['select:authenticated', 'insert:authenticated', 'update:authenticated', 'delete:authenticated']);
    expect((sql.match(/public\.hanclass_admin_role\(\) is not null/g) ?? []).length).toBe(5); // 보기 1·올리기 1·바꾸기 2(기존·새 행)·지우기 1
  });
  it('세시드와 겹치지 않게 정책 이름에 hanclass를 붙이고, 수강생 읽기는 아직 없다', () => {
    [...sql.matchAll(/create policy "([^"]+)"/g)].forEach((m) => expect(m[1]).toMatch(/^hanclass/));
    expect(sql).not.toMatch(/demo_enrollments/);
  });
});

// 수강 신청자 영상 보기 — 서버 규칙과 차시 연결 (SPEC.md '강의 영상 올리기')
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VIDEO_BUCKET, lessonVideoPaths } from '../src/lib/videoUpload.js';

const read = (name) => readFileSync(join(import.meta.dirname, '..', 'supabase', name), 'utf8').toLowerCase();
const sql = read('migrations/20261022000000_hanclass_videos_enrolled.sql');
const rollback = read('rollback/20261022000000_hanclass_videos_enrolled_down.sql');

describe('영상 보기 정책', () => {
  it('그 강의를 신청한 본인만, 보기(select)만 연다', () => {
    expect(sql).toContain(`bucket_id = '${VIDEO_BUCKET}'`);
    expect(sql).toContain('e.course_id = (storage.foldername(name))[1] and e.user_id = (select auth.uid())');
    expect(sql).toMatch(/for select\s+to authenticated\s/);
    expect(sql).not.toMatch(/for (insert|update|delete)|to anon/);
  });
  it('기존 데이터를 지우지 않고, 되돌리기는 이 정책만 지운다', () => {
    expect(sql).not.toMatch(/drop |truncate|delete from/);
    expect(rollback).toContain('drop policy if exists "hanclass 영상: 신청한 강의만 보기" on storage.objects');
  });
});

describe('lessonVideoPaths', () => {
  const course = { id: 'c002', lessons: [{ id: 'l1' }, { id: 'l2' }] };
  it('차시에 맞는 파일만 경로로 잇는다', () => {
    const files = [{ id: 'a', name: 'l1.mp4' }, { id: 'b', name: 'x9.mp4' }, { id: null, name: 'l2.mp4' }, null];
    expect([...lessonVideoPaths(course, files)]).toEqual([['l1', 'c002/l1.mp4']]);
  });
  it('목록이 없으면 빈 Map', () => {
    expect(lessonVideoPaths(course, undefined).size).toBe(0);
  });
});

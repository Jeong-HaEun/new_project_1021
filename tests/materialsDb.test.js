// 강의 자료 DB 규칙 — 목록 공개·쓰기는 운영자만·파일 받기는 공개 범위대로 (SPEC.md '강의 자료')
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MATERIAL_ACCESS, MATERIAL_BUCKET, MAX_MATERIAL_BYTES } from '../src/lib/materials.js';

const read = (name) => readFileSync(join(import.meta.dirname, '..', 'supabase', name), 'utf8').toLowerCase();
const sql = read('migrations/20261019050000_hanclass_materials.sql');
const rollback = read('rollback/20261019050000_hanclass_materials_down.sql');

describe('저장소', () => {
  it('비공개 버킷, 이름·용량이 화면 규칙과 같다', () => {
    expect(sql).toContain(`values ('${MATERIAL_BUCKET}', '${MATERIAL_BUCKET}', false, ${MAX_MATERIAL_BYTES})`);
  });
  it('기존 데이터를 지우지 않는다', () => {
    expect(sql).not.toMatch(/drop table|truncate|delete from/);
  });
});

describe('자료 목록 테이블', () => {
  it('공개 범위가 화면과 같고 기본은 결제 후', () => {
    expect(sql).toContain(`check (access in (${Object.keys(MATERIAL_ACCESS).map((key) => `'${key}'`).join(', ')}))`);
    expect(sql).toContain("access text not null default 'enrolled'");
  });
  it('목록은 누구나 보고, 추가·바꾸기·지우기는 운영자만', () => {
    expect(sql).toMatch(/for select\s+to anon, authenticated\s+using \(true\)/);
    expect(sql.match(/public\.hanclass_admin_role\(\) is not null/g).length).toBeGreaterThanOrEqual(7);
    expect(sql).toContain('grant update (title, access)');
  });
});

describe('파일 받기', () => {
  it('결제 전 자료이거나, 그 강의를 신청한 본인만 (운영자는 모두)', () => {
    expect(sql).toContain("m.access = 'free'");
    expect(sql).toContain('e.course_id = m.course_id and e.user_id = (select auth.uid())');
  });
  it('로그아웃한 사람(anon)에게는 Storage 받기 정책이 없다', () => {
    const storageSelect = sql.slice(sql.indexOf('공개 범위대로 받기'));
    expect(storageSelect).toMatch(/for select\s+to authenticated\s/);
  });
});

describe('되돌리기', () => {
  it('정책 3개와 테이블만 지운다', () => {
    expect(rollback.match(/drop policy if exists/g).length).toBe(3);
    expect(rollback).toContain('drop table if exists public.hanclass_course_materials');
  });
});

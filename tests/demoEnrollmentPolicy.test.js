// 데모 수강 신청은 열린 강의만 — DB 정책의 강의 목록이 강의 데이터와 같은지 (SPEC.md 5절)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COURSES } from '../src/data/courses/index.js';

const sql = readFileSync(join(import.meta.dirname, '..', 'supabase/migrations/20261019030000_demo_enrollments_open_only.sql'), 'utf8').replace(/--.*$/gm, '');
const rollback = readFileSync(join(import.meta.dirname, '..', 'supabase/rollback/20261019030000_demo_enrollments_open_only_down.sql'), 'utf8');

describe('demo_enrollments 추가 정책 — 열린 강의만', () => {
  it('정책의 강의 목록 = 강의 데이터의 open 강의 (강의를 열거나 닫으면 새 SQL 필요)', () => {
    const listed = [...sql.match(/course_id in \(([^)]*)\)/)[1].matchAll(/'(c\d{3})'/g)].map((m) => m[1]).sort();
    const open = COURSES.filter((course) => course.status === 'open').map((course) => course.id).sort();
    expect(listed).toEqual(open);
  });

  it('본인 확인은 그대로, 기존 신청 기록은 지우지 않는다', () => {
    expect(sql).toContain('(select auth.uid()) = user_id');
    expect(sql).not.toMatch(/delete from|truncate|drop table/i);
  });

  it('되돌리기는 원래 정책 이름·조건으로', () => {
    expect(rollback).toContain('create policy "본인 데모 수강 기록만 추가"');
    expect(rollback).toContain('with check ((select auth.uid()) = user_id);');
  });
});

// 공지 고정 DB 규칙 — 운영자만 글을 목록 맨 위에 고정한다 (SPEC.md '커뮤니티')
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (name) => readFileSync(join(import.meta.dirname, '..', 'supabase', name), 'utf8').toLowerCase();
const sql = read('migrations/20261020000000_community_pinned.sql');
const rollback = read('rollback/20261020000000_community_pinned_down.sql');

describe('공지 고정', () => {
  it('기존 글·댓글을 지우지 않고 칸만 더한다 (기본값 false)', () => {
    expect(sql).not.toMatch(/drop table|truncate|delete from|drop column/);
    expect(sql).toContain('add column is_pinned boolean not null default false');
  });
  it('브라우저는 고정 칸만 추가로 쓸 수 있다 (다른 칸 권한은 그대로)', () => {
    expect(sql).toMatch(/grant insert \(is_pinned\) on public\.community_posts to authenticated/);
    expect(sql).toMatch(/grant update \(is_pinned\) on public\.community_posts to authenticated/);
  });
  it('추가·고정 변경 전에 운영자인지 확인하고 community_pin_admin_only로 거절한다', () => {
    expect(sql).toMatch(/before insert or update of is_pinned on public\.community_posts/);
    expect(sql).toContain('public.hanclass_admin_role() is null');
    expect(sql).toContain("raise exception 'community_pin_admin_only'");
  });
  it('함수는 경로를 고정하고 브라우저가 직접 부를 수 없다', () => {
    expect(sql).toContain("set search_path = ''");
    expect(sql).toMatch(/revoke all on function public\.community_pin_guard\(\) from public, anon, authenticated/);
  });
  it('되돌리기는 트리거·함수·권한·칸만 지운다 (글은 남김)', () => {
    expect(rollback).toContain('drop trigger if exists community_posts_pin_guard on public.community_posts');
    expect(rollback).toContain('drop function if exists public.community_pin_guard()');
    expect(rollback).toContain('drop column if exists is_pinned');
    expect(rollback).not.toMatch(/drop table|delete from/);
  });
});

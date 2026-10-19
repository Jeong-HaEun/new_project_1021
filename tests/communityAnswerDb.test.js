// 질문 글 답변 DB 규칙 — 운영자와 질문한 본인만 댓글 (SPEC.md '커뮤니티')
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (name) => readFileSync(join(import.meta.dirname, '..', 'supabase', name), 'utf8').toLowerCase();
const sql = read('migrations/20261019040000_community_question_answers.sql');
const rollback = read('rollback/20261019040000_community_question_answers_down.sql');

describe('질문 글 답변 제한', () => {
  it('기존 글·댓글을 지우지 않는다', () => {
    expect(sql).not.toMatch(/drop table|truncate|delete from|alter table/);
  });
  it('댓글 추가 전에 질문 글·질문자·운영자를 확인하고 community_answer_only로 거절한다', () => {
    expect(sql).toMatch(/before insert on public\.community_comments/);
    expect(sql).toContain("category = 'question'");
    expect(sql).toContain('public.hanclass_admin_role() is null');
    expect(sql).toContain("raise exception 'community_answer_only'");
  });
  it('함수는 경로를 고정하고 브라우저가 직접 부를 수 없다', () => {
    expect(sql).toContain("set search_path = ''");
    expect(sql).toMatch(/revoke all on function public\.community_comments_answer_guard\(\) from public, anon, authenticated/);
  });
  it('되돌리기는 트리거와 함수만 지운다', () => {
    expect(rollback).toContain('drop trigger if exists community_comments_answer_guard on public.community_comments');
    expect(rollback).toContain('drop function if exists public.community_comments_answer_guard()');
    expect(rollback).not.toMatch(/drop table|delete from/);
  });
});

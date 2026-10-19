// 커뮤니티 보호 DB 규칙 — 도배 방지·서버 개인정보 검사·신고·숨김 (SPEC.md '커뮤니티 보호')
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RATE_LIMITS, REPORT_HIDE_COUNT, REPORT_REASONS } from '../src/lib/communityGuard.js';
import { findPersonalInfo } from '../src/lib/community.js';

const read = (name) => readFileSync(join(import.meta.dirname, '..', 'supabase', name), 'utf8').toLowerCase();
const sql = read('migrations/20261019000000_community_guard.sql');
const rollback = read('rollback/20261019000000_community_guard_down.sql');
const OWN = '\\(\\(select auth\\.uid\\(\\)\\) = user_id\\)';

describe('기존 데이터를 지우지 않는다 (더하기만)', () => {
  it('drop table·delete·truncate가 없다', () => {
    expect(sql).not.toMatch(/drop table|truncate|delete from/);
  });
  it('새 테이블은 community_reports 하나, 기존 글 테이블에는 hidden 칸만 더한다', () => {
    expect([...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1])).toEqual(['community_reports']);
    expect(sql).toContain('alter table public.community_posts add column hidden boolean not null default false');
  });
});

describe('도배 방지', () => {
  it('글·댓글 기준이 화면(RATE_LIMITS)과 같다', () => {
    const rule = (table, { count, minutes }) =>
      new RegExp(`from public\\.${table}\\s+where user_id = \\(select auth\\.uid\\(\\)\\) and created_at > now\\(\\) - interval '${minutes} minutes'\\) >= ${count}`);
    expect(sql).toMatch(rule('community_posts', RATE_LIMITS.post));
    expect(sql).toMatch(rule('community_comments', RATE_LIMITS.comment));
  });
  it('넘으면 community_rate_limited 표시로 거절', () => {
    expect(sql).toContain("raise exception 'community_rate_limited'");
  });
});

describe('서버 개인정보 검사', () => {
  it('전화번호·이메일이면 community_personal_info로 거절', () => {
    expect(sql).toContain("raise exception 'community_personal_info'");
    expect(sql).toMatch(/@/);
  });
  it('SQL 검사 규칙이 화면 규칙(findPersonalInfo)과 같은 예시를 같게 판단', () => {
    const raw = readFileSync(join(import.meta.dirname, '..', 'supabase/migrations/20261019000000_community_guard.sql'), 'utf8');
    const [email, phone] = [...raw.matchAll(/~\*? '([^']+)'/g)].map((m) => m[1]);
    const sqlSays = (text) => new RegExp(email, 'i').test(text) || new RegExp(phone).test(text);
    const samples = ['010-1234-5678', '01012345678', '+82 10-1234-5678', '02-123-4567', 'abc@naver.com',
      '2026-10-19에 1,000원 강의 3차시', '클릭률 2.5%', '평범한 문장'];
    samples.forEach((text) => expect(sqlSays(text), text).toBe(findPersonalInfo(text) !== null));
  });

  it('글은 추가·수정 때, 댓글은 추가 때 검사', () => {
    expect(sql).toMatch(/before insert or update of title, body, author_name on public\.community_posts/);
    expect(sql).toMatch(/before insert on public\.community_comments/);
  });
});

describe('신고', () => {
  it('신고 이유가 화면(REPORT_REASONS)과 같다', () => {
    const ids = REPORT_REASONS.map((item) => `'${item.id}'`).join(', ');
    expect(sql).toContain(`reason in (${ids})`);
  });
  it('한 사람이 같은 글을 한 번만', () => {
    expect(sql).toMatch(/unique \(post_id, user_id\)/);
  });
  it('RLS: 로그인한 본인만 추가·조회, 내 글은 신고 불가, 수정·삭제 없음, anon 없음', () => {
    expect(sql).toContain('alter table public.community_reports enable row level security');
    expect(sql).toContain('revoke all on public.community_reports from anon, authenticated');
    expect(sql).toMatch(new RegExp(`on public\\.community_reports for select\\s+to authenticated\\s+using ${OWN}`));
    expect(sql).toMatch(/on public\.community_reports for insert\s+to authenticated\s+with check \(\s*\(select auth\.uid\(\)\) = user_id\s+and not exists/);
    expect(sql).not.toMatch(/on public\.community_reports for (update|delete|all)/);
    expect(sql).toContain('grant insert (post_id, reason) on public.community_reports to authenticated');
  });
  it(`신고 ${REPORT_HIDE_COUNT}개면 숨김 (definer 함수, search_path 고정)`, () => {
    expect(sql).toContain(`>= ${REPORT_HIDE_COUNT}`);
    expect(sql).toMatch(/security definer\s+set search_path = ''/);
  });
});

describe('숨긴 글', () => {
  it('글쓴이 본인 말고는 목록·글·댓글에서 안 보인다', () => {
    expect(sql).toContain('drop policy "커뮤니티 글은 누구나 읽기" on public.community_posts');
    expect(sql).toMatch(/using \(not hidden or \(select auth\.uid\(\)\) = user_id\)/);
    expect(sql).toContain('drop policy "커뮤니티 댓글은 누구나 읽기" on public.community_comments');
  });
  it('글쓴이가 hidden을 직접 바꿀 수 없다 (수정 가능한 칸에 없음)', () => {
    expect(sql).not.toMatch(/grant update \([^)]*hidden/);
  });
  it('숨김 처리로 수정 시각이 바뀌지 않는다 (내용 칸을 고칠 때만)', () => {
    expect(sql).toContain('before update of category, course_id, title, body, author_name on public.community_posts');
  });
});

describe('되돌리는 SQL', () => {
  it('보호 기능을 모두 빼고 원래 읽기 정책을 되살린다', () => {
    expect(rollback).toContain('drop table if exists public.community_reports');
    expect(rollback).toContain('alter table public.community_posts drop column if exists hidden');
    expect(rollback).toContain('create policy "커뮤니티 글은 누구나 읽기"');
    expect(rollback).toContain('create policy "커뮤니티 댓글은 누구나 읽기"');
  });
});

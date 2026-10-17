// 커뮤니티 DB 규칙 검사 — 읽기 공개, 쓰기 로그인, 수정·삭제 본인 (SPEC.md '커뮤니티')
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LIMITS } from '../src/lib/community.js';

const sql = readFileSync(join(import.meta.dirname, '..', 'supabase/migrations/20261018000000_community.sql'), 'utf8').toLowerCase();
const OWN = '\\(\\(select auth\\.uid\\(\\)\\) = user_id\\)';

describe('community_posts·community_comments', () => {
  it('세시드 테이블과 겹치지 않게 community_ 이름만 만든다', () => {
    const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((match) => match[1]);
    expect(tables).toEqual(['community_posts', 'community_comments']);
  });

  it('두 테이블 모두 RLS를 켜고 기본 권한을 뺀다', () => {
    ['community_posts', 'community_comments'].forEach((table) => {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`revoke all on public.${table} from anon, authenticated`);
    });
  });

  it('읽기는 비로그인 포함 누구나', () => {
    expect(sql.match(/for select\s+to anon, authenticated\s+using \(true\)/g)).toHaveLength(2);
  });

  it('비로그인(anon)에는 읽기 말고 아무 권한도 주지 않는다', () => {
    const grants = [...sql.matchAll(/grant ([^;]+) on public\.\w+ to ([^;]+);/g)];
    grants.filter(([, , who]) => who.includes('anon')).forEach(([, what]) => expect(what.trim()).toBe('select'));
  });

  it('쓰기는 로그인한 본인 id로만', () => {
    expect(sql.match(new RegExp(`for insert\\s+to authenticated\\s+with check ${OWN}`, 'g'))).toHaveLength(2);
  });

  it('글 수정·삭제, 댓글 삭제는 본인만. 댓글 수정 정책은 없다', () => {
    expect(sql).toMatch(new RegExp(`on public\\.community_posts for update\\s+to authenticated\\s+using ${OWN}\\s+with check ${OWN}`));
    expect(sql).toMatch(new RegExp(`on public\\.community_posts for delete\\s+to authenticated\\s+using ${OWN}`));
    expect(sql).toMatch(new RegExp(`on public\\.community_comments for delete\\s+to authenticated\\s+using ${OWN}`));
    expect(sql).not.toMatch(/on public\.community_comments for update/);
    expect(sql).not.toMatch(/for all/);
  });

  it('브라우저는 user_id를 보내거나 바꿀 수 없다 (정해진 칸만 추가·수정)', () => {
    const columnGrants = [...sql.matchAll(/grant (insert|update) \(([^)]+)\)/g)].map((match) => match[2]);
    expect(columnGrants.length).toBe(3);
    columnGrants.forEach((columns) => expect(columns).not.toMatch(/user_id|created_at|updated_at/));
  });

  it('길이 제한이 화면 규칙(LIMITS)과 같다', () => {
    expect(sql).toContain(`char_length(title) between ${LIMITS.title.min} and ${LIMITS.title.max}`);
    expect(sql).toContain(`char_length(body) between ${LIMITS.body.min} and ${LIMITS.body.max}`);
    expect(sql).toContain(`char_length(body) between ${LIMITS.comment.min} and ${LIMITS.comment.max}`);
    expect(sql).toContain(`char_length(author_name) between ${LIMITS.authorName.min} and ${LIMITS.authorName.max}`);
  });

  it('분류는 결과물 공유·질문·자유만', () => {
    expect(sql).toContain("category in ('outcome', 'question', 'free')");
  });
});

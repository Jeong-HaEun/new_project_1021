// 운영자 DB 규칙 — 명단·권한·취메 표시·통계 함수 (SPEC.md '운영자 페이지')
// SQL 파일의 글자를 검사한다. 실제 DB 동작은 적용 뒤 사람이 확인한다
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (name) => readFileSync(join(ROOT, 'supabase', name), 'utf8').toLowerCase();
// 200줄 규칙 때문에 두 파일로 나눴다 (명단·표시 → 운영자 함수). 함께 적용·검사한다
const sql = read('migrations/20261019010000_hanclass_admin.sql') + read('migrations/20261019010100_hanclass_admin_functions.sql');
const rollback = read('rollback/20261019010000_hanclass_admin_down.sql');
const statements = sql.replace(/--.*$/gm, '');
const ADMIN_FUNCTIONS = ['admin_overview', 'admin_reported_posts', 'admin_set_post_hidden', 'admin_delete_post'];

describe('기존 데이터를 지우지 않는다', () => {
  it('drop table·truncate가 없고, 새 테이블은 hanclass_ 이름 2개뿐', () => {
    expect(statements).not.toMatch(/drop table|truncate/);
    expect([...statements.matchAll(/create table public\.(\w+)/g)].map((m) => m[1])).toEqual(['hanclass_admins', 'hanclass_admin_log']);
  });

  it('기존 테이블에는 is_official 칸만 더한다', () => {
    expect([...statements.matchAll(/alter table public\.(\w+) add column (\w+)/g)].map((m) => `${m[1]}.${m[2]}`))
      .toEqual(['community_posts.is_official', 'community_comments.is_official']);
  });
});

describe('운영자 명단 — 로그인만으로 운영자가 되지 않는다', () => {
  it('RLS를 켜고 브라우저에는 본인 행 읽기만 준다 (추가·수정·삭제 권한 없음)', () => {
    ['hanclass_admins', 'hanclass_admin_log'].forEach((table) => {
      expect(statements).toContain(`alter table public.${table} enable row level security`);
      expect(statements).toContain(`revoke all on public.${table} from anon, authenticated`);
    });
    expect(statements).toContain('grant select on public.hanclass_admins to authenticated');
    expect(statements).not.toMatch(/grant (insert|update|delete)[^;]*hanclass_/);
    expect(statements).toMatch(/for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
  });

  it('최초 지정 insert는 주석으로만 둔다 (자동 지정 없음)', () => {
    expect(statements).not.toMatch(/insert into public\.hanclass_admins/);
    expect(sql).toMatch(/-- insert into public\.hanclass_admins/);
  });

  it('마지막 최고 관리자는 지우거나 낮출 수 없다', () => {
    expect(statements).toContain('hanclass_last_super_admin');
    expect(statements).toMatch(/before update or delete on public\.hanclass_admins/);
  });
});

describe('운영자 함수 — 운영자만, 관리자 키 없이', () => {
  it.each(ADMIN_FUNCTIONS)('%s: 시작할 때 운영자인지 확인하고 search_path를 비운다', (name) => {
    const body = statements.slice(statements.indexOf(`create function public.${name}(`));
    const head = body.slice(0, body.indexOf('$$;'));
    expect(head).toContain("set search_path = ''");
    expect(head).toMatch(/if public\.hanclass_admin_role\(\) is null then\s+raise exception 'hanclass_not_admin'/);
    expect(statements).toMatch(new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon;`));
  });

  it('통계는 이메일·이름·auth.users를 읽지 않는다', () => {
    expect(statements).not.toMatch(/auth\.users\s+(?!\(id\))|raw_user_meta_data|email/);
  });

  it('숨김·해제·삭제는 활동 기록에 남긴다', () => {
    expect((statements.match(/insert into public\.hanclass_admin_log/g) ?? []).length).toBe(2);
    expect(statements).toContain("'hide_post'");
    expect(statements).toContain("'unhide_post'");
    expect(statements).toContain("'delete_post'");
  });

  it('서버 함수·브라우저 코드에 관리자 키를 쓰지 않는다', () => {
    const adminSources = readdirSync(join(ROOT, 'src/lib')).filter((name) => name.startsWith('admin')).map((name) => readFileSync(join(ROOT, 'src/lib', name), 'utf8'));
    adminSources.forEach((code) => expect(code).not.toMatch(/service_role|SECRET/));
  });
});

describe('취메 표시·닉네임', () => {
  it('운영자 여부는 DB가 추가 때 채우고, 브라우저에는 이 칸 쓰기 권한이 없다', () => {
    expect(statements).toContain('new.is_official := is_admin');
    expect(statements).not.toMatch(/grant (insert|update) \([^)]*is_official/);
  });

  it('일반 회원은 취메·운영자·관리자 같은 닉네임을 못 쓴다', () => {
    ['취메', '취업메이트', '운영자', '관리자'].forEach((word) => expect(statements).toContain(word));
    expect(statements).toContain('community_reserved_name');
  });

  it('신고로 숨길 때(hidden 변경)는 닉네임 검사가 돌지 않는다', () => {
    expect(statements).toMatch(/before insert or update of author_name on public\.community_posts/);
  });
});

describe('되돌리기', () => {
  it('더한 함수·트리거·칸·테이블을 모두 지운다', () => {
    ['admin_overview', 'admin_reported_posts', 'admin_set_post_hidden', 'admin_delete_post', 'community_set_official', 'hanclass_admin_role', 'hanclass_admins_keep_super'].forEach((name) =>
      expect(rollback).toContain(`drop function if exists public.${name}(`));
    ['community_posts', 'community_comments'].forEach((table) => expect(rollback).toContain(`alter table public.${table} drop column if exists is_official`));
    ['hanclass_admin_log', 'hanclass_admins'].forEach((table) => expect(rollback).toContain(`drop table if exists public.${table}`));
  });
});

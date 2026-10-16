// 사이트 규칙 검사 — CLAUDE.md "반드시 지킬 것"·"코드 규칙"을 파일 내용으로 확인한다
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

function listFiles(dir, extensions) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listFiles(path, extensions);
    return extensions.some((ext) => name.endsWith(ext)) ? [path] : [];
  });
}

const htmlFiles = readdirSync(ROOT).filter((name) => name.endsWith('.html')).map((name) => join(ROOT, name));
const sourceFiles = listFiles(join(ROOT, 'src'), ['.js', '.css']);
const read = (path) => readFileSync(path, 'utf8');
const short = (path) => path.replace(ROOT, '');

// 과장·금지 표현 — 필요하면 여기에 추가
const BANNED_PHRASES = ['합격 보장', '100% 취업', '취업 보장', '100% 환불'];

describe('모든 HTML 페이지', () => {
  it.each(htmlFiles.map(short))('%s: noindex·lang·viewport가 있다', (name) => {
    const html = read(join(ROOT, name));
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('name="viewport"');
  });

  it.each(htmlFiles.map(short))('%s: 공통 레이아웃(데모 고지 포함)을 쓰는 페이지 스크립트가 있다', (name) => {
    const match = read(join(ROOT, name)).match(/src="\/(src\/pages\/\w+\.js)"/);
    expect(match, '페이지 스크립트').toBeTruthy();
    expect(read(join(ROOT, match[1]))).toContain('renderPage(');
  });
});

describe('소스 파일', () => {
  it.each(sourceFiles.map(short))('%s: 200줄 이하', (name) => {
    expect(read(join(ROOT, name)).split('\n').length).toBeLessThanOrEqual(200);
  });

  it('빈 링크(#)·export default·innerHTML이 없다', () => {
    const offenders = [...sourceFiles, ...htmlFiles].filter((path) =>
      /href=["']#["']|href:\s*['"]#['"]|export default|innerHTML/.test(read(path)),
    );
    expect(offenders.map(short)).toEqual([]);
  });

  it('과장 표현이 없다', () => {
    const offenders = [...sourceFiles, ...htmlFiles].filter((path) =>
      BANNED_PHRASES.some((phrase) => read(path).includes(phrase)),
    );
    expect(offenders.map(short)).toEqual([]);
  });
});

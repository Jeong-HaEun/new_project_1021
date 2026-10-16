// Claude가 응답을 마칠 때(Stop) npm test를 돌려 결과를 화면에 알려 준다.
// 알림만 한다: 실패해도 작업을 막지 않는다 (여러 세션이 동시에 작업할 때 남의 중간 작업 때문에 붙잡히지 않도록).
import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['test', '--silent'], {
  cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  encoding: 'utf8',
  shell: true, // Windows에서 npm.cmd를 찾기 위해 필요
  timeout: 90_000,
});

// vitest 출력의 "Tests  1 failed | 86 passed (87)" 줄에서 요약만 뽑는다
const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '');
const summary = output.match(/^\s*Tests\s+(.+)$/m)?.[1]?.trim() ?? '결과 요약을 읽지 못함';
const failedFiles = [...new Set([...output.matchAll(/FAIL\s+(\S+\.test\.js)/g)].map((m) => m[1]))];

const message =
  result.status === 0
    ? `npm test 통과 (${summary})`
    : `npm test 실패 (${summary})${failedFiles.length ? ` - ${failedFiles.join(', ')}` : ''}. 다른 세션 작업 중일 수 있으니 확인해 주세요.`;

console.log(JSON.stringify({ systemMessage: message }));
process.exit(0);

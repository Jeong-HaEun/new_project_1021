// 서류 도우미 서버 함수 — 자소서 길잡이·면접 길잡이를 Gemini API(무료 등급)로 답한다 (SPEC.md '서류 도우미')
// 순서: 로그인 확인 → (status면 남은 횟수) → 켜짐 확인 → 입력 확인 → 하루 횟수 차감(1인 3회·전체 상한) → Gemini → 실패하면 환불
// 비밀값은 Supabase Edge Function Secrets에만 둔다: GEMINI_API_KEY, GEMINI_MODEL, DOC_HELPER_ENABLED, DOC_HELPER_UNTIL
// 입력 내용은 저장하거나 로그로 남기지 않는다
import { createClient } from 'npm:@supabase/supabase-js@2';
import { DAILY_LIMIT, DAILY_TOTAL_LIMIT, MODES, validateFields } from '../_shared/docHelperRules.js';
import { buildGeminiRequest, GEMINI_RETRY_DELAYS_MS, isBusyStatus, isRetryableStatus, readGeminiText } from '../_shared/gemini.js';

const ALLOWED_ORIGINS = ['https://jeong-haeun.github.io'];
const isAllowedOrigin = (o: string) => ALLOWED_ORIGINS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o);

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(status: number, body: unknown, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });
}

// 실습 기간 스위치 — DOC_HELPER_ENABLED=true 일 때만. DOC_HELPER_UNTIL(YYYY-MM-DD, 한국 날짜)이 있으면 그날까지
function isOpen() {
  if (Deno.env.get('DOC_HELPER_ENABLED') !== 'true') return false;
  const until = Deno.env.get('DOC_HELPER_UNTIL');
  if (!until) return true;
  const end = Date.parse(`${until}T23:59:59.999+09:00`);
  return !Number.isNaN(end) && Date.now() <= end;
}

// 새 키(publishable/secret)를 쓰고, 없으면 예전 키로
function supabaseKeys() {
  const publishable = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}').default ?? Deno.env.get('SUPABASE_ANON_KEY');
  const secret = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return { publishable, secret };
}

class AiError extends Error {
  constructor(public status: number) {
    super(`gemini status ${status}`);
  }
}

// 키는 주소 뒤에 붙이지 않고 헤더로 보낸다 — 주소는 기록에 남을 수 있다
async function askAiOnce(mode: string, fields: Record<string, unknown>) {
  const model = Deno.env.get('GEMINI_MODEL');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model ?? '')}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify(buildGeminiRequest(mode, fields)),
    signal: AbortSignal.timeout(40_000), // 다시 시도까지 합쳐 서버 함수 시간(150초) 안에 끝나게
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '(읽기 실패)');
    console.error('gemini error:', res.status, errBody.slice(0, 300));
    throw new AiError(res.status);
  }
  const text = readGeminiText(await res.json());
  if (!text) throw new Error('gemini empty answer');
  return text;
}

// Gemini가 잠깐 붐비면(503 등) 조금 기다렸다 다시 묻는다
async function askAi(mode: string, fields: Record<string, unknown>) {
  for (const delay of GEMINI_RETRY_DELAYS_MS) {
    try {
      return await askAiOnce(mode, fields);
    } catch (failure) {
      if (!(failure instanceof AiError && isRetryableStatus(failure.status))) throw failure;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return askAiOnce(mode, fields);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') ?? '';
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json(405, { error: 'method' }, origin);

  const url = Deno.env.get('SUPABASE_URL')!;
  const { publishable, secret } = supabaseKeys();

  // 1) 로그인 확인 — 브라우저가 보낸 로그인 토큰으로 사용자를 확인한다
  const userClient = createClient(url, publishable, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json(401, { error: 'login' }, origin);

  const admin = createClient(url, secret, { auth: { persistSession: false } });

  let body: { action?: string; mode?: string; fields?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_request' }, origin);
  }

  // 2) 남은 횟수만 묻기
  if (body.action === 'status') {
    const { data: used, error: usageError } = await admin.rpc('get_doc_helper_usage', { p_user: user.id });
    if (usageError) return json(500, { error: 'server' }, origin);
    return json(200, { open: isOpen(), limit: DAILY_LIMIT, remaining: Math.max(DAILY_LIMIT - (used ?? 0), 0) }, origin);
  }

  // 3) 켜짐·설정·입력 확인
  if (!isOpen()) return json(403, { error: 'closed' }, origin);
  if (!Deno.env.get('GEMINI_API_KEY') || !Deno.env.get('GEMINI_MODEL')) return json(503, { error: 'not_configured' }, origin);
  const mode = body.mode ?? '';
  if (!MODES[mode as keyof typeof MODES]?.usesAi) return json(400, { error: 'unknown_mode' }, origin);
  const checked = validateFields(mode, body.fields ?? {});
  if (!checked.ok) return json(400, checked, origin);

  // 4) 하루 횟수 차감 (이 사람이 다 썼으면 -1, 사이트 전체 상한이면 -2)
  const { data: remaining, error } = await admin.rpc('consume_doc_helper_quota', {
    p_user: user.id, p_limit: DAILY_LIMIT, p_total_limit: DAILY_TOTAL_LIMIT,
  });
  if (error) return json(500, { error: 'server' }, origin);
  if (remaining === -2) return json(429, { error: 'busy' }, origin);
  if (remaining < 0) return json(429, { error: 'quota', remaining: 0 }, origin);

  // 5) Gemini — 실패하면 횟수를 돌려준다. 오류 내용만 남기고 입력은 남기지 않는다
  try {
    const text = await askAi(mode, checked.fields);
    return json(200, { text, remaining }, origin);
  } catch (failure) {
    await admin.rpc('refund_doc_helper_quota', { p_user: user.id });
    console.error('doc-helper ai failed:', failure instanceof Error ? failure.message : 'unknown');
    // 429 무료 한도·503 과부하(다시 시도 뒤에도) — 잠시 뒤 다시
    if (failure instanceof AiError && isBusyStatus(failure.status)) return json(429, { error: 'busy', remaining: remaining + 1 }, origin);
    return json(502, { error: 'ai', remaining: remaining + 1 }, origin);
  }
});

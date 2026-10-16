// 서류 도우미 서버 함수 — 자소서 길잡이·면접 길잡이를 운영자의 OpenAI(GPT)로 답한다 (SPEC.md '서류 도우미')
// 순서: 로그인 확인 → (status면 남은 횟수) → 켜짐 확인 → 입력 확인 → 하루 3회 차감 → GPT → 실패하면 환불
// 비밀값은 Supabase Edge Function Secrets에만 둔다: OPENAI_API_KEY, OPENAI_MODEL, DOC_HELPER_ENABLED, DOC_HELPER_UNTIL
// 입력 내용은 저장하거나 로그로 남기지 않는다
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildMessages, DAILY_LIMIT, MODES, validateFields } from '../_shared/docHelperRules.js';

const ALLOWED_ORIGINS = ['https://jeong-haeun.github.io', 'http://localhost:5174'];

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
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

async function askGpt(mode: string, fields: Record<string, unknown>) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_MODEL');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: buildMessages(mode, fields), max_completion_tokens: 1500 }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!res.ok) throw new Error(`openai status ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('openai empty answer');
  return text;
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
    const { data: used } = await admin.rpc('get_doc_helper_usage', { p_user: user.id });
    return json(200, { open: isOpen(), limit: DAILY_LIMIT, remaining: Math.max(DAILY_LIMIT - (used ?? 0), 0) }, origin);
  }

  // 3) 켜짐·설정·입력 확인
  if (!isOpen()) return json(403, { error: 'closed' }, origin);
  if (!Deno.env.get('OPENAI_API_KEY') || !Deno.env.get('OPENAI_MODEL')) return json(503, { error: 'not_configured' }, origin);
  const mode = body.mode ?? '';
  if (!MODES[mode as keyof typeof MODES]?.usesGpt) return json(400, { error: 'unknown_mode' }, origin);
  const checked = validateFields(mode, body.fields ?? {});
  if (!checked.ok) return json(400, checked, origin);

  // 4) 하루 횟수 차감 (다 썼으면 -1)
  const { data: remaining, error } = await admin.rpc('consume_doc_helper_quota', { p_user: user.id, p_limit: DAILY_LIMIT });
  if (error) return json(500, { error: 'server' }, origin);
  if (remaining < 0) return json(429, { error: 'quota', remaining: 0 }, origin);

  // 5) GPT — 실패하면 횟수를 돌려준다. 오류 내용만 남기고 입력은 남기지 않는다
  try {
    const text = await askGpt(mode, checked.fields);
    return json(200, { text, remaining }, origin);
  } catch (failure) {
    await admin.rpc('refund_doc_helper_quota', { p_user: user.id });
    console.error('doc-helper gpt failed:', failure instanceof Error ? failure.message : 'unknown');
    return json(502, { error: 'gpt', remaining: remaining + 1 }, origin);
  }
});

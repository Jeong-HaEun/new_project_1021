// 커뮤니티 글·댓글·신고 서버(Supabase) 읽기·쓰기 (supabase/migrations/20261018000000_community.sql, 20261019000000_community_guard.sql)
// 사용자 id는 보내지 않는다 — 서버가 로그인 정보로 채우고, 수정·삭제는 RLS가 본인 것만 허락한다
import { getServerClient } from './server.js';

const POSTS = 'community_posts';
const COMMENTS = 'community_comments';
// '*': 보호·운영자 SQL(hidden·is_official 칸) 적용 전·후 모두 동작하도록 칸 이름을 하나하나 적지 않는다 (댓글도 같음)
const POST_COLUMNS = '*, community_comments(count)';
const REPORTS = 'community_reports';
export const PAGE_SIZE = 50;

async function run(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// 최신 글 50개 (category: 'all' 또는 분류 id)
export async function fetchPosts(category) {
  const client = await getServerClient();
  let query = client.from(POSTS).select(POST_COLUMNS).order('created_at', { ascending: false }).limit(PAGE_SIZE);
  if (category !== 'all') query = query.eq('category', category);
  return run(query);
}

// 글 하나 (없으면 null)
export async function fetchPost(id) {
  const client = await getServerClient();
  return run(client.from(POSTS).select(POST_COLUMNS).eq('id', id).maybeSingle());
}

export async function fetchComments(postId) {
  const client = await getServerClient();
  return run(client.from(COMMENTS).select('*').eq('post_id', postId).order('created_at'));
}

// 새 글 → 새 글 번호
export async function createPost(fields) {
  const client = await getServerClient();
  const row = await run(client.from(POSTS).insert(fields).select('id').single());
  return row.id;
}

// 본인 글이 아니면 RLS 때문에 0개가 바뀐다 → 'not-owner'
export async function updatePost(id, fields) {
  const client = await getServerClient();
  const rows = await run(client.from(POSTS).update(fields).eq('id', id).select('id'));
  if (rows.length === 0) throw new Error('not-owner');
}

export async function deletePost(id) {
  const client = await getServerClient();
  const rows = await run(client.from(POSTS).delete().eq('id', id).select('id'));
  if (rows.length === 0) throw new Error('not-owner');
}

export async function createComment(postId, fields) {
  const client = await getServerClient();
  await run(client.from(COMMENTS).insert({ post_id: postId, ...fields }));
}

export async function deleteComment(id) {
  const client = await getServerClient();
  const rows = await run(client.from(COMMENTS).delete().eq('id', id).select('id'));
  if (rows.length === 0) throw new Error('not-owner');
}

// 내가 이 글을 신고했는지 (RLS가 본인 신고만 돌려준다)
export async function fetchMyReport(postId) {
  const client = await getServerClient();
  const rows = await run(client.from(REPORTS).select('id').eq('post_id', postId));
  return rows.length > 0;
}

// 신고 — 내 글·같은 글 두 번은 DB가 거절한다 (supabase/migrations/20261019000000_community_guard.sql)
export async function reportPost(postId, reason) {
  const client = await getServerClient();
  await run(client.from(REPORTS).insert({ post_id: postId, reason }));
}

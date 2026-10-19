// 운영자 서버 호출 — 모두 로그인한 사람의 토큰으로 부르고, 운영자인지는 DB 함수가 확인한다
// (supabase/migrations/20261019010000_hanclass_admin.sql). 관리자 키는 쓰지 않는다
import { getServerClient } from './server.js';

async function rpc(name, args) {
  const client = await getServerClient();
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data;
}

// null(일반 회원) | 'admin' | 'super_admin'
export async function fetchAdminRole() {
  return (await rpc('hanclass_admin_role')) ?? null;
}

export const fetchOverview = () => rpc('admin_overview');
export const fetchReportedPosts = () => rpc('admin_reported_posts');

export const setPostHidden = (postId, hidden, reason) =>
  rpc('admin_set_post_hidden', { p_post: postId, p_hidden: hidden, p_reason: reason });

export const deletePostAsAdmin = (postId, reason) => rpc('admin_delete_post', { p_post: postId, p_reason: reason });

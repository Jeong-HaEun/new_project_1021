import {describe,it,expect,vi} from 'vitest';
import {createClient} from '@supabase/supabase-js';
import {createAuthStorage} from '../src/lib/authStorage.js';
const store=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
const key='sb-test-auth-token';
for(const remember of [false,true]) {
 it('실제 SDK 세션 공유 — 유지 '+remember,async()=>{
  const local=store(),session=store();
  const parent=createAuthStorage({local,session,storageKey:key}); parent.setRemember(remember);
  parent.setItem(key,JSON.stringify({access_token:'fixture',refresh_token:'fixture',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'fixture-id',user_metadata:{nickname:'별명'}}}));
  const fetch=vi.fn(()=>Promise.reject(Error('외부 요청 금지')));
  const make=()=>createClient('https://test.supabase.co','public-test',{auth:{storage:createAuthStorage({local,session,storageKey:key}),autoRefreshToken:false,detectSessionInUrl:false,flowType:'pkce'},global:{fetch}});
  const app=make(),frame=make();
  const [a,b]=await Promise.all([app.auth.getSession(),frame.auth.getSession()]);
  expect(a.data.session?.user.id).toBe('fixture-id');
  expect(b.data.session?.user.id).toBe('fixture-id'); expect(fetch).not.toHaveBeenCalled();
  app.auth.stopAutoRefresh();frame.auth.stopAutoRefresh();
 });
}
describe('카카오 PKCE 리디렉션 준비',()=>{
 it('브라우저 이동 없이 만든 verifier가 같은 탭의 다음 페이지에도 남는다',async()=>{
  const local=store(),session=store(),storage=createAuthStorage({local,session,storageKey:key});
  const client=createClient('https://test.supabase.co','public-test',{auth:{storage,autoRefreshToken:false,detectSessionInUrl:false,flowType:'pkce'}});
  const {data,error}=await client.auth.signInWithOAuth({provider:'kakao',options:{redirectTo:'http://localhost/new_project_1021/myclass.html',skipBrowserRedirect:true}});
  expect(error).toBeNull();expect(data.url).toContain('provider=kakao');
  expect(data.url).toContain('code_challenge=');
  expect(createAuthStorage({local,session,storageKey:key}).getItem(key+'-code-verifier')).toBeTruthy();
  expect(local.getItem(key+'-code-verifier')).toBeNull();
  client.auth.stopAutoRefresh();
 });
});


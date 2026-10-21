import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
const mocks=vi.hoisted(()=>({ storage:{storageKey:'hanclass-sb-test-auth-token',setRemember:vi.fn(()=>true)}, client:{auth:{}}, createClient:vi.fn(), policy:vi.fn() }));
vi.mock('@supabase/supabase-js',()=>({createClient:mocks.createClient}));
vi.mock('../src/lib/authPreference.js',()=>({getAuthPolicy:mocks.policy}));
beforeEach(()=>{
 vi.resetModules(); vi.clearAllMocks();
 vi.stubEnv('VITE_SUPABASE_URL','https://test.supabase.co');
 vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','public-test');
 mocks.policy.mockResolvedValue(mocks.storage); mocks.createClient.mockReturnValue(mocks.client);
});
afterEach(()=>vi.unstubAllEnvs());
describe('실제 Supabase 클라이언트와 저장 정책 연결',()=>{
 it('클라이언트에 선택 저장소를 전달하며 동시 조회는 한 번만 초기화한다',async()=>{
   const {getServerClient}=await import('../src/lib/server.js');
   const [a,b]=await Promise.all([getServerClient(),getServerClient()]);
   expect(a).toBe(b); expect(mocks.createClient).toHaveBeenCalledTimes(1);
   expect(mocks.createClient).toHaveBeenCalledWith('https://test.supabase.co','public-test',{auth:{storage:mocks.storage,storageKey:mocks.storage.storageKey,persistSession:true}});
 });
 it('체크 상태를 같은 저장소에 반영한다',async()=>{
   const {setRememberLogin}=await import('../src/lib/server.js');
   expect(await setRememberLogin(true)).toBe(true);
   expect(mocks.storage.setRemember).toHaveBeenCalledWith(true);
 });
 it('저장 정책 로드 실패를 지속 저장으로 대체하지 않고 다음 요청에서 재시도한다',async()=>{
   mocks.policy.mockRejectedValueOnce(Error('offline'));
   const {getServerClient}=await import('../src/lib/server.js');
   await expect(getServerClient()).rejects.toThrow('offline');
   expect(mocks.createClient).not.toHaveBeenCalled();
   await expect(getServerClient()).resolves.toBe(mocks.client);
 });
});


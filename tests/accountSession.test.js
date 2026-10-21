import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({signOut:vi.fn(),getServerClient:vi.fn(),setRememberLogin:vi.fn()}));
vi.mock('../src/lib/server.js',()=>({getServerClient:mocks.getServerClient,setRememberLogin:mocks.setRememberLogin,isServerConfigured:()=>true}));
import {signOut} from '../src/lib/account.js';
beforeEach(()=>{vi.clearAllMocks();mocks.getServerClient.mockResolvedValue({auth:{signOut:mocks.signOut}});mocks.setRememberLogin.mockResolvedValue(false);});
describe('로그아웃과 유지 선택',()=>{
 it('성공한 로그아웃 뒤에는 로그인 유지 선택도 해제한다',async()=>{
  mocks.signOut.mockResolvedValue({error:null});await signOut();
  expect(mocks.setRememberLogin).toHaveBeenCalledWith(false);
 });
 it('로그아웃 실패를 성공으로 표시하지 않는다',async()=>{
  mocks.signOut.mockResolvedValue({error:Error('offline')});
  await expect(signOut()).rejects.toThrow('offline');
  expect(mocks.setRememberLogin).not.toHaveBeenCalled();
 });
});


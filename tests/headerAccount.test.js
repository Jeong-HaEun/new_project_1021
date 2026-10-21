import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const api=vi.hoisted(()=>({getCurrentUser:vi.fn(),onAuthChange:vi.fn(),callback:null}));
vi.mock('../src/lib/account.js',()=>api);
import {HeaderAccount} from '../src/components/HeaderAccount.js';
function node(tag) {
 return {tag,children:[],attrs:{},textContent:'',classList:{add(){}},
 setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},
 append(...children){this.children.push(...children);},addEventListener(){}};
}
beforeEach(()=>{
 vi.stubGlobal('document',{createElement:node,createElementNS:(_,tag)=>node(tag)});
 api.onAuthChange.mockImplementation(async cb=>{api.callback=cb;});
 api.getCurrentUser.mockResolvedValue(null);
});
afterEach(()=>vi.unstubAllGlobals());
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
describe('헤더 계정 상태',()=>{
 it('로그인·계정 변경·로그아웃을 반영하며 HTML을 실행하지 않는다',async()=>{
  const link=HeaderAccount({active:'myclass'}); await flush();
  expect(link.children[1].textContent).toBe('로그인');
  api.callback({user_metadata:{nickname:'<b>별명</b>'}});
  expect(link.children[1].textContent).toBe('<b>별명</b>');
  expect(link.children[1].children).toHaveLength(0);
  expect(link.children[2].hidden).toBe(false);
  expect(link.attrs['aria-label']).toContain('내 강의실');
  api.callback(null); expect(link.children[1].textContent).toBe('로그인');
  expect(link.children[2].hidden).toBe(true);
 });
 it('로그아웃보다 늦게 도착한 이전 계정 조회 결과를 버린다',async()=>{
  let done; api.getCurrentUser.mockReturnValue(new Promise(resolve=>{done=resolve;}));
  const link=HeaderAccount(); api.callback(null);
  done({user_metadata:{nickname:'이전계정'}}); await flush();
  expect(link.children[1].textContent).toBe('로그인');
 });
});

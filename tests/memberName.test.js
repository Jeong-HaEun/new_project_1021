import { describe,it,expect } from 'vitest';
import { memberName } from '../src/lib/memberName.js';
describe('헤더 회원 별명', () => {
 it('로그아웃은 회원 이름을 만들지 않는다',()=>expect(memberName(null)).toBe(''));
 it('카카오 별명을 우선하고 이메일을 표시하지 않는다',()=>{
   expect(memberName({user_metadata:{nickname:'취업메이트'},email:'private@example.com'})).toBe('취업메이트');
 });
 it('별명이 없으면 가입일과 계정 기반 숫자를 쓴다',()=>{
   const user={id:'aaaa-bbbb-cccc',created_at:'2026-10-20T23:30:00Z',email:'private@example.com'};
   expect(memberName(user)).toMatch(/^1021_\d{6}$/);
   expect(memberName({...user,last_sign_in_at:'later'})).toBe(memberName(user));
   expect(memberName({...user,id:'dddd-eeee'})).not.toBe(memberName(user));
 });
 it('깨진 가입일과 공백 별명도 안정적으로 처리한다',()=>{
   expect(memberName({id:'x',created_at:'bad',user_metadata:{nickname:'  '}})).toMatch(/^회원_\d{6}$/);
 });
 it('다른 계정의 커뮤니티 로컬 별명·이메일·전체 이름을 대신 쓰지 않는다',()=>{
   expect(memberName({id:'x',user_metadata:{full_name:'실명'},email:'secret@example.com'})).toMatch(/^회원_/);
 });
 it('별명 길이와 제어문자를 정리한다',()=>{
   expect([...memberName({user_metadata:{nickname:'가'.repeat(60)}})]).toHaveLength(24);
   expect(memberName({user_metadata:{nickname:'별명\n\t테스트'}})).toBe('별명 테스트');
 });
});

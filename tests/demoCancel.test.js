// 데모 수강 취소 — 이 브라우저 기록 정리(순수 함수)와 DB 삭제 권한 SQL 검사 (SPEC.md '데모 수강 취소')
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cancelLocalPurchase, CANCEL_NOTE } from '../src/lib/demoCancel.js';

const record = (courseId) => ({ courseId, purchasedAt: '2026-10-21T00:00:00.000Z' });

describe('cancelLocalPurchase — 이 브라우저의 구매 기록·완성 체크에서 한 강의 빼기', () => {
  it('해당 강의의 구매 기록과 완성 체크만 뺀다', () => {
    const state = { purchases: [record('c002'), record('c003')], outcomes: ['c002', 'c003'] };
    expect(cancelLocalPurchase(state, 'c002')).toEqual({ purchases: [record('c003')], outcomes: ['c003'] });
  });

  it('원래 기록은 바꾸지 않는다', () => {
    const state = { purchases: [record('c002')], outcomes: ['c002'] };
    cancelLocalPurchase(state, 'c002');
    expect(state).toEqual({ purchases: [record('c002')], outcomes: ['c002'] });
  });

  it('없는 강의를 취소해도 그대로', () => {
    const state = { purchases: [record('c002')], outcomes: [] };
    expect(cancelLocalPurchase(state, 'c999')).toEqual(state);
  });
});

describe('안내 문구', () => {
  it('데모이고 포인트·쿠폰은 돌려주지 않는다고 알린다', () => {
    expect(CANCEL_NOTE).toContain('데모');
    expect(CANCEL_NOTE).toContain('포인트·쿠폰');
  });
});

const ROOT = join(import.meta.dirname, '..');
const strip = (text) => text.replace(/--.*$/gm, '');
const sql = strip(readFileSync(join(ROOT, 'supabase/migrations/20261021010000_demo_enrollments_cancel.sql'), 'utf8'));
const rollback = strip(readFileSync(join(ROOT, 'supabase/rollback/20261021010000_demo_enrollments_cancel_down.sql'), 'utf8'));

describe('DB — 본인 데모 수강 기록만 취소', () => {
  it('로그인한 사람에게 삭제 권한을 주되 본인 행만', () => {
    expect(sql).toMatch(/grant delete on public\.demo_enrollments to authenticated/);
    expect(sql).toMatch(/for delete\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
  });

  it('비로그인(anon)에게는 주지 않고, 표를 지우거나 다른 정책을 바꾸지 않는다', () => {
    expect(sql).not.toMatch(/to anon|drop table|truncate|delete from/i);
  });

  it('되돌리기는 정책과 권한을 함께 거둔다', () => {
    expect(rollback).toMatch(/drop policy/);
    expect(rollback).toMatch(/revoke delete on public\.demo_enrollments from authenticated/);
  });
});

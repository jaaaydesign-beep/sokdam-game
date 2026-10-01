import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// node 에는 localStorage 가 없으므로 메모리 스텁을 주입해 저장 규칙을 검증한다.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
};

await import('../src/proverbs.js');
await import('../src/storage.js');
const storage = globalThis.Sokdam.storage;
const KEY = 'sokdam-plane-v2';

beforeEach(() => { mem.clear(); });

test('저장 없음 → clearedProblems 0', () => {
  assert.deepEqual(storage.load(), { clearedProblems: 0 });
});

test('saveCleared 는 전진만 한다 (낮은 값으로 되돌리지 않음)', () => {
  storage.saveCleared(7);
  assert.equal(storage.load().clearedProblems, 7);
  storage.saveCleared(3); // 완료 돌 재플레이 중 클리어 — 후퇴 금지
  assert.equal(storage.load().clearedProblems, 7);
  storage.saveCleared(8);
  assert.equal(storage.load().clearedProblems, 8);
});

test('손상된 저장값은 0 으로 복구', () => {
  mem.set(KEY, '{broken json');
  assert.equal(storage.load().clearedProblems, 0);
  mem.set(KEY, JSON.stringify({ clearedProblems: 'abc' }));
  assert.equal(storage.load().clearedProblems, 0);
});

test('범위 밖 값은 0~100 으로 클램프', () => {
  mem.set(KEY, JSON.stringify({ clearedProblems: 999 }));
  assert.equal(storage.load().clearedProblems, 100);
  mem.set(KEY, JSON.stringify({ clearedProblems: -5 }));
  assert.equal(storage.load().clearedProblems, 0);
});

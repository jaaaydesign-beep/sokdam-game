import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/proverbs.js');
await import('../src/progression.js');
const prog = globalThis.Sokdam.progression;

// 사용자 확정 룰: 돌(단계) 1개 = 속담 10개 묶음, 돌 10개, 문제 단위 진행 저장.
// 전역 문제 번호 n(1~100)이 게임 룰(난이도 밴드·confusable)의 stage 와 동일.

test('상수: 돌 10개 × 돌당 10문제 = 전체 100문제', () => {
  assert.equal(prog.STONE_COUNT, 10);
  assert.equal(prog.PROBLEMS_PER_STONE, 10);
  assert.equal(prog.TOTAL_PROBLEMS, 100);
});

test('stoneOf / problemInStone: 전역 번호 ↔ (돌, 돌 내 문제) 매핑', () => {
  assert.equal(prog.stoneOf(1), 1);
  assert.equal(prog.stoneOf(10), 1);
  assert.equal(prog.stoneOf(11), 2);
  assert.equal(prog.stoneOf(100), 10);
  assert.equal(prog.problemInStone(1), 1);
  assert.equal(prog.problemInStone(10), 10);
  assert.equal(prog.problemInStone(11), 1);
  assert.equal(prog.problemInStone(100), 10);
});

test('stoneStatus: 완료/도전 중/잠김', () => {
  // 0문제 클리어 → 돌1 이 도전 중, 나머지 잠김
  assert.equal(prog.stoneStatus(0, 1), 'cur');
  assert.equal(prog.stoneStatus(0, 2), 'lock');
  // 13문제 클리어 → 돌1 완료, 돌2 도전 중, 돌3 잠김
  assert.equal(prog.stoneStatus(13, 1), 'done');
  assert.equal(prog.stoneStatus(13, 2), 'cur');
  assert.equal(prog.stoneStatus(13, 3), 'lock');
  // 전부 클리어 → 모두 done
  assert.equal(prog.stoneStatus(100, 10), 'done');
  assert.equal(prog.stoneStatus(100, 1), 'done');
});

test('돌 경계: 정확히 10문제 클리어 시 돌1 done, 돌2 cur', () => {
  assert.equal(prog.stoneStatus(10, 1), 'done');
  assert.equal(prog.stoneStatus(10, 2), 'cur');
  assert.equal(prog.stoneStatus(10, 3), 'lock');
});

test('stoneProgress: 돌 내 완료 문제 수 (prog-pill "n / 10 문제")', () => {
  assert.equal(prog.stoneProgress(0, 1), 0);
  assert.equal(prog.stoneProgress(3, 1), 3);
  assert.equal(prog.stoneProgress(13, 1), 10); // 완료 돌은 10 고정
  assert.equal(prog.stoneProgress(13, 2), 3);
  assert.equal(prog.stoneProgress(13, 3), 0);  // 잠긴 돌은 0
});

test('startProblem: 도전 중 돌은 이어하기, 완료 돌은 1번부터 재플레이, 잠긴 돌은 null', () => {
  assert.equal(prog.startProblem(13, 2), 14);  // cur: 다음 미클리어 문제
  assert.equal(prog.startProblem(13, 1), 1);   // done: 처음부터 재플레이
  assert.equal(prog.startProblem(13, 3), null); // lock
  assert.equal(prog.startProblem(0, 1), 1);
  assert.equal(prog.startProblem(100, 10), 91); // 전부 완료 후 마지막 돌 재플레이
});

test('currentStone: 이어하기 대상 돌', () => {
  assert.equal(prog.currentStone(0), 1);
  assert.equal(prog.currentStone(9), 1);
  assert.equal(prog.currentStone(10), 2);
  assert.equal(prog.currentStone(99), 10);
  assert.equal(prog.currentStone(100), 10); // 전부 완료 시 마지막 돌에 머뭄
});

test('nextAfterClear: 돌 안에서는 다음 문제, 10번째는 징검다리 복귀, 100번은 전체 완료', () => {
  assert.deepEqual(prog.nextAfterClear(1), { kind: 'next', problem: 2 });
  assert.deepEqual(prog.nextAfterClear(9), { kind: 'next', problem: 10 });
  assert.deepEqual(prog.nextAfterClear(10), { kind: 'stone-done', stone: 1 });
  assert.deepEqual(prog.nextAfterClear(99), { kind: 'next', problem: 100 });
  assert.deepEqual(prog.nextAfterClear(100), { kind: 'all-done' });
});

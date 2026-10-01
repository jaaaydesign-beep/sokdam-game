import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/geometry.js');
const { GEO, VIEWS, viewY, viewLaneCenterX } = globalThis.Sokdam;

// 룰 좌표(모바일 1벌) → 뷰 로컬 좌표 affine 매핑의 경계·선형성 검증.

test('viewY: 스폰점과 판정선이 양 뷰의 기준점으로 정확히 매핑된다', () => {
  for (const key of ['m', 'w']) {
    const v = VIEWS[key];
    assert.equal(viewY(v, GEO.SPAWN_Y), v.spawnLocal, key);
    assert.equal(viewY(v, GEO.JUDGE_Y), v.judgeLocal, key);
  }
});

test('viewY: 선형 — 중간점은 중간점으로 간다', () => {
  const mid = (GEO.SPAWN_Y + GEO.JUDGE_Y) / 2;
  for (const key of ['m', 'w']) {
    const v = VIEWS[key];
    assert.ok(Math.abs(viewY(v, mid) - (v.spawnLocal + v.judgeLocal) / 2) < 1e-9, key);
  }
});

test('viewY: 판정선 너머(t>1)도 연속으로 증가한다 (지나친 낙하물 퇴장 연출)', () => {
  for (const key of ['m', 'w']) {
    const v = VIEWS[key];
    assert.ok(viewY(v, GEO.JUDGE_Y + 100) > v.judgeLocal, key);
  }
});

test('viewLaneCenterX: 양 뷰의 레인 중심', () => {
  assert.equal(viewLaneCenterX(VIEWS.m, 0), 39);
  assert.equal(viewLaneCenterX(VIEWS.m, 4), 351);
  assert.equal(viewLaneCenterX(VIEWS.w, 0), 60);
  assert.equal(viewLaneCenterX(VIEWS.w, 4), 540);
});

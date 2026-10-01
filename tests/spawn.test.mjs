import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/geometry.js');
await import('../src/spawn.js');
const { difficultyFor, planSpawn, MOVE_TIME, SPEED_MARGIN } = globalThis.Sokdam.spawn;
const { GEO } = globalThis.Sokdam;

// 시드 고정 rng (mulberry32)
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('난이도는 10단계 구간으로 단조 증가하다 상한 유지', () => {
  let prev = difficultyFor(1);
  for (let s = 11; s <= 100; s += 10) {
    const d = difficultyFor(s);
    assert.ok(d.fallSpeed >= prev.fallSpeed);
    assert.ok(d.bombChance >= prev.bombChance);
    prev = d;
  }
  assert.deepEqual(difficultyFor(91), difficultyFor(100)); // 상한 도달 후 동일
});

test('같은 구간 안에서는 난이도가 같다', () => {
  assert.deepEqual(difficultyFor(1), difficultyFor(10));
  assert.deepEqual(difficultyFor(41), difficultyFor(50));
});

test('속도 상한: 4칸 이동 시간 × 여유계수보다 낙하 통과가 느리다', () => {
  for (let s = 1; s <= 100; s++) {
    const d = difficultyFor(s);
    const traverse = (GEO.JUDGE_Y - GEO.SPAWN_Y) / d.fallSpeed;
    assert.ok(traverse >= 4 * MOVE_TIME * SPEED_MARGIN, `stage ${s}`);
  }
});

test('혼동 글자 혼입은 31단계부터', () => {
  assert.equal(difficultyFor(30).confusable, false);
  assert.equal(difficultyFor(31).confusable, true);
});

test('폭탄은 동시에 1개만 활성화된다', () => {
  const rng = makeRng(42);
  for (let trial = 0; trial < 500; trial++) {
    const activeItems = [{ id: 1, kind: 'bomb', lane: 2, y: 300 }];
    const spawn = planSpawn({
      stage: 95, neededChars: ['간'], activeItems, planeLane: 0, rng,
      spawnsSinceNeeded: 0,
    });
    if (spawn) assert.notEqual(spawn.kind, 'bomb');
  }
});

test('폭탄은 비행기 현재 레인 바로 위에는 떨어지지 않는다', () => {
  const rng = makeRng(11);
  let bombs = 0;
  for (let trial = 0; trial < 2000; trial++) {
    const spawn = planSpawn({
      stage: 95, neededChars: ['간'], activeItems: [], planeLane: 3, rng,
      spawnsSinceNeeded: 0,
    });
    if (spawn && spawn.kind === 'bomb') {
      bombs++;
      assert.notEqual(spawn.lane, 3);
    }
  }
  assert.ok(bombs > 0, '폭탄이 한 번도 안 나오면 테스트가 무의미');
});

test('스폰 결정은 항상 유효한 레인(0~4)을 가진다', () => {
  const rng = makeRng(99);
  for (let trial = 0; trial < 500; trial++) {
    const spawn = planSpawn({
      stage: (trial % 100) + 1, neededChars: ['간', '양'], activeItems: [],
      planeLane: trial % 5, rng, spawnsSinceNeeded: trial % 4,
    });
    assert.ok(spawn);
    assert.ok(Number.isInteger(spawn.lane) && spawn.lane >= 0 && spawn.lane < GEO.LANES);
  }
});

test('필요 정답 글자 기아 방지: 연속 스폰 중 반드시 등장', () => {
  const rng = makeRng(7);
  let worst = 0;
  let sinceNeeded = 0;
  for (let i = 0; i < 300; i++) {
    const spawn = planSpawn({
      stage: 95, neededChars: ['간', '양'], activeItems: [], planeLane: 2, rng,
      spawnsSinceNeeded: sinceNeeded,
    });
    assert.ok(spawn, '스폰은 항상 결정되어야 함');
    if (spawn.kind === 'letter' && ['간', '양'].includes(spawn.char)) {
      sinceNeeded = 0;
    } else {
      sinceNeeded++;
      worst = Math.max(worst, sinceNeeded);
    }
  }
  assert.ok(worst <= 4, `필요 글자 없이 최대 ${worst}연속 스폰`);
});

test('오답 글자는 필요 글자와 겹치지 않는다', () => {
  const rng = makeRng(5);
  for (let trial = 0; trial < 500; trial++) {
    const spawn = planSpawn({
      stage: 50, neededChars: ['간', '양', '외'], activeItems: [], planeLane: 2, rng,
      spawnsSinceNeeded: 0,
    });
    if (spawn && spawn.kind === 'letter' && spawn.isDecoy) {
      assert.ok(!['간', '양', '외'].includes(spawn.char), spawn.char);
    }
  }
});

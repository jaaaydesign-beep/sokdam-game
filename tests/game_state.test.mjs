import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/geometry.js');
await import('../src/spawn.js');
await import('../src/game_state.js');
const { createGame, moveLane, tick, retryStage } = globalThis.Sokdam.gameState;
const { GEO } = globalThis.Sokdam;

const PROVERB = {
  problem: '소 잃고 외양간 고친다', answer: '외양간', blankStart: 5,
  meaning: '미리 준비하라는 뜻이에요.',
};
const rngZero = () => 0; // 결정적 rng

function withItem(state, item) { // 테스트 헬퍼: 판정선 직전 낙하물 주입
  return { ...state, items: [...state.items, { id: 999, y: GEO.JUDGE_Y - 1, ...item }] };
}

test('createGame 초기 상태', () => {
  const s = createGame(PROVERB, 3);
  assert.equal(s.hearts, 3);
  assert.equal(s.planeLane, 2);
  assert.deepEqual(s.filled, [false, false, false]);
  assert.equal(s.status, 'playing');
  assert.equal(s.items.length, 0);
  assert.equal(s.stage, 3);
});

test('moveLane 은 0~4 로 클램프', () => {
  let s = createGame(PROVERB, 1);
  for (let i = 0; i < 9; i++) s = moveLane(s, -1).state;
  assert.equal(s.planeLane, 0);
  for (let i = 0; i < 9; i++) s = moveLane(s, +1).state;
  assert.equal(s.planeLane, 4);
});

test('정답 글자 획득: 원래 위치 칸이 채워진다 (순서 무관)', () => {
  let s = createGame(PROVERB, 1);
  s = withItem(s, { kind: 'letter', char: '양', lane: s.planeLane });
  const r = tick(s, 0.05, rngZero); // 판정선 통과
  assert.deepEqual(r.state.filled, [false, true, false]); // "◻양◻"
  assert.ok(r.events.some((e) => e.type === 'catch' && e.cellIndex === 1));
});

test('오답 글자: 패널티 없음, wrong 이벤트만', () => {
  let s = createGame(PROVERB, 1);
  s = withItem(s, { kind: 'letter', char: '소', lane: s.planeLane });
  const r = tick(s, 0.05, rngZero);
  assert.equal(r.state.hearts, 3);
  assert.deepEqual(r.state.filled, [false, false, false]);
  assert.ok(r.events.some((e) => e.type === 'wrong'));
});

test('폭탄 피격: 하트 1 감소', () => {
  let s = createGame(PROVERB, 1);
  s = withItem(s, { kind: 'bomb', lane: s.planeLane });
  const r = tick(s, 0.05, rngZero);
  assert.equal(r.state.hearts, 2);
  assert.ok(r.events.some((e) => e.type === 'bomb'));
});

test('다른 레인 낙하물은 비행기를 지나쳐 사라진다', () => {
  let s = createGame(PROVERB, 1);
  s = withItem(s, { kind: 'bomb', lane: (s.planeLane + 1) % 5 });
  let r = { state: s, events: [] };
  for (let i = 0; i < 100; i++) r = tick(r.state, 0.1, rngZero);
  assert.equal(r.state.hearts, 3);
  assert.ok(r.state.items.every((it) => it.id !== 999));
});

test('마지막 칸을 채우면 cleared', () => {
  let s = createGame(PROVERB, 1);
  for (const ch of ['외', '양']) {
    s = tick(withItem(s, { kind: 'letter', char: ch, lane: s.planeLane }), 0.05, rngZero).state;
  }
  const r = tick(withItem(s, { kind: 'letter', char: '간', lane: s.planeLane }), 0.05, rngZero);
  assert.equal(r.state.status, 'cleared');
  assert.ok(r.events.some((e) => e.type === 'clear'));
});

test('cleared 상태에서는 tick 이 상태를 바꾸지 않는다', () => {
  let s = createGame(PROVERB, 1);
  for (const ch of ['외', '양', '간']) {
    s = tick(withItem(s, { kind: 'letter', char: ch, lane: s.planeLane }), 0.05, rngZero).state;
  }
  const r = tick(s, 1, rngZero);
  assert.deepEqual(r.state, s);
  assert.deepEqual(r.events, []);
});

test('하트 0 → failed + fail 이벤트', () => {
  let s = createGame(PROVERB, 1);
  let lastEvents = [];
  for (let i = 0; i < 3; i++) {
    const r = tick(withItem(s, { kind: 'bomb', lane: s.planeLane }), 0.05, rngZero);
    s = r.state; lastEvents = r.events;
  }
  assert.equal(s.status, 'failed');
  assert.ok(lastEvents.some((e) => e.type === 'fail'));
});

test('retryStage: 채운 빈칸 유지, 하트 회복, 낙하물 초기화 (스펙 §2)', () => {
  let s = createGame(PROVERB, 1);
  s = tick(withItem(s, { kind: 'letter', char: '외', lane: s.planeLane }), 0.05, rngZero).state;
  for (let i = 0; i < 3; i++) {
    s = tick(withItem(s, { kind: 'bomb', lane: s.planeLane }), 0.05, rngZero).state;
  }
  assert.equal(s.status, 'failed');
  const r = retryStage(s);
  assert.deepEqual(r.state.filled, [true, false, false]); // 유지
  assert.equal(r.state.hearts, 3);
  assert.equal(r.state.items.length, 0);
  assert.equal(r.state.status, 'playing');
});

test('tick 은 스폰을 소유한다: 시간이 흐르면 낙하물이 생긴다', () => {
  let r = { state: createGame(PROVERB, 1), events: [] };
  const rng = () => 0.99; // 폭탄 확률 회피
  for (let i = 0; i < 40; i++) r = tick(r.state, 0.1, rng);
  assert.ok(r.state.items.length > 0);
  assert.ok(r.state.nextItemId > 0);
});

test('같은 글자 중복 획득은 오답 취급 (이미 채워진 칸)', () => {
  let s = createGame(PROVERB, 1);
  s = tick(withItem(s, { kind: 'letter', char: '양', lane: s.planeLane }), 0.05, rngZero).state;
  const r = tick(withItem(s, { kind: 'letter', char: '양', lane: s.planeLane }), 0.05, rngZero);
  assert.deepEqual(r.state.filled, [false, true, false]);
  assert.ok(r.events.some((e) => e.type === 'wrong'));
});

test('전이 함수는 입력 state 를 변경하지 않는다 (불변성)', () => {
  const s = createGame(PROVERB, 1);
  const snapshot = JSON.stringify(s);
  tick(withItem(s, { kind: 'letter', char: '양', lane: s.planeLane }), 0.05, rngZero);
  moveLane(s, 1);
  retryStage(s);
  assert.equal(JSON.stringify(s), snapshot);
});

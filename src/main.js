(function (root) {
  'use strict';
  const gameState = root.gameState;
  const render = root.render;
  const audio = root.audio;
  const storage = root.storage;
  const proverbs = root.proverbs;
  const prog = root.progression;

  // 스케일·좌표 CSS 는 셸(style.css 의 .stage 래퍼)이 소유한다 — JS 는 건드리지 않는다.
  // (goodtree 의 fitStage/injectGeo 는 이식 제외: 이중 스케일 방지)

  let current = null; // { state } — 전이 함수 결과로만 교체. 룰 판단은 여기서 하지 않는다.
  let paused = false;
  let lastT = 0;
  let pendingTimer = 0; // clear/fail 지연 전환 타이머 — 사용자가 먼저 화면을 떠나면 취소

  function playSection() { return document.getElementById('screen-play'); }
  function playActive() { return playSection().classList.contains('active'); }

  // ---- 화면 전환: 셸 훅 (.screen.active / #screen-play.paused) ----
  function show(screenId) {
    clearTimeout(pendingTimer);
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.toggle('active', s.id === screenId);
    });
    playSection().classList.remove('paused');
    paused = false;
    window.scrollTo(0, 0);
  }

  function setPaused(on) {
    if (!current || !playActive()) { return; }
    paused = on;
    playSection().classList.toggle('paused', on);
  }

  // ---- events 소비: 연출 전용 (게임 룰 판단 금지) ----
  function handleEvent(e) {
    switch (e.type) {
      case 'catch':
        audio.play('catch');
        render.syncQuiz(current.state);
        render.popCell(e.cellIndex);
        render.catchFx(current.state.planeLane, e.char);
        break;
      case 'wrong':
        audio.play('wrong');
        render.shakePlane();
        break;
      case 'bomb':
        audio.play('bomb');
        render.syncHearts(current.state);
        render.hitFlash();
        break;
      case 'clear':
        audio.play('clear');
        storage.saveCleared(current.state.stage); // 문제 단위 저장 → 이어하기 자동 충족
        pendingTimer = setTimeout(function () { showClear(current.state); }, 900);
        break;
      case 'fail':
        audio.play('fail');
        pendingTimer = setTimeout(function () { show('screen-retry'); }, 700);
        break;
      case 'move':
        audio.play('move');
        break;
    }
  }

  function applyTransition(r) {
    current.state = r.state;
    r.events.forEach(handleEvent);
  }

  // ---- 게임 루프 ----
  function loop(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    if (!paused && current && current.state.status === 'playing' && playActive()) {
      applyTransition(gameState.tick(current.state, dt, Math.random));
      render.frame(current.state);
    }
    requestAnimationFrame(loop);
  }

  // ---- 진행 흐름: 전역 문제 번호 n(= 게임 룰의 stage) 단위 ----
  function startProblem(n) {
    audio.ensureCtx();
    current = { state: gameState.createGame(proverbs[n - 1], n) };
    render.setStageChip(prog.stoneOf(n) + '단계');
    render.fullSync(current.state);
    show('screen-play');
  }

  function showClear(state) {
    render.fillClearCard(state.proverb);
    show('screen-clear');
  }

  function goHome() {
    current = null;
    render.buildStones(storage.load().clearedProblems, onStoneSelect);
    show('screen-main');
  }

  function onStoneSelect(stone) {
    audio.ensureCtx();
    audio.play('button');
    const n = prog.startProblem(storage.load().clearedProblems, stone);
    if (n !== null) { startProblem(n); }
  }

  // ---- 입력: data-action 버튼은 document 위임 1회 (숨은 뷰는 클릭 불가 → 가드 불요) ----
  const ACTIONS = {
    start: function () {
      audio.ensureCtx();
      audio.play('button');
      const cleared = storage.load().clearedProblems;
      startProblem(prog.startProblem(cleared, prog.currentStone(cleared)));
    },
    left: function () { move(-1); },
    right: function () { move(1); },
    pause: function () { audio.play('button'); setPaused(true); },
    resume: function () { audio.play('button'); setPaused(false); },
    home: function () { audio.play('button'); goHome(); },
    next: function () {
      audio.play('button');
      const r = prog.nextAfterClear(current.state.stage);
      if (r.kind === 'next') { startProblem(r.problem); } else { goHome(); } // 돌 완료·전체 완료 → 징검다리
    },
    retry: function () { // 채운 빈칸 유지 + 하트 회복 (룰은 retryStage 가 소유, 스펙 §2)
      audio.play('button');
      applyTransition(gameState.retryStage(current.state));
      render.fullSync(current.state);
      show('screen-play');
    },
    'retry-home': function () { goHome(); },
    mute: function () {
      const muted = audio.toggleMute();
      document.querySelectorAll('[data-action=mute]').forEach(function (b) {
        b.classList.toggle('muted', muted);
        b.setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기');
      });
    },
  };

  function move(dir) {
    if (!current || paused || !playActive()) { return; }
    applyTransition(gameState.moveLane(current.state, dir));
    render.frame(current.state);
  }

  function bindInput() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (btn && ACTIONS[btn.dataset.action]) { ACTIONS[btn.dataset.action](); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.repeat) { return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
      if (e.key === ' ' && current && playActive()) { // 웹 hud 안내: space = 일시정지
        e.preventDefault();
        audio.play('button');
        setPaused(!paused);
      }
    });
  }

  // ---- 부팅 ----
  document.addEventListener('DOMContentLoaded', function () {
    bindInput();
    render.buildStones(storage.load().clearedProblems, onStoneSelect);
    // 1024px 경계 통과: 레인 유령 노드 제거 + 전체 재동기화 1회
    render.onViewChange(function () {
      if (current) { render.fullSync(current.state); } else { render.clearLanes(); }
    });
    requestAnimationFrame(function (t) { lastT = t; requestAnimationFrame(loop); });
  });
})(globalThis.Sokdam = globalThis.Sokdam || {});

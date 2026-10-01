(function (root) {
  'use strict';
  const VIEWS = root.VIEWS;
  const prog = root.progression;

  const BALLOON_COLORS = ['b-pink', 'b-mint', 'b-yellow', 'b-lav', 'b-orange', 'b-blue'];

  // ---- 뷰 선택: 1024px 분기 (셸 CSS 의 .stage.mob/.stage.web 전환과 동일 기준) ----
  const mq = window.matchMedia('(min-width: 1024px)');
  function viewKey() { return mq.matches ? 'w' : 'm'; }
  function view() { return VIEWS[viewKey()]; }
  function stageRoot(screen, key) {
    return document.querySelector(
      '#screen-' + screen + ' .stage.' + (key === 'w' ? 'web' : 'mob'));
  }
  function inActive(screen, sel) { return stageRoot(screen, viewKey()).querySelector(sel); }
  function inBoth(screen, sel) { // 양 뷰 공통 갱신용 (저비용 정적 요소)
    return document.querySelectorAll('#screen-' + screen + ' ' + sel);
  }

  const itemEls = new Map(); // itemId → element (활성 뷰의 낙하물 노드)

  // ---- 낙하물 ----
  function clearLanes() { // 양 뷰 레인을 모두 청소 — 뷰 전환 시 유령 노드 방지
    itemEls.clear();
    inBoth('play', '[data-role=lanes]').forEach(function (l) {
      l.querySelectorAll('.balloon, .bomb, .pop, .fly').forEach(function (n) { n.remove(); });
    });
  }

  function makeItemEl(item, v) {
    if (item.kind === 'bomb') {
      const node = document.getElementById('tpl-bomb').content.firstElementChild.cloneNode(true);
      node.setAttribute('width', v.bombW);
      node.setAttribute('height', v.bombH);
      return node;
    }
    const div = document.createElement('div');
    div.className = 'balloon ' + BALLOON_COLORS[item.id % BALLOON_COLORS.length]
      + (viewKey() === 'w' ? ' big' : '');
    div.textContent = item.char;
    const str = document.createElement('span');
    str.className = 'str';
    div.appendChild(str);
    return div;
  }

  // state.items 와 DOM 을 id 로 diff (매 프레임 재생성 금지)
  function syncItems(state) {
    const v = view();
    const lanes = inActive('play', '[data-role=lanes]');
    const alive = new Set(state.items.map(function (it) { return it.id; }));
    for (const entry of Array.from(itemEls.entries())) {
      if (!alive.has(entry[0])) { entry[1].remove(); itemEls.delete(entry[0]); }
    }
    for (const it of state.items) {
      let node = itemEls.get(it.id);
      if (!node) {
        node = makeItemEl(it, v);
        itemEls.set(it.id, node);
        lanes.appendChild(node);
      }
      const w = it.kind === 'bomb' ? v.bombW : v.itemW;
      const x = root.viewLaneCenterX(v, it.lane) - w / 2;
      node.style.transform = 'translate(' + x + 'px,' + root.viewY(v, it.y) + 'px)';
    }
  }

  function syncPlane(state) {
    const v = view();
    const plane = inActive('play', '[data-role=plane]');
    plane.style.left = (root.viewLaneCenterX(v, state.planeLane) - v.planeW / 2) + 'px';
  }

  function syncHearts(state) {
    inBoth('play', '[data-role=hearts]').forEach(function (host) {
      Array.from(host.children).forEach(function (h, i) {
        h.classList.toggle('on', i < state.hearts);
        h.classList.toggle('off', i >= state.hearts);
      });
    });
  }

  // ---- 문제 문장 + 빈칸 (양 뷰 — 모바일 한 줄형 / 웹 hud 세로형) ----
  function makeCells(state, lg) {
    const cells = document.createElement('div');
    cells.className = 'cells';
    if (lg) { cells.style.gap = '10px'; }
    Array.from(state.proverb.answer).forEach(function (ch, i) {
      const cell = document.createElement('div');
      cell.className = (lg ? 'cell lg' : 'cell') + (state.filled[i] ? ' on' : '');
      cell.dataset.cellIndex = String(i);
      cell.textContent = state.filled[i] ? ch : '';
      cells.appendChild(cell);
    });
    return cells;
  }

  function syncQuiz(state) {
    const p = state.proverb;
    const before = p.problem.slice(0, p.blankStart).trim();
    const after = p.problem.slice(p.blankStart + p.answer.length).trim();

    const mQuiz = stageRoot('play', 'm').querySelector('[data-role=quiz]');
    mQuiz.textContent = '';
    if (before) { mQuiz.appendChild(span(before)); }
    mQuiz.appendChild(makeCells(state, false));
    if (after) { mQuiz.appendChild(span(after)); }

    const wQuiz = stageRoot('play', 'w').querySelector('[data-role=quiz]');
    wQuiz.querySelectorAll(':scope > :not(h4)').forEach(function (n) { n.remove(); });
    if (before) { wQuiz.appendChild(qtext(before)); }
    wQuiz.appendChild(makeCells(state, true));
    if (after) { wQuiz.appendChild(qtext(after)); }

    syncCollected(state);
  }

  function span(text) {
    const s = document.createElement('span');
    s.textContent = text;
    return s;
  }
  function qtext(text) {
    const d = document.createElement('div');
    d.className = 'qtext';
    d.textContent = text;
    return d;
  }

  // 웹 전용 "모은 글자" hud — 빈 풍선으로 시작, 획득한 칸만 글자를 드러낸다 (정답 스포 방지)
  function syncCollected(state) {
    const host = stageRoot('play', 'w').querySelector('[data-role=collected]');
    host.textContent = '';
    Array.from(state.proverb.answer).forEach(function (ch, i) {
      const b = document.createElement('div');
      b.className = 'balloon ' + BALLOON_COLORS[i % BALLOON_COLORS.length];
      b.style.cssText = 'position:relative;left:0;top:0;width:56px;height:66px;'
        + 'font-size:30px;opacity:' + (state.filled[i] ? '1' : '.35');
      if (state.filled[i]) { b.textContent = ch; }
      host.appendChild(b);
    });
  }

  function popCell(cellIndex) {
    inBoth('play', '[data-cell-index="' + cellIndex + '"]').forEach(function (cell) {
      cell.classList.add('pop');
      cell.addEventListener('animationend', function () { cell.classList.remove('pop'); },
        { once: true });
    });
  }

  // ---- 획득 연출: tpl-catch-fx 의 .pop(터짐 링)·.fly(글자) 를 획득 지점에 복제 ----
  function catchFx(lane, char) {
    const v = view();
    const lanes = inActive('play', '[data-role=lanes]');
    const tpl = document.getElementById('tpl-catch-fx');
    const s = v.itemW / VIEWS.m.itemW; // 웹은 풍선 비율만큼 확대
    const cx = root.viewLaneCenterX(v, lane);

    const pop = tpl.content.querySelector('.pop').cloneNode(true);
    pop.style.left = (cx - 39 * s) + 'px';
    pop.style.top = (v.judgeLocal - 130 * s) + 'px';
    pop.style.transform = 'scale(' + s + ')';
    pop.style.transformOrigin = 'top left';
    pop.classList.add('fx');

    const fly = tpl.content.querySelector('.fly').cloneNode(true);
    fly.textContent = char;
    fly.style.left = (cx - 32 * s) + 'px';
    fly.style.top = (v.judgeLocal - 160 * s) + 'px';
    fly.style.transform = 'scale(' + s + ')';
    fly.style.transformOrigin = 'top left';
    fly.classList.add('fx');

    lanes.appendChild(pop);
    lanes.appendChild(fly);
    setTimeout(function () { pop.remove(); fly.remove(); }, 700);
  }

  function hitFlash() {
    const board = stageRoot('play', viewKey()).firstElementChild; // .scr | .wscr
    board.classList.remove('hit');
    void board.getBoundingClientRect();
    board.classList.add('hit');
  }

  function shakePlane() {
    const plane = inActive('play', '[data-role=plane]');
    plane.classList.remove('shake');
    void plane.getBoundingClientRect();
    plane.classList.add('shake');
  }

  function setStageChip(text) {
    inBoth('play', '[data-role=stage-chip]').forEach(function (c) { c.textContent = text; });
  }

  // ---- 클리어 카드 (양 뷰) ----
  function fillClearCard(proverb) {
    const before = proverb.problem.slice(0, proverb.blankStart);
    const after = proverb.problem.slice(proverb.blankStart + proverb.answer.length);
    inBoth('clear', '[data-role=clear-sentence]').forEach(function (p) {
      p.textContent = '';
      p.append(before);
      const hl = document.createElement('span');
      hl.className = 'hl';
      hl.textContent = proverb.answer;
      p.appendChild(hl);
      p.append(after);
    });
    inBoth('clear', '[data-role=clear-meaning]').forEach(function (m) {
      m.textContent = proverb.meaning;
    });
  }

  // ---- 징검다리 돌 (양 뷰 동적 생성) ----
  // 돌 SVG 는 시안의 수작업 형상 5종을 순환 사용 (상태별 fill 만 교체 — path 구조 동일)
  const STONE_SHAPES = [
    'M8 40 C6 18 30 6 55 10 C80 14 96 26 94 46 C92 66 70 74 46 72 C22 70 10 58 8 40Z',
    'M20 22 C34 4 70 2 88 18 C100 30 96 56 80 66 C60 78 30 76 14 60 C2 48 8 36 20 22Z',
    'M10 46 C4 26 22 8 48 6 C74 4 92 16 96 36 C100 56 86 72 60 74 C34 76 16 66 10 46Z',
    'M6 34 C12 12 44 2 70 10 C92 16 100 40 88 58 C76 76 40 78 20 66 C4 56 2 46 6 34Z',
    'M14 30 C10 10 40 4 60 8 C85 12 98 30 90 52 C82 72 50 76 28 68 C10 62 16 46 14 30Z',
  ];
  const STONE_COLORS = [
    ['#BFCFA3', '#8CA36E'], ['#E0C3B0', '#B38C76'], ['#B5C7D6', '#7F96AA'],
    ['#D7B48F', '#A9825B'], ['#BFCFA3', '#8CA36E'],
  ];
  const LOCK_COLOR = ['#CFCFCF', '#9A9A9A'];
  const LOCK_BADGE = '<span class="lk"><svg viewBox="0 0 24 24" aria-hidden="true">'
    + '<rect x="5" y="10" width="14" height="11" rx="3" fill="#94A3B8"></rect>'
    + '<path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="#94A3B8" stroke-width="2.5" fill="none"'
    + ' stroke-linecap="round"></path><circle cx="12" cy="15.5" r="1.8" fill="#fff"></circle>'
    + '</svg></span>';

  // 뷰별 배치 (시안 돌 1~10 실측 좌표). plane/pill 은 도전 중 돌 기준 상대 오프셋.
  const STONE_LAYOUT = {
    m: {
      size: [78, 60],
      pos: [[60, 660], [200, 760], [110, 860], [250, 960], [70, 1060],
        [230, 1160], [130, 1260], [260, 1360], [80, 1460], [220, 1560]],
      plane: { dx: -24, dy: -80, w: 107, h: 97 },
      pill: { dx: -9, dy: 66 },
    },
    w: {
      size: [89, 69],
      pos: [[760, 130], [930, 190], [1110, 150], [1280, 230], [1180, 340],
        [1000, 380], [820, 440], [900, 560], [1080, 600], [1260, 660]],
      plane: { dx: -34, dy: -99, w: 133, h: 121 },
      pill: { dx: -11, dy: 75 },
    },
  };

  function stoneSvg(shapeIdx, colors) {
    const d = STONE_SHAPES[shapeIdx % STONE_SHAPES.length];
    return '<svg viewBox="0 0 100 80" aria-hidden="true">'
      + '<path d="' + d + '" transform="translate(0,4)" fill="rgba(0,0,0,.14)"></path>'
      + '<path d="' + d + '" fill="' + colors[0] + '" stroke="' + colors[1]
      + '" stroke-width="3" stroke-linejoin="round"></path>'
      + '<ellipse cx="34" cy="24" rx="12" ry="6" fill="#fff" opacity=".45"'
      + ' transform="rotate(-18 34 24)"></ellipse></svg>';
  }

  function buildStones(cleared, onSelect) {
    ['m', 'w'].forEach(function (key) {
      const host = stageRoot('main', key).firstElementChild; // .scr | .wscr
      const layout = STONE_LAYOUT[key];
      host.querySelectorAll('[data-gen]').forEach(function (n) { n.remove(); });

      for (let s = 1; s <= prog.STONE_COUNT; s++) {
        const status = prog.stoneStatus(cleared, s);
        const btn = document.createElement('button');
        btn.className = 'stone ' + status;
        btn.dataset.stage = String(s); // 돌 번호 (시안 속성명 보존 — game_state 의 stage=전역 문제 번호와 다름)
        btn.dataset.gen = '1';
        const p = layout.pos[s - 1];
        btn.style.cssText = 'left:' + p[0] + 'px;top:' + p[1] + 'px;width:'
          + layout.size[0] + 'px;height:' + layout.size[1] + 'px';
        const colors = status === 'lock' ? LOCK_COLOR : STONE_COLORS[(s - 1) % STONE_COLORS.length];
        btn.innerHTML = stoneSvg(s - 1, colors) + '<span class="num">' + s + '</span>'
          + (status === 'lock' ? LOCK_BADGE : '');
        if (status === 'lock') {
          btn.disabled = true;
          btn.setAttribute('aria-label', s + '단계 잠김');
        } else {
          btn.setAttribute('aria-label',
            s + '단계' + (status === 'done' ? ' 완료' : ' (도전 중)'));
          btn.addEventListener('click', function () { onSelect(s); });
        }
        host.appendChild(btn);

        if (status === 'cur') {
          const plane = document.createElement('img');
          plane.className = 'plane side';
          plane.src = 'assets/bunny_happy.png';
          plane.alt = '토끼 비행기';
          plane.dataset.gen = '1';
          plane.style.cssText = 'left:' + (p[0] + layout.plane.dx) + 'px;top:'
            + (p[1] + layout.plane.dy) + 'px;width:' + layout.plane.w + 'px;height:'
            + layout.plane.h + 'px;transform:rotate(-8deg)';
          host.appendChild(plane);

          const pill = document.createElement('div');
          pill.className = 'prog-pill';
          pill.dataset.gen = '1';
          pill.textContent = prog.stoneProgress(cleared, s) + ' / '
            + prog.PROBLEMS_PER_STONE + ' 문제';
          pill.style.cssText = 'left:' + (p[0] + layout.pill.dx) + 'px;top:'
            + (p[1] + layout.pill.dy) + 'px';
          host.appendChild(pill);
        }
      }
    });
  }

  // ---- 프레임/전체 동기화 ----
  function frame(state) {
    syncItems(state);
    syncPlane(state);
  }

  // 뷰 전환·화면 진입 시 1회 전체 재동기화 (quiz/hearts/hud + 낙하물 재생성)
  function fullSync(state) {
    clearLanes();
    syncQuiz(state);
    syncHearts(state);
    frame(state);
  }

  root.render = {
    frame: frame, fullSync: fullSync, clearLanes: clearLanes,
    syncQuiz: syncQuiz, syncHearts: syncHearts, popCell: popCell,
    catchFx: catchFx, hitFlash: hitFlash, shakePlane: shakePlane,
    setStageChip: setStageChip, fillClearCard: fillClearCard, buildStones: buildStones,
    onViewChange: function (cb) { mq.addEventListener('change', cb); },
  };
})(globalThis.Sokdam = globalThis.Sokdam || {});

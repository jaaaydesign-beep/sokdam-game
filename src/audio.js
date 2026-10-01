(function (root) {
  'use strict';
  let ctx = null;
  let muted = false;

  // 첫 사용자 제스처에서 호출 — 모바일 자동재생 정책 대응 (스펙 §6)
  function ensureCtx() {
    if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function beep(freq, dur, type, gainV, delay) {
    if (muted || !ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainV, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  const sfx = {
    catch: function () { beep(880, 0.12, 'sine', 0.25); beep(1320, 0.18, 'sine', 0.2, 0.08); },
    wrong: function () { beep(220, 0.15, 'square', 0.12); },
    bomb: function () { beep(90, 0.4, 'sawtooth', 0.3); },
    clear: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.25, 'sine', 0.25, i * 0.12); });
    },
    fail: function () { [392, 330, 262].forEach(function (f, i) { beep(f, 0.22, 'triangle', 0.2, i * 0.15); }); },
    move: function () { beep(440, 0.05, 'triangle', 0.1); },
    button: function () { beep(660, 0.08, 'sine', 0.15); },
  };

  root.audio = {
    ensureCtx: ensureCtx,
    play: function (name) { if (sfx[name]) sfx[name](); },
    toggleMute: function () { muted = !muted; return muted; },
    isMuted: function () { return muted; },
  };
})(globalThis.Sokdam = globalThis.Sokdam || {});

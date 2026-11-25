/* ==========================================================================
   RIFTLIGHT — image assets (multi-file build)
   ========================================================================== */
(function () {
  'use strict';
  const RL = window.RL;
  const A = { images: {}, player: null, ready: false };
  A.init = function () {
    if (typeof Image === 'undefined') return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = function () { A.player = img; A.ready = true; RL.Bus.emit('assets:ready'); };
    img.onerror = function () { A.player = null; A.ready = false; };
    img.src = 'assets/player.png';
  };
  RL.Assets = A;
})();

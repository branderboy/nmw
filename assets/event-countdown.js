(function () {
  var target = new Date('2026-05-20T20:00:00-04:00').getTime();
  function pad(n) { return String(n).padStart(2, '0'); }
  function render() {
    var dEl = document.querySelector('[data-nmw-cd-d]');
    var hEl = document.querySelector('[data-nmw-cd-h]');
    var mEl = document.querySelector('[data-nmw-cd-m]');
    var sEl = document.querySelector('[data-nmw-cd-s]');
    if (!dEl || !hEl || !mEl || !sEl) return;
    var diff = target - Date.now();
    if (diff <= 0) {
      dEl.textContent = '00'; hEl.textContent = '00';
      mEl.textContent = '00'; sEl.textContent = '00';
      var wrap = document.querySelector('[data-nmw-cd-wrap]');
      if (wrap) wrap.setAttribute('data-state', 'live');
      return;
    }
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    dEl.textContent = pad(d);
    hEl.textContent = pad(h);
    mEl.textContent = pad(m);
    sEl.textContent = pad(s);
  }
  function start() { render(); setInterval(render, 1000); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

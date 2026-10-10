/* SpeakSmith tanıtım sitesi — etkileşim ve hareket.
   Dil bağımsız: metinler sayfadaki data-* özniteliklerinden ve JSON bloklarından
   okunur (site/index.html, site/en/index.html). Hiçbir harici istek yapmaz,
   çerez yazmaz; yalnız tema tercihi bu tarayıcıda (localStorage) tutulur. */
(function () {
  'use strict';
  window.__ss = true;
  var root = document.documentElement;
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduce = !!(mqReduce && mqReduce.matches);
  var hasIO = 'IntersectionObserver' in window;
  var lang = root.lang || 'tr';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  root.classList.add('js');
  root.classList.add('ss'); // site.js çalıştı: sayfanın aşağısındaki JS denetimleri açılır
  if (reduce || !hasIO) root.classList.remove('motion');

  /* ---------- APK adresi ve cihaza göre indirme ---------- */
  // Sayfanın başındaki DOWNLOAD_URL sabiti: doğrudan arm64 APK (tools/build_site.sh
  // DOWNLOAD_URL verilirse değiştirir). HTML'deki data-download bağlantıları da aynı adrestir;
  // JS çalışmazsa da Android'de APK doğrudan iner.
  var dl = typeof window.DOWNLOAD_URL === 'string' ? window.DOWNLOAD_URL : null;
  if (dl && /^https:\/\//.test(dl)) {
    $$('a[data-download]').forEach(function (a) { a.href = dl; });
  }
  // Masaüstünde 105 MB'lık APK'yı bilgisayara indirmek yerine QR'lı indirme sayfasına
  // gidilir (<body data-desktop-download>). İndirme kartının kendi düğmesi
  // ([data-keep-download] içinde) bilerek bilgisayara indirmek isteyen için doğrudan kalır.
  var desk = document.body && document.body.getAttribute('data-desktop-download');
  if (desk && root.classList.contains('dev-desktop')) {
    $$('a[data-download]').forEach(function (a) { if (!a.closest('[data-keep-download]')) a.href = desk; });
  }

  /* ---------- tema ---------- */
  var themeBtn = $('[data-theme-btn]');
  function readTheme() { try { return localStorage.getItem('ss-theme') || 'system'; } catch (e) { return 'system'; } }
  function applyTheme(m) {
    if (m === 'light' || m === 'dark') root.setAttribute('data-theme', m); else root.removeAttribute('data-theme');
    if (themeBtn) {
      themeBtn.setAttribute('data-mode', m);
      var label = themeBtn.getAttribute('data-l-' + m);
      if (label) { themeBtn.setAttribute('aria-label', label); themeBtn.setAttribute('title', label); }
    }
  }
  applyTheme(readTheme());
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var order = ['system', 'light', 'dark'];
    var next = order[(order.indexOf(themeBtn.getAttribute('data-mode') || 'system') + 1) % 3];
    try { localStorage.setItem('ss-theme', next); } catch (e) {}
    applyTheme(next);
  });

  /* ---------- üst çubuk ---------- */
  var top = $('.top');
  var nightHero = $('.hero.night');
  var ticking = false;
  function headerState() {
    if (!top) return;
    top.classList.toggle('scrolled', window.scrollY > 8);
    // Koyu kahramanın üstündeyken çubuk da koyu kalır (açık temada soluk şerit olmasın).
    top.classList.toggle('over-night', !!nightHero && nightHero.getBoundingClientRect().bottom > top.offsetHeight);
  }
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; headerState(); ecoFallback(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  headerState();

  // Menü: bağlantıya dokununca kapanır.
  $$('.menu').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target.closest('a')) m.removeAttribute('open'); });
    document.addEventListener('click', function (e) { if (!m.contains(e.target)) m.removeAttribute('open'); });
  });

  /* ---------- belge sayfaları: dil çipi görünen bölümü işaretler ---------- */
  (function langSwitch() {
    var chips = $$('.lang-switch a[href^="#"]');
    if (!chips.length) return;
    var secs = chips.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    function mark(id) {
      chips.forEach(function (a) { if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }
    function fromScroll() {
      var cur = null;
      secs.forEach(function (s) { if (s && s.getBoundingClientRect().top <= window.innerHeight * 0.4) cur = s.id; });
      mark(cur || (secs[0] && secs[0].id));
    }
    window.addEventListener('hashchange', fromScroll);
    window.addEventListener('scroll', function () { requestAnimationFrame(fromScroll); }, { passive: true });
    fromScroll();
  })();

  /* ---------- görünürlükle açılan öğeler ---------- */
  function once(els, fn, opts) {
    if (!els.length) return;
    if (!hasIO) { els.forEach(fn); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); } });
    }, opts || { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }
  if (root.classList.contains('motion')) {
    once($$('.rv'), function (el) { el.classList.add('in'); });
  } else {
    $$('.rv').forEach(function (el) { el.classList.add('in'); });
  }
  once($$('.forts,.bubbles,.diff'), function (el) { el.classList.add('in'); el.classList.add('play'); }, { threshold: 0.4 });
  // Ana sayfa canlandırması: çubuklar dolar, tamamlanan görev "+40 XP" der.
  once($$('[data-today]'), function (el) { el.classList.add('play'); }, { threshold: 0.35 });
  window.addEventListener('beforeprint', function () { $$('.rv').forEach(function (el) { el.classList.add('in'); }); });
  // Klavyeyle gelen odak henüz görünmemiş (saydam) bir kartta kalmasın: hemen açılır.
  document.addEventListener('focusin', function (e) {
    var r = e.target && e.target.closest && e.target.closest('.rv:not(.in)');
    if (r) { r.classList.add('in'); r.style.animation = 'none'; }
  });

  /* ---------- sayaçlar (yalnız gerçek, doğrulanmış sayılar) ---------- */
  var fmt = function (n) { try { return n.toLocaleString(lang === 'en' ? 'en-US' : 'tr-TR'); } catch (e) { return String(n); } };
  var counters = $$('[data-count]');
  if (!reduce && hasIO) {
    var vh = window.innerHeight;
    counters.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) el.textContent = fmt(0); else el.setAttribute('data-done', '1');
    });
    once(counters.filter(function (el) { return !el.hasAttribute('data-done'); }), function (el) {
      var target = +el.getAttribute('data-count'), t0 = null, dur = 1500;
      function step(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(2, -10 * k);
        el.textContent = fmt(Math.round(target * (k === 1 ? 1 : e)));
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
  }

  /* ---------- kahraman: canlı ders + Türkçe satır basamağı ---------- */
  (function hero() {
    var data = $('#demo-data');
    var tx = $('[data-tx]');
    var ladder = $('[data-ladder]');
    if (!data || !tx || !ladder) return;
    var D; try { D = JSON.parse(data.textContent); } catch (e) { return; }
    var heroEl = $('.hero');
    var cap = $('[data-ladder-cap]');
    var tourBtn = $('[data-tour]');
    var pend = $('[data-pending]');
    var clock = $('[data-live-clock]');
    var wcard = $('[data-wcard]');
    var btns = $$('[data-level-btn]', ladder);
    var level = 0, auto = true, playing = !reduce, visible = true, shown = 3;
    var timers = [];
    var segs = D.segs;
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
    function clearAll() { timers.forEach(clearTimeout); timers = []; }

    function segHTML(s, waiting) {
      return '<div class="row"><div class="en">' + s.en + '</div><button type="button" class="trchip" tabindex="-1" aria-pressed="false">TR</button></div>' +
        '<div class="tr' + (waiting ? ' wait' : '') + '">' + (waiting ? D.wait : s.tr) + '</div>';
    }
    function build() {
      tx.innerHTML = '';
      for (var i = Math.max(0, shown - 4); i < shown; i++) {
        var d = document.createElement('div'); d.className = 'seg';
        d.innerHTML = segHTML(segs[i % segs.length], i === shown - 1 && playing);
        tx.appendChild(d);
      }
      apply();
    }
    function apply() {
      var list = $$('.seg', tx), base = shown - list.length;
      list.forEach(function (el, i) {
        var t = el.querySelector('.tr'), c = el.querySelector('.trchip');
        var last = i === list.length - 1, open = el.classList.contains('open');
        var waiting = t.classList.contains('wait');
        if (!last && waiting) { t.classList.remove('wait'); t.innerHTML = segs[(base + i) % segs.length].tr; }
        var hide = level === 2 || (level === 1 && !open);
        t.hidden = hide;
        c.hidden = level !== 1 || (last && waiting);
        c.setAttribute('aria-pressed', String(open));
      });
      ladder.setAttribute('data-level', String(level));
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-level-btn') === level)); });
      if (cap) cap.innerHTML = D.caps[level];
      var eco = $('.ladder-meta .eco');
      if (eco) eco.style.setProperty('--eco', ['10%', '52%', '92%'][level]);
    }
    tx.addEventListener('click', function (e) {
      var c = e.target.closest && e.target.closest('.trchip');
      if (c) { c.closest('.seg').classList.toggle('open'); apply(); return; }
      var term = e.target.closest && e.target.closest('.t-term');
      if (term && level === 2) showWord(term);
    });
    function showWord(term) {
      if (!wcard) return;
      var key = term.getAttribute('data-term');
      var g = D.gloss[key]; if (!g) return;
      $$('.t-term.pick', tx).forEach(function (x) { x.classList.remove('pick'); });
      term.classList.add('pick');
      wcard.querySelector('[data-w]').textContent = key;
      wcard.querySelector('[data-k]').textContent = g.kind;
      wcard.querySelector('[data-m]').textContent = g.tr;
      wcard.classList.add('on');
    }
    function hideWord() { if (wcard) wcard.classList.remove('on'); $$('.t-term.pick', tx).forEach(function (x) { x.classList.remove('pick'); }); }
    function setLevel(l) { level = l; hideWord(); $$('.seg', tx).forEach(function (s) { s.classList.remove('open'); }); apply(); }

    btns.forEach(function (b) {
      b.addEventListener('click', function () { auto = false; setTour(); setLevel(+b.getAttribute('data-level-btn')); schedule(); });
    });

    var sec = D.clock || 842;
    function mmss(s) { var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r; }
    function streamTick() {
      if (pend) { pend.textContent = D.pending; pend.style.opacity = '1'; }
      later(function () {
        if (pend) pend.style.opacity = '0';
        shown++; if (shown > segs.length * 4) shown = 4;
        var d = document.createElement('div'); d.className = 'seg enter';
        d.innerHTML = segHTML(segs[(shown - 1) % segs.length], true);
        tx.appendChild(d);
        while (tx.children.length > 4) tx.removeChild(tx.firstElementChild);
        apply();
        requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.remove('enter'); }); });
        later(function () {
          var t = d.querySelector('.tr');
          if (t && t.classList.contains('wait')) { t.classList.add('fade'); later(function () { t.classList.remove('wait'); t.innerHTML = segs[(shown - 1) % segs.length].tr; t.classList.remove('fade'); apply(); }, 260); }
        }, 1300);
      }, 1100);
    }
    function tourStep() {
      // Yanımda → Dokununca (bir cümlenin TR'sine dokunulur) → Kapalı (bir terime dokunulur) → başa.
      if (level === 1) {
        later(function () {
          var list = $$('.seg', tx); var s = list[list.length - 2]; if (!s) return;
          var c = s.querySelector('.trchip'); c.classList.add('tap'); s.classList.add('open'); apply();
          later(function () { c.classList.remove('tap'); }, 520);
          later(function () { s.classList.remove('open'); apply(); }, 3000);
        }, 2300);
      } else if (level === 2) {
        later(function () {
          var t = $$('.t-term', tx).filter(function (x) { return D.gloss[x.getAttribute('data-term')]; });
          var pick = t[Math.max(0, t.length - 3)]; if (pick) showWord(pick);
          later(hideWord, 3200);
        }, 2000);
      }
    }
    function schedule() {
      clearAll();
      if (!playing || !visible) return;
      var loop = function () {
        if (!playing || !visible) return;
        streamTick();
        later(loop, 3600);
      };
      later(loop, 1400);
      var clk = function () { if (!playing || !visible) return; sec++; if (clock) clock.textContent = mmss(sec); later(clk, 1000); };
      later(clk, 1000);
      if (auto) {
        tourStep();
        later(function () { setLevel((level + 1) % 3); schedule(); }, 8800);
      }
    }
    function setTour() {
      if (!tourBtn) return;
      tourBtn.setAttribute('aria-pressed', String(playing));
      var lbl = tourBtn.querySelector('[data-label]');
      if (lbl) lbl.textContent = playing ? tourBtn.getAttribute('data-l-pause') : tourBtn.getAttribute('data-l-play');
      $$('[data-ic]', tourBtn).forEach(function (i) { i.hidden = (i.getAttribute('data-ic') === 'pause') !== playing; });
      if (heroEl) heroEl.classList.toggle('paused', !playing);
    }
    if (tourBtn) tourBtn.addEventListener('click', function () {
      playing = !playing; if (playing) auto = true; setTour(); build(); schedule();
    });
    if (hasIO && heroEl) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting; heroEl.classList.toggle('paused', !visible || !playing); schedule();
      }, { threshold: 0.05 }).observe(heroEl);
    }
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; schedule(); });
    build(); setTour(); schedule();
  })();

  /* ---------- kahraman: imleçle hafif derinlik ---------- */
  (function parallax() {
    var hero = $('.hero'); if (!hero || reduce || !window.matchMedia('(pointer:fine)').matches) return;
    var floats = $$('.float', hero), raf = 0, x = 0, y = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      x = (e.clientX - r.left) / r.width - 0.5; y = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(function () {
        raf = 0;
        floats.forEach(function (f, i) { var k = (i + 1) * 9; f.style.setProperty('--px', (x * k).toFixed(1) + 'px'); f.style.setProperty('--py', (y * k).toFixed(1) + 'px'); });
      });
    });
  })();

  /* ---------- özellik kartları: imleç ışığı ---------- */
  if (window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
    $$('.fcard').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- geçiş şeridi: kaydırma desteği olmayan tarayıcılar ---------- */
  var ecoTrack = $('.eco-track');
  var ecoNative = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  function ecoFallback() {
    if (!ecoTrack || ecoNative || reduce) return;
    var r = ecoTrack.getBoundingClientRect(), vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) return;
    var k = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (vh * 0.6)));
    ecoTrack.style.setProperty('--run', k.toFixed(3));
    $$('.eco-steps li').forEach(function (li, i) { li.style.setProperty('--k', String(Math.max(0.25, Math.min(1, k * 1.2 - i * 0.05) * (i + 1) / 4))); });
  }
  if (ecoTrack && !ecoNative && !reduce) ecoFallback();

  /* ---------- Ders Masası: yapışkan cihaz ---------- */
  (function story() {
    var steps = $$('[data-step]'), layers = $$('[data-layer]'), dots = $$('.story-dots i');
    if (!steps.length || !layers.length || !hasIO) return;
    function set(i) {
      layers.forEach(function (l) { l.classList.toggle('on', +l.getAttribute('data-layer') === i); });
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) set(+e.target.getAttribute('data-step')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  })();

  /* ---------- sesli matematik ---------- */
  $$('[data-formula]').forEach(function (box) {
    var say = $('[data-say]', box), eq = $('[data-eq]', box);
    $$('[data-f-say]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-f-say]', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        say.textContent = b.getAttribute('data-f-say');
        eq.style.opacity = '0';
        setTimeout(function () { eq.textContent = b.getAttribute('data-f-eq'); eq.style.opacity = '1'; }, reduce ? 0 : 180);
      });
    });
  });

  /* ---------- kelime ekle düğmeleri ---------- */
  $$('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () { b.textContent = b.getAttribute('data-add'); b.disabled = true; });
  });

  /* ---------- flash kart ---------- */
  $$('.flip').forEach(function (f) {
    f.addEventListener('click', function () { f.setAttribute('aria-pressed', String(f.getAttribute('aria-pressed') !== 'true')); });
  });

  /* ---------- karaoke: kelime kelime dolum ---------- */
  (function karaoke() {
    var box = $('[data-kar]'); if (!box) return;
    var lines = $$('.ly', box), play = $('[data-k-play]', box), trEl = $('[data-k-tr]', box), trSw = $('[data-k-trsw]', box);
    var prog = $('.k-prog', box), pop = $('[data-k-pop]', box);
    var li = 0, wi = 0, timer = 0, on = false;
    var total = 0; lines.forEach(function (l) { total += $$('.w', l).length; });
    function count() { var n = 0; for (var i = 0; i < li; i++) n += $$('.w', lines[i]).length; return n + wi; }
    function showTr() { if (trEl) { trEl.textContent = trSw && trSw.checked ? (lines[li].getAttribute('data-tr') || '') : ''; } }
    function setCur() { lines.forEach(function (l, i) { l.classList.toggle('cur', i === li); }); showTr(); }
    function reset() { lines.forEach(function (l) { l.classList.remove('done', 'cur'); $$('.w', l).forEach(function (w) { w.classList.remove('lit'); }); }); li = 0; wi = 0; setCur(); if (prog) prog.style.setProperty('--p', '0'); }
    function step() {
      if (!on) return;
      var ws = $$('.w', lines[li]);
      if (wi < ws.length) {
        var w = ws[wi], d = +(w.getAttribute('data-d') || 420);
        w.style.setProperty('--wd', d + 'ms'); w.classList.add('lit'); wi++;
        if (prog) prog.style.setProperty('--p', (count() / total).toFixed(3));
        timer = setTimeout(step, d);
      } else {
        lines[li].classList.add('done');
        if (li < lines.length - 1) { li++; wi = 0; setCur(); timer = setTimeout(step, 520); }
        else { timer = setTimeout(function () { reset(); step(); }, 1600); }
      }
    }
    function setPlay(v) {
      on = v; play.setAttribute('aria-pressed', String(v));
      play.setAttribute('aria-label', v ? play.getAttribute('data-l-pause') : play.getAttribute('data-l-play'));
      clearTimeout(timer); if (v) step();
    }
    if (play) play.addEventListener('click', function () { setPlay(!on); });
    if (trSw) trSw.addEventListener('change', showTr);
    setCur();
    if (hasIO) new IntersectionObserver(function (es) { if (!es[0].isIntersecting && on) setPlay(false); }).observe(box);
    // Kelimeye dokun: bağlamlı anlam + listeye ekle.
    var popFrom = null;
    function closePop(back) {
      if (!pop || !pop.classList.contains('on')) return;
      pop.classList.remove('on');
      if (back && popFrom) popFrom.focus();
      popFrom = null;
    }
    box.addEventListener('click', function (e) {
      var w = e.target.closest && e.target.closest('.w');
      if (!w || !pop) { if (pop && !e.target.closest('[data-k-pop]')) closePop(); return; }
      var m = w.getAttribute('data-m'); if (!m) { closePop(); return; }
      var parts = m.split('|');
      pop.querySelector('b').textContent = w.textContent.replace(/[^\p{L}'’-]/gu, '');
      pop.querySelector('p').textContent = parts[0];
      var add = pop.querySelector('button'); add.disabled = false; add.textContent = add.getAttribute('data-l-add');
      var br = box.getBoundingClientRect(), wr = w.getBoundingClientRect();
      var left = Math.min(Math.max(12, wr.left - br.left - 20), br.width - pop.offsetWidth - 12);
      pop.style.left = left + 'px'; pop.style.top = (wr.bottom - br.top + 10) + 'px';
      pop.classList.add('on');
      popFrom = w;
      e.stopPropagation();
    });
    $$('.w[data-m]', box).forEach(function (w) {
      w.setAttribute('tabindex', '0'); w.setAttribute('role', 'button');
      w.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); w.click();
          // Klavyeyle açılan kartta odak "Listeme ekle"ye geçer; Esc kelimeye döndürür.
          var b = pop && pop.querySelector('button'); if (b) setTimeout(function () { b.focus(); }, 30);
        }
      });
    });
    if (pop) {
      var add = pop.querySelector('button');
      add.addEventListener('click', function (e) { e.stopPropagation(); add.textContent = add.getAttribute('data-l-added'); add.disabled = true; });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(true); });
      document.addEventListener('click', function (e) { if (!box.contains(e.target)) closePop(); });
    }
  })();

  /* ---------- kısa sıralı canlandırmalar (satır çalışması, mikrofon) ----------
     Görünür olunca bir kez oynar ve son durumda kalır: her tur 5 saniyenin altında,
     sonsuz döngü yok (WCAG 2.2.2). Görünümden çıkıp dönünce yeniden oynar. */
  function playOnce(el, n, step, show) {
    var t = [];
    function stop() { t.forEach(clearTimeout); t = []; }
    new IntersectionObserver(function (es) {
      stop();
      if (!es[0].isIntersecting) return;
      show(0);
      for (var k = 1; k < n; k++) (function (k) { t.push(setTimeout(function () { show(k); }, k * step)); })(k);
    }, { threshold: 0.6 }).observe(el);
  }
  $$('[data-practice]').forEach(function (p) {
    var s = $$('span', p);
    if (reduce || !hasIO || !s.length) return;
    playOnce(p, s.length, 1300, function (i) { s.forEach(function (x, k) { x.classList.toggle('on', k === i); }); });
  });

  /* ---------- boşluk doldurma ---------- */
  $$('[data-cloze]').forEach(function (c) {
    var gap = $('.gap', c), msg = $('.msg', c), hearts = $$('.hearts i', c), opts = $$('.opt', c), again = $('[data-again]', c);
    var lives = hearts.length, done = false;
    var hb = $('.hearts', c), hl = hb && hb.getAttribute('data-l-hearts');
    function heartsLabel() { if (hb && hl) hb.setAttribute('aria-label', hl.replace('{n}', lives)); }
    function reset() {
      lives = hearts.length; done = false; gap.textContent = ' '; gap.classList.remove('ok'); msg.textContent = c.getAttribute('data-msg-start') || '';
      hearts.forEach(function (h) { h.classList.remove('lost'); }); opts.forEach(function (o) { o.classList.remove('bad', 'good'); o.disabled = false; });
      if (again) again.hidden = true;
      heartsLabel();
    }
    opts.forEach(function (o) {
      o.addEventListener('click', function () {
        if (done) return;
        if (o.hasAttribute('data-ok')) {
          done = true; o.classList.add('good'); gap.textContent = o.textContent; gap.classList.add('ok');
          msg.textContent = c.getAttribute('data-msg-ok'); opts.forEach(function (x) { x.disabled = true; });
          if (again) again.hidden = false;
        } else {
          o.classList.remove('bad'); void o.offsetWidth; o.classList.add('bad'); o.disabled = true;
          lives--; if (hearts[lives]) hearts[lives].classList.add('lost'); heartsLabel();
          if (lives <= 0) { done = true; msg.textContent = c.getAttribute('data-msg-out'); opts.forEach(function (x) { x.disabled = true; }); if (again) again.hidden = false; }
          else msg.textContent = c.getAttribute('data-msg-bad');
        }
      });
    });
    if (again) again.addEventListener('click', reset);
    reset();
  });

  /* ---------- mikrofon gösterimi: dinliyor → kilitlendi → duraklatıldı ---------- */
  $$('[data-mic]').forEach(function (m) {
    var states = [], label = $('span', m);
    try { states = JSON.parse(m.getAttribute('data-mic') || '[]'); } catch (e) {}
    if (!states.length || reduce || !hasIO) return;
    playOnce(m, states.length, 1600, function (i) { m.setAttribute('data-state', states[i][0]); label.textContent = states[i][1]; });
  });

  /* ---------- özellik kataloğu: ara ve süz ---------- */
  (function catalog() {
    var cat = $('[data-cat]'); if (!cat) return;
    var q = $('[data-cat-q]'), chips = $$('[data-cat-f]'), cnt = $('[data-cat-count]'), more = $('[data-cat-more]');
    var items = $$('li', cat), total = items.length, filt = 'all';
    var norm = function (s) { return s.toLocaleLowerCase(lang === 'en' ? 'en' : 'tr'); };
    items.forEach(function (li) { li._t = norm(li.textContent + ' ' + li.closest('section').querySelector('h3').textContent); });
    function expand() { cat.classList.remove('collapsed'); }
    function draw() {
      var term = norm((q && q.value || '').trim()), n = 0;
      items.forEach(function (li) {
        var tags = (li.getAttribute('data-tags') || '').split(' ');
        var ok = (filt === 'all') || (filt === 'noai' ? tags.indexOf('ai') < 0 : tags.indexOf(filt) >= 0);
        if (ok && term) ok = li._t.indexOf(term) >= 0;
        li.hidden = !ok; if (ok) n++;
      });
      $$('section', cat).forEach(function (sec) {
        var vis = $$('li', sec).filter(function (li) { return !li.hidden; }).length;
        sec.hidden = vis === 0; var sm = sec.querySelector('h3 small'); if (sm) sm.textContent = String(vis);
      });
      if (cnt) cnt.textContent = (n === total ? cnt.getAttribute('data-l-count') : cnt.getAttribute('data-l-of')).replace('{n}', n).replace('{t}', total);
      if (term || filt !== 'all') expand();
    }
    chips.forEach(function (b) {
      b.addEventListener('click', function () {
        filt = b.getAttribute('data-cat-f');
        chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        draw();
      });
    });
    if (q) q.addEventListener('input', draw);
    if (more) more.addEventListener('click', function () { expand(); more.hidden = true; });
  })();

  /* ---------- mobil yapışkan çağrı çubuğu ---------- */
  (function mbar() {
    var bar = $('.mbar'), heroCta = $('#hero-cta'), ends = $$('[data-hide-mbar]');
    if (!bar || !heroCta || !hasIO) return;
    var heroOn = true, endOn = 0;
    function upd() { root.classList.toggle('show-mbar', !heroOn && endOn === 0); }
    new IntersectionObserver(function (es) { heroOn = es[0].isIntersecting || es[0].boundingClientRect.top > 0; upd(); }).observe(heroCta);
    var seen = new Set();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      endOn = seen.size; upd();
    });
    ends.forEach(function (e) { io.observe(e); });
  })();
})();

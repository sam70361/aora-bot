/* ============================================================
 * hero-particles.js —— 首屏呼吸粒子(星空 + 半调点阵)
 * 改编自 Chemicly-SaaS HeroBackground,vanilla canvas,无依赖
 * 自动挂到 #heroParticles;主题 / 视口外 / 弱动画偏好会停帧
 * ============================================================ */
(function () {
  'use strict';

  var TEX_W = 1000;
  var TEX_H = Math.round((1000 * 642) / 1556);
  var PITCH = Math.round((TEX_W * 16) / 1556);

  function noise(x, y) {
    var n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function buildDots() {
    var cols = Math.ceil(TEX_W / PITCH);
    var rows = Math.ceil(TEX_H / PITCH);
    var clusters = [
      { cx: 0.28 * TEX_W, cy: 0.36 * TEX_H, rx: 0.26 * TEX_W, ry: 0.32 * TEX_H, gain: 1 },
      { cx: 0.74 * TEX_W, cy: 0.44 * TEX_H, rx: 0.2 * TEX_W, ry: 0.28 * TEX_H, gain: 0.88 }
    ];
    var dots = [];
    var r, c, i, x, y, intensity, dx, dy, edge, cl;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        x = c * PITCH + PITCH / 2;
        y = r * PITCH + PITCH / 2;
        intensity = 0;
        for (i = 0; i < clusters.length; i++) {
          cl = clusters[i];
          dx = (x - cl.cx) / cl.rx;
          dy = (y - cl.cy) / cl.ry;
          intensity = Math.max(intensity, Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy)) * cl.gain);
        }
        if (intensity <= 0.02) continue;
        edge = intensity + (noise(c, r) - 0.5) * 0.35;
        if (edge < 0.12) continue;
        dots.push({
          x: x,
          y: y,
          t: Math.min(1, edge),
          phase: noise(c * 3.1, r * 2.7) * Math.PI * 2,
          rate: 0.7 + noise(c * 1.3, r * 5.9) * 0.6
        });
      }
    }
    return dots;
  }

  function buildStarfield(w, h, seed) {
    var cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    var ctx = cv.getContext('2d');
    var s = seed;
    var rnd = function () {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    var count = Math.round(w * h * 0.00034);
    var i, x, y, r0, size, alpha;
    for (i = 0; i < count; i++) {
      x = rnd() * w;
      y = rnd() * h;
      r0 = rnd();
      size = r0 > 0.97 ? 1.5 + rnd() * 0.7 : r0 > 0.8 ? 0.8 + rnd() * 0.45 : 0.45 + rnd() * 0.35;
      alpha = r0 > 0.97 ? 0.7 + rnd() * 0.28 : 0.16 + rnd() * 0.46;
      ctx.fillStyle = rnd() > 0.85
        ? 'rgba(255,246,232,' + alpha + ')'
        : 'rgba(226,232,255,' + alpha + ')';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    return cv;
  }

  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  function prefersReduce() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function mount(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dots = buildDots();
    var stars = null;
    var cssW = 0;
    var cssH = 0;
    var raf = 0;
    var start = performance.now();
    var running = false;
    var inView = true;
    var dark = isDark();
    var reduce = prefersReduce();
    var breatheAmp = 0.62;
    var breathePeriod = 6;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, Math.round(rect.width));
      cssH = Math.max(1, Math.round(rect.height));
      var dpr = Math.min(1.75, window.devicePixelRatio || 1);
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = dark ? buildStarfield(cssW, cssH, 987654321) : null;
      if (cssW > 1) draw(performance.now());
    }

    function paintDots(time) {
      var omega = (Math.PI * 2) / breathePeriod;
      var i, d, s, breath, t, R, G, B, a;
      for (i = 0; i < dots.length; i++) {
        d = dots[i];
        s = Math.sin(time * omega * d.rate + d.phase) * 0.5 + 0.5;
        breath = reduce ? 0.72 : (1 - breatheAmp + breatheAmp * s);
        t = d.t;
        if (dark) {
          R = Math.round((14 + t * 46) * 0.28 + (40 + 150 * t) * 0.72 * breath);
          G = Math.round((14 + t * 46) * 0.28 + (20 + 55 * t) * 0.72 * breath);
          B = Math.round((16 + t * 46) * 0.28 + (55 + 205 * t) * 0.72 * breath);
          a = (0.42 + t * 0.55) * breath;
        } else {
          R = Math.round(110 + 35 * t);
          G = Math.round(33 + 40 * t);
          B = Math.round(196 + 20 * t);
          a = (0.07 + t * 0.16) * breath;
        }
        ctx.fillStyle = 'rgba(' + R + ',' + G + ',' + B + ',' + a + ')';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.5 + t * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function draw(now) {
      var time = (now - start) / 1000;
      ctx.clearRect(0, 0, cssW, cssH);
      if (stars) ctx.drawImage(stars, 0, 0, cssW, cssH);
      ctx.save();
      ctx.globalCompositeOperation = dark ? 'screen' : 'source-over';
      var tw = cssW * 0.9;
      var th = tw * (TEX_H / TEX_W);
      ctx.translate((cssW - tw) / 2, cssH * 0.4 - th / 2);
      ctx.scale(tw / TEX_W, th / TEX_H);
      paintDots(time);
      ctx.restore();
    }

    function frame(now) {
      raf = 0;
      if (!running) return;
      draw(now);
      if (running) raf = requestAnimationFrame(frame);
    }

    function play() {
      if (reduce) {
        draw(performance.now());
        return;
      }
      if (running || !inView || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    function pause() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function syncTheme() {
      dark = isDark();
      resize();
      if (running) return;
      draw(performance.now());
    }

    function onVis() {
      if (document.hidden) pause();
      else play();
    }

    resize();
    play();

    var ro = new ResizeObserver(resize);
    ro.observe(canvas);

    var io = new IntersectionObserver(function (entries) {
      inView = entries[0] && entries[0].isIntersecting;
      if (inView) play();
      else pause();
    }, { threshold: 0.08 });
    var hero = canvas.closest ? canvas.closest('.hero') : canvas.parentNode;
    io.observe(hero || canvas);

    var mo = new MutationObserver(syncTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    document.addEventListener('visibilitychange', onVis);
    if (window.matchMedia) {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (e) {
        reduce = e.matches;
        if (reduce) {
          pause();
          draw(performance.now());
        } else play();
      });
    }
  }

  function boot() {
    var el = document.getElementById('heroParticles');
    if (el) mount(el);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

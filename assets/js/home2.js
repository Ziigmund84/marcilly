/* =========================================================
   Accueil v2 — « Le coup de départ »
   La balle posée sur son tee est frappée au défilement : elle s'envole avec un traceur rouge
   (comme à la télévision), la caméra monte, le ciel laisse place à la vue aérienne, la balle atterrit.
   ========================================================= */
(function () {
  'use strict';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------------- coup de départ ---------------- */
  function teeShot() {
    var hero = $('#tee'); if (!hero || !window.gsap || REDUCED) return;
    var ball = $('.tee__ball', hero), dimples = $('#ball-dimples', hero), tracer = $('.tee__tracer', hero);
    var paths = $$('path', tracer), ripple = $('.tee__ripple', hero);

    // trajectoire en pourcentage de l'écran : départ sur le tee, sommet hors champ, atterrissage
    var A = { x: 50, y: 0 }, C = { x: 44, y: -30 }, B = { x: 58, y: 60 };
    var size = 0, len = 1;
    function measure() {
      var h = hero.clientHeight, w = hero.clientWidth;
      size = ball.offsetWidth;
      // le bas de la balle repose sur le tee (13vh + hauteur du tee)
      var peg = $('.tee__peg', hero);
      var pegTop = h - (h * .13) - peg.offsetHeight;
      A.y = (pegTop - size / 2 + 4) / h * 100;
      // le traceur est tracé en pixels réels pour que l'animation du trait soit exacte
      tracer.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      var d = 'M' + (A.x * w / 100) + ' ' + (A.y * h / 100) + ' Q' + (C.x * w / 100) + ' ' + (C.y * h / 100) + ' ' + (B.x * w / 100) + ' ' + (B.y * h / 100);
      paths.forEach(function (p) { p.setAttribute('d', d); });
      len = paths[0].getTotalLength();
      ripple.style.left = B.x + '%'; ripple.style.top = B.y + '%';
      place(st.t);
    }
    function bez(t, a, c, b) { var u = 1 - t; return u * u * a + 2 * u * t * c + t * t * b; }
    var st = { t: 0, drop: 0, squash: 1 };
    function place(t) {
      var w = hero.clientWidth, h = hero.clientHeight;
      var x = bez(t, A.x, C.x, B.x) / 100 * w, y = bez(t, A.y, C.y, B.y) / 100 * h;
      var sc = 1 - .93 * Math.pow(Math.min(1, t * 1.05), .55); // la balle s'éloigne
      gsap.set(ball, { x: x - size / 2, y: y - size / 2 + st.drop, scale: sc, scaleY: sc * st.squash, transformOrigin: '50% 50%' });
      if (dimples) gsap.set(dimples, { x: -t * 260 });
      paths.forEach(function (p) { p.style.strokeDasharray = len + ' ' + (len + 10); p.style.strokeDashoffset = String(len * (1 - Math.min(1, t))); });
    }

    // apparition : la balle tombe sur son tee
    st.drop = -window.innerHeight * .9;
    measure();
    var intro = gsap.timeline({ delay: .3 });
    intro.to(st, { drop: 0, duration: 1.1, ease: 'bounce.out', onUpdate: function () { place(st.t); } })
      .from('.tee__shadow', { scale: .2, opacity: 0, duration: 1.1, ease: 'bounce.out' }, 0)
      .from('.tee__big', { opacity: 0, scale: .9, duration: 1.6, ease: 'expo.out' }, .2)
      .from('.tee__title > *', { y: 30, opacity: 0, duration: 1, stagger: .12, ease: 'expo.out' }, .4);

    var tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: '+=230%', pin: true, scrub: .7, anticipatePin: 1 } });
    tl
      // élan : la balle s'écrase un peu, le texte s'efface
      .to('.tee__title, .tee__cue', { opacity: 0, y: -40, duration: .08 }, 0)
      .to(st, { squash: .78, duration: .05, onUpdate: function () { place(st.t); } }, 0)
      .to(st, { squash: 1, duration: .04, onUpdate: function () { place(st.t); } }, .05)
      // vol
      .to(st, { t: 1, duration: .6, ease: 'power1.inOut', onUpdate: function () { place(st.t); } }, .06)
      .to('.tee__shadow', { scale: 0, opacity: 0, duration: .1 }, .06)
      .to('.tee__peg', { y: '14vh', opacity: 0, duration: .2, ease: 'power2.in' }, .1)
      .to('.tee__ground', { yPercent: 100, duration: .3, ease: 'power2.in' }, .12)
      .to('.tee__big', { scale: 1.6, opacity: 0, duration: .3, ease: 'power2.in' }, .08)
      // la caméra monte : le ciel s'efface, la vue aérienne apparaît
      .to('.tee__photo', { opacity: 1, duration: .3 }, .25)
      .fromTo('.tee__photo img', { scale: 1.7 }, { scale: 1.06, duration: .55, ease: 'power2.out' }, .25)
      .to('.tee__sky, .tee__sun, .tee__cloud', { opacity: 0, duration: .25 }, .3)
      // atterrissage
      .fromTo(ripple, { scale: .2, opacity: 0 }, { scale: 3.2, opacity: .9, duration: .06 }, .66)
      .to(ripple, { opacity: 0, duration: .08 }, .72)
      .to(tracer, { opacity: .35, duration: .1 }, .74)
      .to('.tee__shade', { opacity: 1, duration: .2 }, .72)
      .fromTo('.tee__content', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .2, ease: 'power2.out' }, .78)
      .to({}, { duration: .1 });

    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (Math.abs(window.innerWidth - lastW) < 2) return; // barre d'adresse mobile : on ignore
      lastW = window.innerWidth; measure();
    });
  }

  /* ---------------- panneau à palettes ---------------- */
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function flap(el, text) {
    text = String(text || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    el.setAttribute('aria-label', text);
    // un mot ne se coupe jamais : chaque mot est un bloc insécable de palettes
    el.innerHTML = text.split(' ').filter(Boolean).map(function (w) {
      return '<span class="w" aria-hidden="true">' + w.split('').map(function (c) { return '<b>' + c.replace(/[<>&]/g, '') + '</b>'; }).join('') + '</span>';
    }).join('');
    if (REDUCED) return;
    $$('b', el).forEach(function (s, i) {
      var target = s.textContent; if (!/[A-Z0-9]/.test(target)) return; var n = 0, max = 6 + i * 2 + Math.floor(Math.random() * 4);
      var iv = setInterval(function () {
        s.textContent = n >= max ? target : CHARS[Math.floor(Math.random() * CHARS.length)];
        if (++n > max) clearInterval(iv);
      }, 40);
    });
  }

  function today() {
    var board = $('#today'); if (!board) return;
    var S = (window.MARCILLY && window.MARCILLY.settings) || window.MARCILLY.defaults;
    var now = new Date();
    var dateTxt = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    // horaires du jour : « 8h30 – 19h00 »
    var d = now.getDay(), hours = d === 0 ? S.hours.sunday : d === 6 ? S.hours.saturday : S.hours.weekdays;
    var m = String(hours || '').match(/(\d{1,2})h(\d{2})?\D+(\d{1,2})h(\d{2})?/), open = null, until = '';
    if (m) {
      var mins = now.getHours() * 60 + now.getMinutes(), o = +m[1] * 60 + (+m[2] || 0), c = +m[3] * 60 + (+m[4] || 0);
      open = mins >= o && mins < c; until = m[3] + 'H' + (m[4] || '00');
    }
    var jobs = [];
    jobs.push(function () { flap($('[data-flap="date"]'), dateTxt); });
    jobs.push(function () {
      var lab = $('[data-flap-label="open"]');
      if (open === null) { flap($('[data-flap="open"]'), 'Accueil'); return; }
      if (lab) lab.classList.toggle('is-off', !open);
      flap($('[data-flap="open"]'), open ? 'Ouvert' : 'Ferme');
      $('[data-flap-sub="open"]').textContent = open ? 'Jusqu\'à ' + until.toLowerCase().replace('h', 'h') + ' aujourd\'hui' : 'Horaires du jour : ' + hours;
    });
    // météo
    var W = window.MARCILLY.WEATHER;
    var weather = fetch('https://api.open-meteo.com/v1/forecast?latitude=' + W.lat + '&longitude=' + W.lng + '&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FParis')
      .then(function (r) { return r.json(); }).then(function (j) { return j.current; }).catch(function () { return null; });
    // prochaine compétition
    var sb = null; try { sb = window.supabase.createClient(window.MARCILLY.SUPABASE_URL, window.MARCILLY.SUPABASE_KEY, { auth: { persistSession: false, storageKey: 'marcilly-home2' } }); } catch (e) {}
    var iso = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var nextEv = sb ? sb.from('marcilly_events').select('title,date').gte('date', iso).order('date').limit(1).then(function (r) { return (r.data || [])[0]; }) : Promise.resolve(null);

    var started = false;
    function run() {
      if (started) return; started = true;
      jobs.forEach(function (f) { f(); });
      weather.then(function (c) {
        if (!c) { flap($('[data-flap="meteo"]'), '—'); return; }
        var code = c.weather_code, sky = code === 0 ? 'Soleil' : code < 3 ? 'Eclaircies' : code < 50 ? 'Nuageux' : code < 70 ? 'Pluie' : code < 80 ? 'Neige' : 'Averses';
        flap($('[data-flap="meteo"]'), Math.round(c.temperature_2m) + '° ' + sky);
        $('[data-flap-sub="meteo"]').textContent = 'Vent ' + Math.round(c.wind_speed_10m) + ' km/h sur le parcours';
      });
      nextEv.then(function (e) {
        if (!e) { flap($('[data-flap="next"]'), 'A venir'); return; }
        var p = e.date.split('-'), dd = new Date(+p[0], +p[1] - 1, +p[2]);
        flap($('[data-flap="next"]'), dd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', ''));
        $('[data-flap-sub="next"]').textContent = e.title;
      });
    }
    if (window.ScrollTrigger && !REDUCED) ScrollTrigger.create({ trigger: board, start: 'top 80%', once: true, onEnter: run });
    else run();
  }

  /* ---------------- cartes empilées ---------------- */
  window.MarcillyDeck = function () {
    var cards = $$('.deck-card'); if (!cards.length || !window.gsap || REDUCED) return;
    cards.forEach(function (card, i) {
      var next = cards[i + 1]; if (!next) return;
      gsap.to(card, { scale: .92, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top ' + (card.getBoundingClientRect().top >= 0 ? '20%' : '20%'), scrub: true } });
      gsap.to($('.deck-card__dim', card), { opacity: .45, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true } });
    });
    $$('.deck-card__img img').forEach(function (img) {
      gsap.fromTo(img, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.closest('.deck-card'), start: 'top bottom', end: 'top 30%', scrub: true } });
    });
  };

  function start() {
    teeShot();
    // le panneau attend les réglages chargés par le site (horaires modifiables dans l'admin)
    var done = false;
    function go() { if (!done) { done = true; today(); } }
    window.addEventListener('marcilly:settings', go);
    setTimeout(go, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/* =========================================================
   Accueil v2 — version sobre
   Un seul effet par section : photo qui glisse, phrase qui se révèle mot à mot,
   aperçu de parcours qui suit la souris, grande photo qui s'élargit.
   ========================================================= */
(function () {
  'use strict';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOTION = !!window.gsap && !!window.ScrollTrigger && !REDUCED;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ouverture : la photo glisse et s'assombrit au défilement */
  function opening() {
    var hero = $('#plain'); if (!hero || !MOTION) return;
    gsap.to('.plain__img', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.plain__dark', { opacity: .6, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.from('.plain__content .wrap > *', { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .08, delay: .2 });
  }

  /* phrase d'accueil : les mots s'allument au fil du défilement */
  function statement() {
    var el = $('.statement__text'); if (!el) return;
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map(function (w) { return '<span class="wd" aria-hidden="true">' + w.replace(/[<>&]/g, '') + '</span>'; }).join(' ');
    if (!MOTION) return;
    gsap.to($$('.wd', el), { opacity: 1, ease: 'none', stagger: .1, scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  }

  /* parcours : l'aperçu photo suit la souris sur ordinateur */
  window.MarcillyCourseList = function () {
    var list = $('.clist'), prev = $('.cpreview'); if (!list || !prev || !window.gsap) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
    var img = $('img', prev);
    window.addEventListener('scroll', function () { gsap.to(prev, { opacity: 0, scale: .85, duration: .2, overwrite: 'auto' }); }, { passive: true });
    var xTo = gsap.quickTo(prev, 'x', { duration: .5, ease: 'power3' }), yTo = gsap.quickTo(prev, 'y', { duration: .5, ease: 'power3' });
    gsap.set(prev, { xPercent: -50, yPercent: -50, scale: .85 });
    list.addEventListener('mousemove', function (e) { xTo(e.clientX + 180); yTo(e.clientY); });
    $$('.crow', list).forEach(function (row) {
      row.addEventListener('mouseenter', function (e) { if (row.dataset.img) img.src = row.dataset.img; if (+gsap.getProperty(prev, 'opacity') < .05) gsap.set(prev, { x: e.clientX + 180, y: e.clientY }); gsap.to(prev, { opacity: 1, scale: 1, duration: .35, ease: 'power3.out' }); });
      row.addEventListener('mouseleave', function () { gsap.to(prev, { opacity: 0, scale: .85, duration: .3 }); });
    });
  };

  /* grande photo : elle s'élargit jusqu'aux bords de l'écran */
  function band() {
    var f = $('.band__frame'); if (!f || !MOTION) return;
    gsap.fromTo(f, { width: function () { var g = Math.min(48, Math.max(16, window.innerWidth * .04)); return Math.min(window.innerWidth - 2 * g, 1240); }, borderRadius: 28 },
      { width: function () { return window.innerWidth; }, borderRadius: 0, ease: 'none', scrollTrigger: { trigger: f, start: 'top 85%', end: 'top 15%', scrub: true, invalidateOnRefresh: true } });
    gsap.fromTo($('img', f), { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ligne d'infos pratiques sous le titre */
  function info() {
    var S = (window.MARCILLY && window.MARCILLY.settings) || window.MARCILLY.defaults;
    var now = new Date(), d = now.getDay();
    var hours = d === 0 ? S.hours.sunday : d === 6 ? S.hours.saturday : S.hours.weekdays;
    var m = String(hours || '').match(/(\d{1,2})h(\d{2})?\D+(\d{1,2})h(\d{2})?/), el = $('[data-info="open"]');
    if (el && m) {
      var mins = now.getHours() * 60 + now.getMinutes(), o = +m[1] * 60 + (+m[2] || 0), c = +m[3] * 60 + (+m[4] || 0);
      el.innerHTML = mins >= o && mins < c ? '<strong>Ouvert aujourd\'hui</strong>jusqu\'à ' + m[3] + 'h' + (m[4] || '00')
        : '<strong>Fermé pour le moment</strong>Aujourd\'hui : ' + hours;
    }
    var W = window.MARCILLY.WEATHER, wEl = $('[data-info="meteo"]');
    if (wEl) fetch('https://api.open-meteo.com/v1/forecast?latitude=' + W.lat + '&longitude=' + W.lng + '&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FParis')
      .then(function (r) { return r.json(); }).then(function (j) {
        var cur = j.current; if (!cur) return;
        var code = cur.weather_code, sky = code === 0 ? 'Grand soleil' : code < 3 ? 'Éclaircies' : code < 50 ? 'Nuageux' : code < 70 ? 'Pluie' : code < 80 ? 'Neige' : 'Averses';
        wEl.innerHTML = '<strong>' + Math.round(cur.temperature_2m) + '°, ' + sky.toLowerCase() + '</strong>Vent ' + Math.round(cur.wind_speed_10m) + ' km/h sur le parcours';
      }).catch(function () {});
  }
  window.MarcillyNextInfo = function (ev) {
    var el = $('[data-info="next"]'); if (!el || !ev) return;
    var p = ev.date.split('-'), dd = new Date(+p[0], +p[1] - 1, +p[2]);
    el.innerHTML = '<strong>' + ev.title.replace(/[<>&]/g, '') + '</strong>Prochaine compétition, ' + dd.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  function start() {
    opening(); statement(); band();
    var done = false;
    function go() { if (!done) { done = true; info(); } }
    window.addEventListener('marcilly:settings', go);
    setTimeout(go, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

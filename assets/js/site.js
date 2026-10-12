/* =========================================================
   Golf de Marcilly — moteur du site public
   - mise en page commune (en-tête, menu, pied de page)
   - contenus dynamiques depuis Supabase (tables marcilly_*)
   - animations au défilement (GSAP + ScrollTrigger + Lenis)
   ========================================================= */
(function () {
  'use strict';
  var CFG = window.MARCILLY;
  var PAGE = document.body.dataset.page || '';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_GSAP = !!(window.gsap && window.ScrollTrigger) && !REDUCED;
  if (!HAS_GSAP) document.documentElement.classList.add('no-motion');

  var sb = null;
  try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, { auth: { persistSession: false } }); } catch (e) { console.warn('Supabase indisponible', e); }

  var S = JSON.parse(JSON.stringify(CFG.defaults)); // réglages courants

  /* ---------------- utilitaires ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { u = String(u || '').trim(); return /^(https?:|mailto:|tel:|#|[\w\-./?=&%]+$)/i.test(u) && !/^javascript:/i.test(u) ? u : '#'; }
  function md(src) {
    if (!src) return '';
    var blocks = String(src).replace(/\r/g, '').split(/\n{2,}/);
    return blocks.map(function (b) {
      var lines = b.split('\n');
      if (lines.every(function (l) { return /^\s*[-•]\s+/.test(l); })) {
        return '<ul>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*[-•]\s+/, '')) + '</li>'; }).join('') + '</ul>';
      }
      return '<p>' + lines.map(inline).join('<br>') + '</p>';
    }).join('');
    function inline(t) {
      return esc(t)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, a, h) { return '<a href="' + esc(safeUrl(h)) + '">' + a + '</a>'; });
    }
  }
  function get(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function telHref(p) { return 'tel:' + String(p || '').replace(/[^\d+]/g, '').replace(/^0/, '+33'); }
  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function parseDate(d) { var p = String(d).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fmtDate(d, opts) { return parseDate(d).toLocaleDateString('fr-FR', opts || { day: 'numeric', month: 'long', year: 'numeric' }); }
  function isExternal(u) { return /^https?:/i.test(u) && u.indexOf(location.host) === -1; }
  function extAttrs(u) { return isExternal(u) ? ' target="_blank" rel="noopener"' : ''; }

  var ICON = {
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V3"/><path d="M6 4l11 4-11 4"/><ellipse cx="9" cy="21" rx="5" ry="1.2"/></svg>',
    tee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="7" r="4"/><path d="M8 12h8l-3 2v7h-2v-7z"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V5H3z"/><path d="M14 5v11" stroke-dasharray="2 2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    instagram: '<svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.8a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-9.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><path d="M14 8V6c0-.9.6-1.2 1.1-1.2H17V1.1L14.3 1C11.4 1 10.7 3.2 10.7 4.6V8H8v3.8h2.8V23h3.4V11.8h3.1l.4-3.8z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.4v13.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1v-3.5a6 6 0 1 0 5.2 6V9.6a7.6 7.6 0 0 0 4.5 1.4V7.6a4.4 4.4 0 0 1-3.4-1.8z"/></svg>'
  };
  window.MARCILLY.ICON = ICON;

  var NAV = [
    ['parcours.html', 'Parcours', 'parcours'],
    ['tarifs.html', 'Tarifs', 'tarifs'],
    ['enseignement.html', 'Enseignement', 'enseignement'],
    ['restaurant.html', 'Restaurant', 'restaurant'],
    ['association.html', 'Association', 'association'],
    ['actualites.html', 'Actualités', 'actualites'],
    ['contact.html', 'Contact', 'contact']
  ];

  /* ---------------- mise en page commune ---------------- */
  function renderLayout() {
    var top = $('#layout-top'), bottom = $('#layout-bottom');
    document.documentElement.style.setProperty('--logo', 'url("' + S.images.logo_navy + '")');
    var navHtml = NAV.map(function (n) { return '<a href="' + n[0] + '"' + (PAGE === n[2] || (PAGE === 'article' && n[2] === 'actualites') ? ' aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join('');
    if (top) {
      top.innerHTML =
        '<div class="announce" id="announce" hidden><div class="wrap"><span data-set="announcement.text"></span> <a data-set-href="announcement.link" data-set="announcement.link_label" href="#"></a></div><button class="announce__close" aria-label="Masquer l\'annonce">×</button></div>' +
        '<header class="site-header" id="site-header"><div class="wrap">' +
        '<a class="brand" href="index.html" aria-label="Golf de Marcilly, accueil"><span class="brand__mark" aria-hidden="true"></span><span class="brand__name">Golf de Marcilly<small>45 trous près d\'Orléans</small></span></a>' +
        '<nav class="nav" aria-label="Navigation principale">' + navHtml + '</nav>' +
        '<div class="header-cta"><a class="btn" data-set-href="links.booking" href="' + esc(S.links.booking) + '" target="_blank" rel="noopener">' + ICON.flag + '<span>Réserver un départ</span></a>' +
        '<button class="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button></div>' +
        '</div></header>' +
        '<div class="mobile-menu" id="mobile-menu" aria-hidden="true"><nav aria-label="Menu mobile"><a href="index.html">Accueil</a>' + navHtml + '</nav>' +
        '<div class="mobile-menu__foot"><a class="btn" data-set-href="links.booking" href="' + esc(S.links.booking) + '" target="_blank" rel="noopener">' + ICON.flag + '<span>Réserver un départ</span></a><a class="link-arrow" data-set-tel="contact.phone" href="#"><span data-set="contact.phone"></span></a></div></div>';
    }
    if (bottom) {
      bottom.innerHTML =
        '<footer class="site-footer"><div class="wrap">' +
        '<div class="footer-top">' +
        '<div class="footer-brand"><span class="brand__mark" aria-hidden="true"></span><p>Un golf de 45 trous ouvert à tous, aux portes d\'Orléans. Débutants, familles et compétiteurs : venez jouer.</p>' +
        '<div class="socials"><a data-set-href="socials.instagram" href="#" target="_blank" rel="noopener" aria-label="Instagram">' + ICON.instagram + '</a><a data-set-href="socials.facebook" href="#" target="_blank" rel="noopener" aria-label="Facebook">' + ICON.facebook + '</a><a data-set-href="socials.tiktok" href="#" target="_blank" rel="noopener" aria-label="TikTok">' + ICON.tiktok + '</a></div>' +
        '<p style="margin-top:1.4rem"><a class="btn btn--ghost" data-set-href="socials.newsletter" id="newsletter-btn" href="#" target="_blank" rel="noopener"><span>S\'inscrire à la newsletter</span></a></p></div>' +
        '<div><h4>Nous trouver</h4><ul><li data-set="contact.address1"></li><li data-set="contact.address2"></li><li><a data-set-tel="contact.phone" href="#" data-set="contact.phone"></a></li><li><a data-set-mail="contact.email" href="#" data-set="contact.email"></a></li></ul></div>' +
        '<div><h4>Accueil du golf</h4><ul><li>Lundi au vendredi<br><strong data-set="hours.weekdays"></strong></li><li>Samedi<br><strong data-set="hours.saturday"></strong></li><li>Dimanche<br><strong data-set="hours.sunday"></strong></li></ul></div>' +
        '<div><h4>Le club</h4><ul>' + NAV.map(function (n) { return '<li><a href="' + n[0] + '">' + n[1] + '</a></li>'; }).join('') + '</ul></div>' +
        '</div>' +
        '<div class="footer-giant" aria-hidden="true">Marcilly</div>' +
        '<div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' <span data-set="legal.company"></span></span><nav><a href="mentions-legales.html">Mentions légales</a><a href="admin/">Espace admin</a></nav></div>' +
        '</div></footer>';
    }
    bindLayout();
  }

  function applySettings(root) {
    root = root || document;
    $$('[data-set]', root).forEach(function (el) { var v = get(S, el.dataset.set); if (v != null && v !== '') el.textContent = v; });
    $$('[data-set-href]', root).forEach(function (el) { var v = get(S, el.dataset.setHref); if (v) el.setAttribute('href', safeUrl(v)); if (el.id === 'newsletter-btn') el.closest('p').hidden = !v; });
    $$('[data-set-tel]', root).forEach(function (el) { var v = get(S, el.dataset.setTel); if (v) el.setAttribute('href', telHref(v)); });
    $$('[data-set-mail]', root).forEach(function (el) { var v = get(S, el.dataset.setMail); if (v) el.setAttribute('href', 'mailto:' + v); });
    $$('[data-set-src]', root).forEach(function (el) { var v = get(S, el.dataset.setSrc); if (v) el.setAttribute('src', v); });
    document.documentElement.style.setProperty('--logo', 'url("' + S.images.logo_navy + '")');
    // annonce
    var a = $('#announce');
    if (a) {
      var dismissed = false; try { dismissed = sessionStorage.getItem('mc-announce') === (S.announcement.text || ''); } catch (e) {}
      a.hidden = !(S.announcement && S.announcement.enabled && S.announcement.text) || dismissed;
      var link = $('a', a); if (link) link.hidden = !S.announcement.link;
      document.body.classList.toggle('has-announce', !a.hidden);
      document.documentElement.style.setProperty('--announce-h', a.hidden ? '0px' : a.offsetHeight + 'px');
    }
  }

  function bindLayout() {
    var header = $('#site-header');
    var burger = $('.burger');
    var menu = $('#mobile-menu');
    if (burger) burger.addEventListener('click', function () {
      var open = !document.body.classList.contains('menu-open');
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.setAttribute('aria-hidden', !open);
      if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) burger.click(); });
    var close = $('.announce__close');
    if (close) close.addEventListener('click', function () {
      $('#announce').hidden = true; document.body.classList.remove('has-announce');
      document.documentElement.style.setProperty('--announce-h', '0px');
      window.dispatchEvent(new Event('scroll'));
      try { sessionStorage.setItem('mc-announce', S.announcement.text || ''); } catch (e) {}
    });
    var heroEl = $('.hero, .page-hero');
    if (heroEl && header) header.classList.add('is-over-hero', 'is-fixed');
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var y = window.scrollY;
        if (!header) return;
        var over = heroEl ? heroEl.getBoundingClientRect().top > -60 : false;
        header.classList.toggle('is-scrolled', !over && y > 10);
        if (heroEl) {
          header.classList.toggle('is-over-hero', over);
          var a = $('#announce'), ah = a && !a.hidden ? a.offsetHeight : 0;
          header.style.transform = 'translate3d(0,' + Math.max(0, ah - y) + 'px,0)';
        }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ---------------- données ---------------- */
  function q(table, fn) {
    if (!sb) return Promise.resolve([]);
    var b = sb.from(table).select('*');
    if (fn) b = fn(b);
    return b.then(function (r) { if (r.error) { console.warn(table, r.error.message); return []; } return r.data || []; });
  }

  function loadCore() {
    return Promise.all([
      q('marcilly_settings'),
      q('marcilly_blocks')
    ]).then(function (r) {
      r[0].forEach(function (row) { S[row.key] = Object.assign({}, S[row.key] || {}, row.value || {}); });
      applySettings();
      var blocks = {}; r[1].forEach(function (b) { blocks[b.key] = b; });
      applyBlocks(blocks);
    });
  }

  function applyBlocks(blocks) {
    $$('[data-block]').forEach(function (el) {
      var b = blocks[el.dataset.block]; if (!b) return;
      $$('[data-field="title"]', el).forEach(function (t) { if (b.title) { t.textContent = b.title; t.removeAttribute('data-split-done'); splitWords(t); } });
      $$('[data-field="body"]', el).forEach(function (t) { if (b.body) t.innerHTML = md(b.body); });
      $$('[data-field="image"]', el).forEach(function (t) { if (b.image_url) { t.src = b.image_url; } });
    });
  }

  /* ---------------- rendus ---------------- */
  function renderCourses(list, el, mode) {
    if (!el) return;
    if (!list.length) { el.innerHTML = '<p class="empty">Les parcours arrivent bientôt.</p>'; return; }
    if (mode === 'cards') {
      el.innerHTML = list.map(function (c) {
        var dots = ''; for (var i = 1; i <= c.holes; i++) dots += '<i>' + i + '</i>';
        return '<article class="course-card"><div class="course-card__img"><img src="' + esc(c.image_url || S.images.aerial) + '" alt="' + esc(c.name) + '" loading="lazy"></div>' +
          '<div class="course-card__body"><h3>' + esc(c.name) + '</h3><div class="chips"><span class="chip"><b>' + c.holes + '</b> trous</span>' + (c.par ? '<span class="chip"><b>' + c.par + '</b> par</span>' : '') + (c.length_m ? '<span class="chip"><b>' + c.length_m.toLocaleString('fr-FR') + '</b> m</span>' : '') + (c.level ? '<span class="chip chip--green">' + esc(c.level) + '</span>' : '') + '</div>' +
          '<p>' + esc(c.description || '') + '</p><div class="course-card__holes" aria-hidden="true">' + dots + '</div></div></article>';
      }).join('');
    } else {
      el.innerHTML = list.map(function (c, i) {
        var dots = ''; for (var k = 1; k <= c.holes; k++) dots += '<i>' + k + '</i>';
        return '<section class="section ' + (i % 2 ? 'section--sky' : '') + '" id="' + esc(slug(c.name)) + '"><div class="wrap grid-2">' +
          '<div style="order:' + (i % 2 ? 2 : 0) + '"><div class="media-frame reveal-img"><img src="' + esc(c.image_url || S.images.aerial) + '" alt="' + esc(c.name) + '" loading="lazy"></div></div>' +
          '<div class="stack"><span class="kicker">' + c.holes + ' trous</span><h2 data-split>' + esc(c.name) + '</h2><div class="chips">' + (c.par ? '<span class="chip"><b>' + c.par + '</b> par</span>' : '') + (c.length_m ? '<span class="chip"><b>' + c.length_m.toLocaleString('fr-FR') + '</b> mètres</span>' : '') + (c.level ? '<span class="chip chip--green">' + esc(c.level) + '</span>' : '') + '</div>' +
          '<p class="lead">' + esc(c.description || '') + '</p><div class="course-card__holes" aria-hidden="true">' + dots + '</div>' +
          '<div class="btn-row"><a class="btn" href="' + esc(S.links.booking) + '" target="_blank" rel="noopener">' + ICON.flag + '<span>Réserver ce parcours</span></a><a class="btn btn--ghost" href="tarifs.html#green-fees"><span>Voir les green fees</span></a></div></div>' +
          '</div></section>';
      }).join('');
    }
  }
  function slug(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function eventHtml(e, cls) {
    var d = parseDate(e.date);
    var range = e.end_date && e.end_date !== e.date ? 'Du ' + fmtDate(e.date, { weekday: 'long', day: 'numeric' }) + ' au ' + fmtDate(e.end_date, { weekday: 'long', day: 'numeric', month: 'long' }) : fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long' });
    var cats = { 'grand-prix': 'Grand rendez-vous', classement: 'Classement', competition: 'Compétition', convivial: 'Convivial', seniors: 'Seniors', entreprise: 'Golf entreprise', privee: 'Privée', jeunes: 'Jeunes' };
    var tag = '<span class="event__tag" data-cat="' + esc(e.category) + '">' + esc(cats[e.category] || e.category) + '</span>';
    var inner = '<div class="event__date"><b>' + d.getDate() + '</b><small>' + MONTHS[d.getMonth()].slice(0, 4) + '.</small></div>' +
      '<div><div class="event__title">' + esc(e.title) + '</div><div class="event__meta">' + esc(range) + (e.format ? ' — ' + esc(e.format) : '') + (e.time_label ? ', ' + esc(e.time_label) : '') + '</div></div>' + tag;
    if (e.link) return '<a class="event ' + (cls || '') + '" href="' + esc(safeUrl(e.link)) + '"' + extAttrs(e.link) + '>' + inner + '</a>';
    return '<div class="event ' + (cls || '') + '">' + inner + '</div>';
  }

  function renderNextEvents(el, cdEl) {
    if (!el) return Promise.resolve();
    return q('marcilly_events', function (b) { return b.gte('date', todayISO()).order('date').limit(5); }).then(function (list) {
      if (!list.length) { el.innerHTML = '<p class="empty">Le prochain calendrier arrive bientôt. Suivez-nous sur les réseaux pour ne rien manquer.</p>'; if (cdEl) cdEl.closest('[data-next-wrap]').hidden = true; return; }
      el.innerHTML = list.map(function (e, i) { return eventHtml(e, i === 0 ? 'is-next' : ''); }).join('');
      if (cdEl) startCountdown(cdEl, list[0]);
    });
  }
  function startCountdown(el, ev) {
    var title = $('[data-next-title]'); if (title) title.textContent = ev.title;
    var date = $('[data-next-date]'); if (date) date.textContent = fmtDate(ev.date, { weekday: 'long', day: 'numeric', month: 'long' });
    var target = parseDate(ev.date); target.setHours(8, 0, 0, 0);
    function tick() {
      var ms = Math.max(0, target - new Date());
      var dd = Math.floor(ms / 864e5), hh = Math.floor(ms / 36e5) % 24, mm = Math.floor(ms / 6e4) % 60;
      el.innerHTML = '<div><b>' + dd + '</b><small>jour' + (dd > 1 ? 's' : '') + '</small></div><div><b>' + String(hh).padStart(2, '0') + '</b><small>heures</small></div><div><b>' + String(mm).padStart(2, '0') + '</b><small>minutes</small></div>';
    }
    tick(); setInterval(tick, 30000);
  }

  function renderCalendar(el, filterEl) {
    if (!el) return Promise.resolve();
    return q('marcilly_events', function (b) { return b.order('date'); }).then(function (list) {
      if (!list.length) { el.innerHTML = '<p class="empty">Aucune compétition programmée pour le moment.</p>'; return; }
      var today = todayISO(), nextFound = false, groups = {}, order = [];
      list.forEach(function (e) {
        var k = e.date.slice(0, 7); if (!groups[k]) { groups[k] = []; order.push(k); }
        var cls = '';
        if ((e.end_date || e.date) < today) cls = 'is-past'; else if (!nextFound) { cls = 'is-next'; nextFound = true; }
        groups[k].push(eventHtml(e, cls));
      });
      el.innerHTML = order.map(function (k) {
        var d = parseDate(k + '-01');
        return '<div class="month-group" data-month="' + k + '"><h3>' + MONTHS[d.getMonth()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + d.getFullYear() + ' <small>' + groups[k].length + ' date' + (groups[k].length > 1 ? 's' : '') + '</small></h3><div class="events">' + groups[k].join('') + '</div></div>';
      }).join('');
      if (filterEl) {
        var currentKey = today.slice(0, 7);
        filterEl.innerHTML = '<button type="button" data-m="upcoming" aria-pressed="true">À venir</button><button type="button" data-m="all" aria-pressed="false">Toute la saison</button>' + order.map(function (k) { var d = parseDate(k + '-01'); return '<button type="button" data-m="' + k + '" aria-pressed="false">' + MONTHS[d.getMonth()].replace(/^./, function (c) { return c.toUpperCase(); }) + '</button>'; }).join('');
        function apply(m) {
          $$('button', filterEl).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.m === m); });
          $$('.month-group', el).forEach(function (g) {
            g.hidden = m === 'all' ? false : m === 'upcoming' ? g.dataset.month < currentKey : g.dataset.month !== m;
          });
          if (window.ScrollTrigger) ScrollTrigger.refresh();
        }
        filterEl.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) apply(b.dataset.m); });
        var hasUpcoming = order.some(function (k) { return k >= currentKey; });
        apply(hasUpcoming ? 'upcoming' : 'all');
      }
    });
  }

  function renderPosts(el, limit, featured) {
    if (!el) return Promise.resolve();
    return q('marcilly_posts', function (b) { b = b.order('published_at', { ascending: false }); return limit ? b.limit(limit) : b; }).then(function (list) {
      if (!list.length) { el.innerHTML = '<p class="empty">Pas encore d\'actualité. Revenez bientôt !</p>'; return; }
      el.innerHTML = list.map(function (p, i) {
        return '<a class="post' + (featured && i === 0 ? ' post--featured' : '') + '" href="article.html?slug=' + encodeURIComponent(p.slug) + '"><div class="post__img"><img src="' + esc(p.image_url || S.images.hero) + '" alt="" loading="lazy"></div><div><time datetime="' + esc(p.published_at) + '">' + fmtDate(p.published_at) + '</time><h3>' + esc(p.title) + '</h3><p>' + esc(p.excerpt || '') + '</p></div></a>';
      }).join('');
    });
  }

  function renderArticle() {
    var el = $('#article'); if (!el) return Promise.resolve();
    var s = new URLSearchParams(location.search).get('slug');
    return q('marcilly_posts', function (b) { return b.eq('slug', s || '').limit(1); }).then(function (r) {
      var p = r[0];
      if (!p) { el.innerHTML = '<h1 style="font-size:var(--step-3)">Article introuvable</h1><p class="lead">Cet article n\'existe plus ou a été déplacé.</p><a class="btn" href="actualites.html"><span>Toutes les actualités</span></a>'; return; }
      document.title = p.title + ' | Golf de Marcilly';
      var m = $('meta[name="description"]'); if (m) m.setAttribute('content', p.excerpt || p.title);
      el.innerHTML = '<a class="link-arrow" href="actualites.html">Toutes les actualités</a><time style="display:block;margin-top:2rem;color:var(--muted);font-weight:600" datetime="' + esc(p.published_at) + '">' + fmtDate(p.published_at) + '</time><h1 data-split style="font-size:var(--step-4);margin-top:.5rem">' + esc(p.title) + '</h1>' +
        (p.excerpt ? '<p class="lead" style="margin-top:1.2rem">' + esc(p.excerpt) + '</p>' : '') +
        (p.image_url ? '<div class="article__cover reveal-img"><img src="' + esc(p.image_url) + '" alt=""></div>' : '') +
        '<div class="prose">' + md(p.body) + '</div>';
    });
  }

  function renderPrices(rows) {
    var by = {}; rows.forEach(function (r) { (by[r.category] = by[r.category] || []).push(r); });
    $$('[data-prices]').forEach(function (el) {
      var cats = el.dataset.prices.split(','), style = el.dataset.style || 'list';
      var list = []; cats.forEach(function (c) { list = list.concat(by[c] || []); });
      if (!list.length) { el.innerHTML = '<p class="empty">Tarifs disponibles à l\'accueil.</p>'; return; }
      if (style === 'offers') {
        el.innerHTML = list.map(function (p) { return '<article class="offer' + (p.highlight ? ' is-highlight' : '') + '"><h3>' + esc(p.label) + '</h3><div class="offer__price">' + esc(p.price) + '</div><p>' + esc(p.description || '') + '</p></article>'; }).join('');
      } else if (style === 'dishes') {
        el.innerHTML = list.map(function (p) { return '<div class="dish"><span>' + esc(p.label) + (p.description ? '<small>' + esc(p.description) + '</small>' : '') + '</span><b>' + esc(p.price) + '</b></div>'; }).join('');
      } else if (style === 'menus') {
        el.innerHTML = list.map(function (p) {
          var lines = String(p.description || '').split('\n').filter(Boolean).map(function (l) { var i = l.indexOf(':'); return i > 0 ? '<li><b>' + esc(l.slice(0, i)) + '</b>' + esc(l.slice(i + 1).trim()) + '</li>' : '<li>' + esc(l) + '</li>'; }).join('');
          return '<article class="group-menu' + (p.highlight ? ' is-highlight' : '') + '"><h3>' + esc(p.label) + '</h3><div class="offer__price">' + esc(p.price) + '</div><ul>' + lines + '</ul></article>';
        }).join('');
      } else {
        el.innerHTML = list.map(function (p) { return '<div class="price' + (p.highlight ? ' is-highlight' : '') + '"><span class="price__label">' + esc(p.label) + '</span>' + (p.description ? '<span class="price__desc">' + esc(p.description) + '</span>' : '') + '<span class="price__value">' + esc(p.price) + '</span></div>'; }).join('');
      }
    });
  }

  function renderPeople(rows) {
    $$('[data-people]').forEach(function (el) {
      var list = rows.filter(function (p) { return p.kind === el.dataset.people; });
      if (!list.length) { el.closest('[data-people-section]') ? (el.closest('[data-people-section]').hidden = true) : (el.innerHTML = ''); return; }
      if (el.dataset.people === 'pro') {
        el.innerHTML = list.map(function (p) {
          var last = (p.name || '').split(' ').slice(-1)[0];
          return '<article class="pro"><div class="pro__photo"><span class="pro__name" aria-hidden="true">' + esc(last) + '</span>' + (p.photo_url ? '<img src="' + esc(p.photo_url) + '" alt="' + esc(p.name) + '" loading="lazy">' : '') + '</div>' +
            '<div class="pro__body"><small>' + esc(p.role || 'Enseignant') + '</small><h3>' + esc(p.name) + '</h3>' +
            (p.phone ? '<a href="' + telHref(p.phone) + '">' + ICON.phone + esc(p.phone) + '</a>' : '') +
            (p.email ? '<a href="mailto:' + esc(p.email) + '">' + ICON.mail + esc(p.email) + '</a>' : '') +
            (p.website ? '<a href="' + esc(safeUrl(p.website)) + '" target="_blank" rel="noopener">' + ICON.web + 'Formules et tarifs</a>' : '') + '</div></article>';
        }).join('');
      } else {
        el.innerHTML = list.map(function (p) { return '<figure class="junior">' + (p.photo_url ? '<img src="' + esc(p.photo_url) + '" alt="' + esc(p.name) + '" loading="lazy">' : '') + '<figcaption>' + esc(p.name) + (p.role ? '<br><small style="color:var(--muted);font-weight:500">' + esc(p.role) + '</small>' : '') + '</figcaption></figure>'; }).join('');
      }
    });
  }

  function renderPartners(rows) {
    $$('[data-partners]').forEach(function (el) {
      var kinds = el.dataset.partners.split(',');
      var list = rows.filter(function (p) { return kinds.indexOf(p.kind) > -1 && p.logo_url; });
      if (!list.length) { el.innerHTML = ''; return; }
      if (el.classList.contains('marquee')) {
        var items = list.map(function (p) { return '<img src="' + esc(p.logo_url) + '" alt="' + esc(p.name || 'Partenaire') + '" loading="lazy">'; }).join('');
        el.innerHTML = '<div class="marquee__track">' + items + items.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"') + '</div>';
      } else {
        el.innerHTML = list.map(function (p) { var img = '<img src="' + esc(p.logo_url) + '" alt="' + esc(p.name || 'Partenaire') + '" loading="lazy">'; return p.url ? '<a href="' + esc(safeUrl(p.url)) + '" target="_blank" rel="noopener" title="' + esc(p.name) + '">' + img + '</a>' : '<div title="' + esc(p.name) + '">' + img + '</div>'; }).join('');
      }
    });
  }

  function renderGallery(rows) {
    var el = $('[data-gallery]'); if (!el) return;
    if (!rows.length) { el.closest('section').hidden = true; return; }
    el.innerHTML = rows.map(function (g) { return '<figure class="media-frame reveal-img"><img src="' + esc(g.image_url) + '" alt="' + esc(g.caption || '') + '" loading="lazy"></figure>'; }).join('');
  }

  /* météo du jour (Open-Meteo, sans clé) */
  function loadWeather() {
    var el = $('[data-weather]'); if (!el) return;
    var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + CFG.WEATHER.lat + '&longitude=' + CFG.WEATHER.lng + '&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=Europe%2FParis';
    fetch(u).then(function (r) { return r.json(); }).then(function (d) {
      var c = d.current; if (!c) return;
      var code = c.weather_code, ico = code === 0 ? '☀️' : code < 3 ? '🌤️' : code < 50 ? '☁️' : code < 70 ? '🌧️' : code < 80 ? '❄️' : code < 90 ? '🌦️' : '⛈️';
      var verdict = code < 3 ? 'Grand beau, foncez !' : code < 50 ? 'Temps idéal pour jouer.' : code < 70 ? 'Prévoyez le parapluie.' : 'Mieux vaut le practice couvert… ou le restaurant.';
      var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
      el.innerHTML = '<small>Sur le parcours maintenant</small><div class="weather__row"><span class="weather__icon" aria-hidden="true">' + ico + '</span><span class="weather__temp">' + Math.round(c.temperature_2m) + '°</span><span><strong style="display:block">Vent ' + Math.round(c.wind_speed_10m) + ' km/h ' + dirs[Math.round(c.wind_direction_10m / 45) % 8] + '</strong><small>' + verdict + '</small></span></div>';
    }).catch(function () { el.innerHTML = '<small>Accueil ouvert aujourd\'hui</small><strong>' + esc(todayHours()) + '</strong>'; });
  }
  function todayHours() { var d = new Date().getDay(); return d === 0 ? S.hours.sunday : d === 6 ? S.hours.saturday : S.hours.weekdays; }

  /* formulaires (contact / devis) */
  function bindForms() {
    $$('form[data-message]').forEach(function (f) {
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var st = $('.form-status', f), btn = $('button[type="submit"]', f);
        st.className = 'form-status';
        if (f.website && f.website.value) return; // pot de miel anti-robots
        if (!f.checkValidity()) { f.reportValidity(); return; }
        var fd = new FormData(f);
        var row = { kind: f.dataset.message, name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone') || null, message: fd.get('message') };
        if (fd.get('participants')) row.participants = parseInt(fd.get('participants'), 10) || null;
        if (fd.get('wished_date')) row.wished_date = fd.get('wished_date');
        if (fd.get('subject')) row.message = '[' + fd.get('subject') + '] ' + row.message;
        btn.disabled = true;
        (sb ? sb.from('marcilly_messages').insert(row) : Promise.reject(new Error('hors ligne'))).then(function (r) {
          if (r && r.error) throw r.error;
          f.reset(); st.textContent = f.dataset.message === 'devis' ? 'Merci ! Votre demande de devis est bien envoyée. L\'équipe revient vers vous rapidement.' : 'Merci ! Votre message est bien envoyé. Nous vous répondons rapidement.'; st.classList.add('is-ok');
        }).catch(function () {
          st.innerHTML = 'L\'envoi n\'a pas abouti. Réessayez dans un instant ou appelez-nous au <a href="' + telHref(S.contact.phone) + '">' + esc(S.contact.phone) + '</a>.'; st.classList.add('is-err');
        }).then(function () { btn.disabled = false; });
      });
    });
    // préremplissage du sujet via ?sujet=
    var subj = new URLSearchParams(location.search).get('sujet');
    if (subj) { var s = $('select[name="subject"]'); if (s) { $$('option', s).forEach(function (o) { if (o.value === subj) s.value = subj; }); } }
  }

  /* ---------------- animations ---------------- */
  function splitWords(el) {
    if (!el || el.dataset.splitDone) return;
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map(function (w) { return '<span class="split-word" aria-hidden="true"><span>' + esc(w) + '</span></span>'; }).join(' ');
    el.dataset.splitDone = '1';
    if (HAS_GSAP && el.dataset.split !== undefined) {
      gsap.from($$('.split-word > span', el), { yPercent: 110, duration: 1, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    }
  }

  function initMotion() {
    if (!HAS_GSAP) { $$('[data-split]').forEach(function (h) { h.dataset.splitDone = '1'; }); return; }
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (window.MotionPathPlugin) gsap.registerPlugin(MotionPathPlugin);
    if (window.Lenis) {
      var lenis = new Lenis({ lerp: .11, smoothWheel: true });
      window.__lenis = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach(function (a) { a.addEventListener('click', function (e) { var id = a.getAttribute('href'); if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -90 }); } }); });
    }
    animateGeneric(document);
  }

  function animateGeneric(root) {
    if (!HAS_GSAP) return;
    $$('[data-split]', root).forEach(splitWords);
    $$('.reveal-img', root).forEach(function (el) {
      if (el.dataset.revealed) return; el.dataset.revealed = 1;
      var img = $('img', el);
      gsap.fromTo(el, { y: 50, opacity: 0 }, { y: 0, opacity: 1, ease: 'power3.out', duration: 1.1, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, ease: 'power3.out', duration: 1.6, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('[data-stagger]', root).forEach(function (el) {
      if (el.dataset.staggered) return; el.dataset.staggered = 1;
      gsap.from(el.children, { y: 40, opacity: 0, duration: .9, ease: 'power3.out', stagger: .08, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
    $$('[data-parallax]', root).forEach(function (el) {
      gsap.to(el, { yPercent: parseFloat(el.dataset.parallax) || -15, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    var giant = $('.footer-giant', root);
    if (giant && !giant.dataset.anim) { giant.dataset.anim = 1; gsap.fromTo(giant, { xPercent: 8 }, { xPercent: -14, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: true } }); }
    var ph = $('.page-hero', root);
    if (ph && !ph.dataset.anim) {
      ph.dataset.anim = 1;
      var w = $('.page-hero__word', ph);
      if (w) gsap.fromTo(w, { xPercent: 10, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.6, ease: 'expo.out' });
      var bg = $('.page-hero__bg img', ph);
      if (bg) gsap.to(bg, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: ph, start: 'top top', end: 'bottom top', scrub: true } });
    }
  }

  /* --- Accueil : la silhouette du logo (le golfeur-oiseau) découpée dans un voile marine, qui s'ouvre
         sur la vue aérienne au défilement. Dessin en canvas à la résolution de l'écran. --- */
  function heroMask() {
    var hero = $('#hero'); if (!hero) return;
    var cv = $('.hero__mask', hero), img = $('.hero__photo img', hero);
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var st = { s: 1, y: 50, a: 0 }, G = null, L = null, dirty = true, lastW = 0;

    // Prépare la silhouette pleine du logo : traits épaissis puis remplissage de tout ce qui n'est pas « dehors »
    function buildSilhouette(im) {
      var H = 1100, W = Math.round(im.naturalWidth * H / im.naturalHeight);
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d'); x.drawImage(im, 0, 0, W, H);
      var px = x.getImageData(0, 0, W, H).data, n = W * H;
      var ink = new Uint8Array(n);
      for (var i = 0; i < n; i++) ink[i] = px[i * 4 + 3] > 70 ? 1 : 0;
      // épaissir de 3 px pour fermer les petites ouvertures du dessin
      var R = 3, thick = new Uint8Array(n);
      for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) {
        if (!ink[yy * W + xx]) continue;
        for (var dy = -R; dy <= R; dy++) { var ny = yy + dy; if (ny < 0 || ny >= H) continue;
          for (var dx = -R; dx <= R; dx++) { var nx = xx + dx; if (nx >= 0 && nx < W) thick[ny * W + nx] = 1; } }
      }
      // remplissage de l'extérieur depuis les bords
      var out = new Uint8Array(n), stack = new Int32Array(n), sp = 0;
      function push(k) { if (!out[k] && !thick[k]) { out[k] = 1; stack[sp++] = k; } }
      for (var a = 0; a < W; a++) { push(a); push((H - 1) * W + a); }
      for (var b = 0; b < H; b++) { push(b * W); push(b * W + W - 1); }
      while (sp) { var k = stack[--sp], kx = k % W;
        if (kx > 0) push(k - 1); if (kx < W - 1) push(k + 1); if (k >= W) push(k - W); if (k < n - W) push(k + W); }
      // bords adoucis : flou en boîte sur l'alpha (deux passes), pour un contour lisse pendant le zoom
      var al = new Float32Array(n), tmp = new Float32Array(n);
      for (var j = 0; j < n; j++) al[j] = out[j] ? 0 : 255;
      for (var pass = 0; pass < 2; pass++) {
        for (yy = 0; yy < H; yy++) { var row = yy * W; for (xx = 0; xx < W; xx++) { var acc = 0, c2 = 0; for (dx = -2; dx <= 2; dx++) { nx = xx + dx; if (nx >= 0 && nx < W) { acc += al[row + nx]; c2++; } } tmp[row + xx] = acc / c2; } }
        for (yy = 0; yy < H; yy++) for (xx = 0; xx < W; xx++) { acc = 0; c2 = 0; for (dy = -2; dy <= 2; dy++) { ny = yy + dy; if (ny >= 0 && ny < H) { acc += tmp[ny * W + xx]; c2++; } } al[yy * W + xx] = acc / c2; }
      }
      var sil = x.createImageData(W, H), sd = sil.data;
      for (j = 0; j < n; j++) sd[j * 4 + 3] = al[j];
      var sc = document.createElement('canvas'); sc.width = W; sc.height = H; sc.getContext('2d').putImageData(sil, 0, 0);
      // point le plus « intérieur » de la silhouette (carte de distances grossière) : origine du zoom
      var step = 6, gw = Math.ceil(W / step), gh = Math.ceil(H / step), dist = new Float32Array(gw * gh), best = 0, bx = W / 2, by = H / 2;
      for (var gy = 0; gy < gh; gy++) for (var gx = 0; gx < gw; gx++) dist[gy * gw + gx] = out[Math.min(H - 1, gy * step) * W + Math.min(W - 1, gx * step)] ? 0 : 1e6;
      for (gy = 0; gy < gh; gy++) for (gx = 0; gx < gw; gx++) { var id = gy * gw + gx; if (!dist[id]) continue;
        var m = dist[id]; if (gx > 0) m = Math.min(m, dist[id - 1] + 1); if (gy > 0) m = Math.min(m, dist[id - gw] + 1); dist[id] = m; }
      for (gy = gh - 1; gy >= 0; gy--) for (gx = gw - 1; gx >= 0; gx--) { id = gy * gw + gx; if (!dist[id]) continue;
        m = dist[id]; if (gx < gw - 1) m = Math.min(m, dist[id + 1] + 1); if (gy < gh - 1) m = Math.min(m, dist[id + gw] + 1); dist[id] = m;
        if (m > best) { best = m; bx = gx * step; by = gy * step; } }
      return { sil: sc, art: im, W: W, H: H, ox: bx / W, oy: by / H };
    }

    function layout() {
      var w = hero.clientWidth, h = hero.clientHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      G = { w: w, h: h, dpr: dpr };
      if (L) {
        var ratio = L.W / L.H, bh = Math.min(h * .66, (w * .82) / ratio), bw = bh * ratio;
        G.bx = w / 2 - bw / 2; G.by = h * .45 - bh / 2; G.bw = bw; G.bh = bh;
        G.ox = G.bx + L.ox * bw; G.oy = G.by + L.oy * bh;
      }
      dirty = true; render();
    }
    function render() {
      if (!G || !dirty) return; dirty = false;
      var d = G.dpr, sc = st.s;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (sc > 60) return; // le voile a disparu
      ctx.fillStyle = '#0E1A29'; ctx.fillRect(0, 0, cv.width, cv.height);
      if (!L || G.bw == null) return;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.setTransform(d * sc, 0, 0, d * sc, d * G.ox * (1 - sc), d * (G.oy * (1 - sc) + st.y));
      // trou en forme de silhouette : la photo apparaît dedans
      ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = st.a;
      ctx.drawImage(L.sil, G.bx, G.by, G.bw, G.bh);
      // les traits du logo par-dessus, qui s'effacent pendant le zoom
      var la = st.a * Math.max(0, 1 - (sc - 1) / 2.5);
      if (la > .01) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = la; ctx.drawImage(L.art, G.bx, G.by, G.bw, G.bh); }
    }
    function mark() { dirty = true; }
    layout();

    var logo = new Image(); logo.crossOrigin = 'anonymous';
    logo.onload = function () {
      try { L = buildSilhouette(logo); } catch (e) { console.warn('Silhouette du logo indisponible', e); return; }
      layout();
      if (HAS_GSAP) gsap.to(st, { y: 0, a: 1, duration: 1.4, ease: 'expo.out', onUpdate: mark });
      else { st.y = 0; st.a = 1; mark(); render(); }
    };
    logo.src = (S.images && S.images.logo_navy) || CFG.defaults.images.logo_navy;

    if (!HAS_GSAP) return;
    gsap.ticker.add(render);
    var tl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=150%', pin: true, scrub: .6, anticipatePin: 1 }
    });
    tl.to('.hero__intro, .hero__cue', { opacity: 0, y: -30, duration: .15 }, 0)
      .to(st, { s: 45, ease: 'power3.in', duration: .7, onUpdate: mark }, 0)
      .fromTo(img, { scale: 1.3 }, { scale: 1, ease: 'power1.out', duration: 1 }, 0)
      .set(cv, { autoAlpha: 0 }, .7)
      .to('.hero__shade', { opacity: 1, duration: .25 }, .6)
      .fromTo('.hero__content', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .3, ease: 'power2.out' }, .7);
    gsap.from('.hero__intro', { opacity: 0, y: 20, duration: 1, delay: .7 });
    lastW = window.innerWidth;
    window.addEventListener('resize', debounce(function () {
      // sur mobile, la barre d'adresse change la hauteur : on ne recalcule que si la largeur change vraiment
      if (Math.abs(window.innerWidth - lastW) < 2 && G) { var h = hero.clientHeight; if (Math.abs(h - G.h) < 160) return; }
      lastW = window.innerWidth; layout();
    }, 200));
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  /* --- Accueil : la balle vole jusqu'au drapeau --- */
  function ballFlight() {
    var svg = $('.flight'); if (!svg || !HAS_GSAP || !window.MotionPathPlugin) return;
    var path = $('#flight-path', svg), maskPath = $('#flight-mask-path', svg), ball = $('.ball-g', svg);
    var len = path.getTotalLength();
    gsap.set(maskPath, { strokeDasharray: len, strokeDashoffset: len });
    var tl = gsap.timeline({ scrollTrigger: { trigger: '.intro', start: 'top 70%', end: 'center 40%', scrub: .6 } });
    tl.to(maskPath, { strokeDashoffset: 0, ease: 'none', duration: 1 }, 0)
      .to(ball, { motionPath: { path: path, align: path, alignOrigin: [.5, .5] }, ease: 'none', duration: 1 }, 0)
      .fromTo(ball, { scale: .6 }, { scale: 1.6, duration: .5, ease: 'sine.out', yoyo: true, repeat: 1, transformOrigin: '50% 50%' }, 0)
      .to('.flight .flag-cloth', { rotate: 8, transformOrigin: '0% 50%', duration: .2, yoyo: true, repeat: 3 }, .8)
      .to(ball, { opacity: 0, duration: .05 }, 1);
  }

  /* --- Accueil : tableau de score qui défile comme un panneau --- */
  function scoreboard() {
    $$('.board__digits').forEach(function (el) {
      var target = el.dataset.value || '';
      el.innerHTML = target.split('').map(function (c, i) { return '<span' + (el.dataset.red && i === target.length - 1 ? ' class="is-red"' : '') + '>' + c + '</span>'; }).join('');
      if (!HAS_GSAP) return;
      var spans = $$('span', el);
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
        spans.forEach(function (s, i) {
          var final = s.textContent, n = 0, max = 10 + i * 6;
          var iv = setInterval(function () { s.textContent = n++ >= max ? final : String(Math.floor(Math.random() * 10)); if (n > max) clearInterval(iv); }, 45);
          gsap.fromTo(s, { rotateX: -90 }, { rotateX: 0, duration: .5, delay: i * .08, ease: 'back.out(2)' });
        });
      } });
    });
  }

  /* --- Accueil : parcours en défilement horizontal --- */
  function horizontalCourses() {
    var sec = $('.courses'), track = $('.courses__track'); if (!sec || !track) return;
    var vp = $('.courses__viewport');
    if (!HAS_GSAP || window.innerWidth < 760) { vp.classList.add('is-native'); return; }
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var tw = gsap.to(track, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: function (s) { gsap.set('.courses__progress span', { scaleX: s.progress }); } } });
    $$('.course-card__img img', track).forEach(function (img) {
      gsap.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('.course-card'), containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
    });
  }

  /* ---------------- pages ---------------- */
  var pageTasks = {
    accueil: function () {
      heroMask();
      scoreboard();
      ballFlight();
      loadWeather();
      return Promise.all([
        q('marcilly_courses', function (b) { return b.order('sort'); }).then(function (l) { renderCourses(l, $('.courses__track'), 'cards'); horizontalCourses(); }),
        renderNextEvents($('#next-events'), $('#countdown')),
        renderPosts($('#home-posts'), 3),
        q('marcilly_partners', function (b) { return b.order('sort'); }).then(renderPartners)
      ]);
    },
    parcours: function () {
      loadWeather();
      return Promise.all([
        q('marcilly_courses', function (b) { return b.order('sort'); }).then(function (l) { renderCourses(l, $('#courses-list'), 'sections'); }),
        q('marcilly_gallery', function (b) { return b.order('sort'); }).then(renderGallery)
      ]);
    },
    tarifs: function () {
      return q('marcilly_prices', function (b) { return b.order('sort'); }).then(function (r) { renderPrices(r); priceTabs(); });
    },
    enseignement: function () {
      return Promise.all([
        q('marcilly_prices', function (b) { return b.eq('category', 'ecole').order('sort'); }).then(renderPrices),
        q('marcilly_people', function (b) { return b.order('sort'); }).then(renderPeople)
      ]);
    },
    restaurant: function () {
      return q('marcilly_prices', function (b) { return b.order('sort'); }).then(renderPrices);
    },
    association: function () {
      return Promise.all([
        renderCalendar($('#calendar'), $('#month-filter')),
        q('marcilly_partners', function (b) { return b.order('sort'); }).then(renderPartners),
        q('marcilly_people', function (b) { return b.order('sort'); }).then(renderPeople)
      ]);
    },
    actualites: function () { return renderPosts($('#posts'), 0, true); },
    article: function () { return renderArticle(); },
    contact: function () { return Promise.resolve(); },
    legal: function () { return Promise.resolve(); }
  };

  function priceTabs() {
    var tabs = $$('.price-tabs a'); if (!tabs.length || !HAS_GSAP) return;
    tabs.forEach(function (t) {
      var sec = $(t.getAttribute('href')); if (!sec) return;
      ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: function (s) { if (s.isActive) { tabs.forEach(function (x) { x.classList.remove('is-active'); }); t.classList.add('is-active'); } } });
    });
  }

  /* ---------------- démarrage ---------------- */
  function start() {
    renderLayout();
    applySettings();
    bindForms();
    initMotion();
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () {
      return Promise.all([loadCore(), (pageTasks[PAGE] || function () { return Promise.resolve(); })()]);
    }).catch(function (e) { console.warn(e); }).then(function () {
      animateGeneric(document);
      if (window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 120);
      var loader = $('.loader'); if (loader) loader.classList.add('is-done');
      if (location.hash && $(location.hash)) setTimeout(function () { window.__lenis ? window.__lenis.scrollTo(location.hash, { offset: -90, immediate: true }) : $(location.hash).scrollIntoView(); }, 300);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

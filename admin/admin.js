/* =========================================================
   Golf de Marcilly — espace d'administration
   Connexion Supabase Auth + droits via la table marcilly_admins
   ========================================================= */
(function () {
  'use strict';
  var CFG = window.MARCILLY;
  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);
  var BUCKET = 'marcilly-media';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg, err) { var t = document.createElement('div'); t.className = 'toast' + (err ? ' is-err' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, err ? 5000 : 2600); }
  function slugify(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80); }
  function fmtDate(d) { if (!d) return ''; var x = new Date(String(d).length === 10 ? d + 'T12:00:00' : d); return x.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  function confirmBox(text, okLabel) {
    return new Promise(function (res) {
      var w = document.createElement('div'); w.className = 'confirm';
      w.innerHTML = '<div class="card" role="alertdialog" aria-modal="true"><p style="margin:0;font-weight:600">' + esc(text) + '</p><div class="row" style="justify-content:flex-end"><button class="btn btn--ghost" data-no>Annuler</button><button class="btn btn--red" data-yes>' + esc(okLabel || 'Supprimer') + '</button></div></div>';
      document.body.appendChild(w); $('[data-no]', w).focus();
      w.addEventListener('click', function (e) { if (e.target.closest('[data-yes]')) { w.remove(); res(true); } else if (e.target.closest('[data-no]') || e.target === w) { w.remove(); res(false); } });
    });
  }

  /* ------------------------------------------------------------
     Définition des rubriques
     ------------------------------------------------------------ */
  var PRICE_CATS = [
    ['decouverte', 'Journée découverte'], ['greenfee', 'Green fees'], ['practice', 'Practice'], ['location', 'Location'],
    ['abonnement-45-7j', 'Abonnement 45 trous 7j/7'], ['abonnement-45-5j', 'Abonnement 45 trous semaine'], ['abonnement-27', 'Abonnement 27 trous'], ['abonnement-practice', 'Abonnement practice'],
    ['ecole', 'École de golf'], ['carte-entrees', 'Restaurant : entrées'], ['carte-plats', 'Restaurant : plats'], ['carte-desserts', 'Restaurant : desserts'], ['menu-groupe', 'Restaurant : menus de groupe']
  ];
  var EVENT_CATS = [['competition', 'Compétition'], ['classement', 'Coupe de classement'], ['grand-prix', 'Grand rendez-vous'], ['seniors', 'Seniors'], ['jeunes', 'Jeunes'], ['entreprise', 'Golf entreprise'], ['convivial', 'Convivial / after work'], ['privee', 'Privée']];
  var PEOPLE_KINDS = [['pro', 'Pro / enseignant'], ['jeune', 'Jeune de l\'académie'], ['bureau', 'Bureau de l\'AS'], ['equipe', 'Équipe du golf']];
  var PARTNER_KINDS = [['sponsor', 'Sponsor compétitions'], ['institutionnel', 'Partenaire institutionnel'], ['academie', 'Partenaire académie']];
  var PAGES = [['accueil', 'Accueil'], ['parcours', 'Parcours'], ['tarifs', 'Tarifs'], ['enseignement', 'Enseignement'], ['restaurant', 'Restaurant'], ['association', 'Association'], ['contact', 'Contact']];
  function label(list, v) { var f = list.find(function (x) { return x[0] === v; }); return f ? f[1] : v; }

  var MD_HELP = 'Une ligne vide = nouveau paragraphe. « - » en début de ligne = liste. **texte** = gras. [texte](https://lien) = lien.';

  var SECTIONS = {
    posts: {
      title: 'Actualités', intro: 'Les articles affichés sur l\'accueil et dans la page Actualités.',
      table: 'marcilly_posts', order: [['published_at', false]], search: ['title', 'excerpt'],
      thumb: 'image_url', itemTitle: function (r) { return r.title + (r.published ? '' : ' <span class="pill pill--off">Brouillon</span>'); }, itemMeta: function (r) { return fmtDate(r.published_at) + ' — ' + (r.excerpt || ''); },
      defaults: function () { return { published: true, published_at: new Date().toISOString() }; },
      fields: [
        { k: 'title', l: 'Titre', t: 'text', req: 1, full: 1 },
        { k: 'slug', l: 'Adresse de la page', t: 'text', help: 'Générée depuis le titre si vide (ex. grand-prix-2026).', full: 1 },
        { k: 'excerpt', l: 'Résumé', t: 'textarea', help: 'Une ou deux phrases, affichées sur les cartes.', full: 1 },
        { k: 'body', l: 'Texte de l\'article', t: 'md', full: 1 },
        { k: 'image_url', l: 'Image', t: 'image', full: 1 },
        { k: 'published_at', l: 'Date de publication', t: 'datetime' },
        { k: 'published', l: 'Publié sur le site', t: 'bool' }
      ],
      beforeSave: function (r) { if (!r.slug) r.slug = slugify(r.title); else r.slug = slugify(r.slug); }
    },
    events: {
      title: 'Compétitions', intro: 'Le calendrier de l\'association. Les dates passées restent visibles, grisées.',
      table: 'marcilly_events', order: [['date', true]], search: ['title', 'format'],
      filter: { k: 'when', options: [['upcoming', 'À venir'], ['all', 'Toutes'], ['past', 'Passées']], apply: function (rows, v) { var t = new Date().toISOString().slice(0, 10); return v === 'all' ? rows : rows.filter(function (r) { return v === 'past' ? (r.end_date || r.date) < t : (r.end_date || r.date) >= t; }); } },
      thumb: function (r) { var d = new Date(r.date + 'T12:00:00'); return '<b>' + d.getDate() + '<br><small>' + d.toLocaleDateString('fr-FR', { month: 'short' }) + '</small></b>'; },
      itemTitle: function (r) { return esc(r.title) + ' <span class="pill">' + esc(label(EVENT_CATS, r.category)) + '</span>' + (r.published ? '' : ' <span class="pill pill--off">Masquée</span>'); },
      itemMeta: function (r) { return fmtDate(r.date) + (r.end_date ? ' → ' + fmtDate(r.end_date) : '') + (r.format ? ' — ' + r.format : '') + (r.time_label ? ' — ' + r.time_label : ''); },
      defaults: function () { return { category: 'competition', published: true, date: new Date().toISOString().slice(0, 10) }; },
      fields: [
        { k: 'title', l: 'Nom de la compétition', t: 'text', req: 1, full: 1 },
        { k: 'date', l: 'Date', t: 'date', req: 1 },
        { k: 'end_date', l: 'Date de fin (si plusieurs jours)', t: 'date' },
        { k: 'category', l: 'Type', t: 'select', options: EVENT_CATS },
        { k: 'format', l: 'Formule', t: 'text', help: 'Ex. Scramble à 2, Stableford, Ringer score' },
        { k: 'time_label', l: 'Horaire', t: 'text', help: 'Ex. à partir de 16h' },
        { k: 'link', l: 'Lien (inscription, résultats…)', t: 'url' },
        { k: 'published', l: 'Visible sur le site', t: 'bool' }
      ],
      duplicate: true
    },
    prices: {
      title: 'Tarifs et carte', intro: 'Tous les prix du site : golf, école, et carte du restaurant. Choisissez une catégorie pour filtrer.',
      table: 'marcilly_prices', order: [['category', true], ['sort', true]], search: ['label', 'description'],
      filter: { k: 'category', options: [['', 'Toutes les catégories']].concat(PRICE_CATS), apply: function (rows, v) { return v ? rows.filter(function (r) { return r.category === v; }) : rows; } },
      group: function (r) { return label(PRICE_CATS, r.category); },
      thumb: function (r) { return '<b style="font-size:.7rem">' + esc(r.price || '') + '</b>'; },
      itemTitle: function (r) { return esc(r.label) + (r.highlight ? ' <span class="pill pill--new">En avant</span>' : ''); }, itemMeta: function (r) { return r.description || ''; },
      defaults: function (ctx) { return { category: ctx.filter || 'greenfee', sort: 10 }; },
      fields: [
        { k: 'category', l: 'Catégorie', t: 'select', options: PRICE_CATS, full: 1 },
        { k: 'label', l: 'Intitulé', t: 'text', req: 1, full: 1 },
        { k: 'price', l: 'Prix affiché', t: 'text', help: 'Ex. 44 € ou 15 € / mois' },
        { k: 'sort', l: 'Ordre d\'affichage', t: 'number', help: 'Plus petit = plus haut' },
        { k: 'description', l: 'Précisions', t: 'textarea', help: 'Ex. Licencié : 39 €. Pour les menus : une ligne par étape, « Entrées : … ».', full: 1 },
        { k: 'highlight', l: 'Mettre en avant', t: 'bool' }
      ],
      duplicate: true
    },
    courses: {
      title: 'Parcours', intro: 'Les parcours présentés sur l\'accueil et la page Parcours.',
      table: 'marcilly_courses', order: [['sort', true]], thumb: 'image_url',
      itemTitle: function (r) { return esc(r.name); }, itemMeta: function (r) { return r.holes + ' trous' + (r.par ? ', par ' + r.par : '') + (r.length_m ? ', ' + r.length_m + ' m' : '') + (r.level ? ' — ' + r.level : ''); },
      defaults: function () { return { holes: 9, sort: 10 }; },
      fields: [
        { k: 'name', l: 'Nom', t: 'text', req: 1 }, { k: 'level', l: 'Niveau', t: 'text', help: 'Ex. Débutant, Tous index' },
        { k: 'holes', l: 'Nombre de trous', t: 'number', req: 1 }, { k: 'par', l: 'Par', t: 'number' },
        { k: 'length_m', l: 'Longueur (mètres)', t: 'number' }, { k: 'sort', l: 'Ordre', t: 'number' },
        { k: 'description', l: 'Description', t: 'textarea', full: 1 }, { k: 'image_url', l: 'Photo', t: 'image', full: 1 }
      ]
    },
    people: {
      title: 'Équipe', intro: 'Pros, jeunes de l\'académie, bureau de l\'association et équipe du golf.',
      table: 'marcilly_people', order: [['kind', true], ['sort', true]], search: ['name', 'role'],
      filter: { k: 'kind', options: [['', 'Tout le monde']].concat(PEOPLE_KINDS), apply: function (rows, v) { return v ? rows.filter(function (r) { return r.kind === v; }) : rows; } },
      group: function (r) { return label(PEOPLE_KINDS, r.kind); }, thumb: 'photo_url',
      itemTitle: function (r) { return esc(r.name); }, itemMeta: function (r) { return [r.role, r.phone, r.email].filter(Boolean).join(' — '); },
      defaults: function (ctx) { return { kind: ctx.filter || 'pro', sort: 10 }; },
      fields: [
        { k: 'kind', l: 'Rôle sur le site', t: 'select', options: PEOPLE_KINDS }, { k: 'sort', l: 'Ordre', t: 'number' },
        { k: 'name', l: 'Nom et prénom', t: 'text', req: 1 }, { k: 'role', l: 'Fonction', t: 'text', help: 'Ex. Enseignant diplômé, Président' },
        { k: 'phone', l: 'Téléphone', t: 'text' }, { k: 'email', l: 'E-mail', t: 'text' },
        { k: 'website', l: 'Site web', t: 'url', full: 1 }, { k: 'photo_url', l: 'Photo', t: 'image', full: 1, help: 'Pour les pros : une photo détourée (PNG transparent) rend mieux.' }
      ]
    },
    partners: {
      title: 'Partenaires', intro: 'Logos des sponsors et partenaires (défilent sur l\'accueil, listés sur la page Association).',
      table: 'marcilly_partners', order: [['kind', true], ['sort', true]],
      filter: { k: 'kind', options: [['', 'Tous']].concat(PARTNER_KINDS), apply: function (rows, v) { return v ? rows.filter(function (r) { return r.kind === v; }) : rows; } },
      group: function (r) { return label(PARTNER_KINDS, r.kind); }, thumb: 'logo_url',
      itemTitle: function (r) { return esc(r.name || 'Sans nom'); }, itemMeta: function (r) { return r.url || ''; },
      defaults: function (ctx) { return { kind: ctx.filter || 'sponsor', sort: 20 }; },
      fields: [
        { k: 'name', l: 'Nom', t: 'text' }, { k: 'kind', l: 'Type', t: 'select', options: PARTNER_KINDS },
        { k: 'url', l: 'Site web', t: 'url' }, { k: 'sort', l: 'Ordre', t: 'number' },
        { k: 'logo_url', l: 'Logo', t: 'image', full: 1, req: 1 }
      ]
    },
    gallery: {
      title: 'Galerie', intro: 'Les photos de la section « En images » de la page Parcours.',
      table: 'marcilly_gallery', order: [['sort', true]], thumb: 'image_url',
      itemTitle: function (r) { return esc(r.caption || 'Photo'); }, itemMeta: function () { return ''; },
      defaults: function () { return { sort: 10 }; },
      fields: [{ k: 'image_url', l: 'Photo', t: 'image', req: 1, full: 1 }, { k: 'caption', l: 'Légende', t: 'text' }, { k: 'sort', l: 'Ordre', t: 'number' }]
    },
    blocks: {
      title: 'Textes des pages', intro: 'Les titres, textes et images des grandes sections du site, page par page.',
      table: 'marcilly_blocks', order: [['page', true], ['sort', true]], pk: 'key', noCreate: true, noDelete: true,
      filter: { k: 'page', options: [['', 'Toutes les pages']].concat(PAGES), apply: function (rows, v) { return v ? rows.filter(function (r) { return r.page === v; }) : rows; } },
      group: function (r) { return label(PAGES, r.page); }, thumb: 'image_url',
      itemTitle: function (r) { return esc(r.title || r.key); }, itemMeta: function (r) { return (r.label || '') + (r.body ? ' — ' + r.body.slice(0, 120) : ''); },
      fields: [
        { k: 'label', l: 'Emplacement', t: 'readonly', full: 1 },
        { k: 'title', l: 'Titre', t: 'text', full: 1 },
        { k: 'body', l: 'Texte', t: 'md', full: 1 },
        { k: 'image_url', l: 'Image', t: 'image', full: 1 }
      ]
    }
  };

  var SETTINGS = [
    { key: 'announcement', title: 'Bandeau d\'annonce', help: 'Bande rouge en haut de toutes les pages, pour une promo ou une info importante.', fields: [{ k: 'enabled', l: 'Afficher le bandeau', t: 'bool' }, { k: 'text', l: 'Texte', t: 'text', full: 1 }, { k: 'link', l: 'Lien', t: 'text', help: 'Ex. tarifs.html ou https://…' }, { k: 'link_label', l: 'Texte du lien', t: 'text' }] },
    { key: 'contact', title: 'Coordonnées', fields: [{ k: 'address1', l: 'Adresse', t: 'text' }, { k: 'address2', l: 'Code postal et ville', t: 'text' }, { k: 'phone', l: 'Téléphone', t: 'text' }, { k: 'email', l: 'E-mail', t: 'text' }] },
    { key: 'hours', title: 'Horaires de l\'accueil', fields: [{ k: 'weekdays', l: 'Lundi au vendredi', t: 'text' }, { k: 'saturday', l: 'Samedi', t: 'text' }, { k: 'sunday', l: 'Dimanche', t: 'text' }] },
    { key: 'restaurant_hours', title: 'Horaires du restaurant', fields: [{ k: 'weekdays', l: 'Lundi au vendredi', t: 'text' }, { k: 'weekend', l: 'Samedi et dimanche', t: 'text' }] },
    { key: 'links', title: 'Liens de réservation et compétitions', fields: [{ k: 'booking', l: 'Réservation des départs', t: 'url', full: 1 }, { k: 'leclub', l: 'Green fee LeClub', t: 'url', full: 1 }, { k: 'departs', l: 'Départs FFGolf', t: 'url', full: 1 }, { k: 'resultats', l: 'Résultats FFGolf', t: 'url', full: 1 }, { k: 'plaquette', l: 'Plaquette tarifaire (image ou PDF)', t: 'image', full: 1 }] },
    { key: 'socials', title: 'Réseaux sociaux et newsletter', fields: [{ k: 'instagram', l: 'Instagram', t: 'url', full: 1 }, { k: 'facebook', l: 'Facebook', t: 'url', full: 1 }, { k: 'tiktok', l: 'TikTok', t: 'url', full: 1 }, { k: 'newsletter', l: 'Inscription newsletter', t: 'url', full: 1 }] },
    { key: 'images', title: 'Logo et images principales', fields: [{ k: 'logo_navy', l: 'Logo (silhouette, fond transparent)', t: 'image', full: 1, help: 'Utilisé comme masque : seules les formes comptent, la couleur est appliquée par le site.' }, { k: 'hero', l: 'Grande image par défaut', t: 'image', full: 1 }, { k: 'aerial', l: 'Vue aérienne', t: 'image', full: 1 }] },
    { key: 'legal', title: 'Mentions légales', fields: [{ k: 'company', l: 'Société', t: 'text', full: 1 }, { k: 'rcs', l: 'RCS', t: 'text' }, { k: 'siret', l: 'SIRET', t: 'text' }, { k: 'tva', l: 'TVA', t: 'text' }, { k: 'director', l: 'Directeur de la publication', t: 'text' }] }
  ];

  var NAV = [
    ['dashboard', 'Tableau de bord'], ['messages', 'Messages'], 'sep',
    ['posts', 'Actualités'], ['events', 'Compétitions'], ['prices', 'Tarifs et carte'], 'sep',
    ['blocks', 'Textes des pages'], ['courses', 'Parcours'], ['people', 'Équipe'], ['partners', 'Partenaires'], ['gallery', 'Galerie'], 'sep',
    ['settings', 'Infos pratiques'], ['media', 'Médiathèque']
  ];

  /* ------------------------------------------------------------
     Authentification
     ------------------------------------------------------------ */
  var USER = null, CURRENT = 'dashboard', newCount = 0;

  function showLogin(mode) {
    $('#app').hidden = true; $('#login').hidden = false;
    $('#login-form').hidden = mode === 'newpw'; $('#newpw-form').hidden = mode !== 'newpw';
    $('#login-sub').textContent = mode === 'newpw' ? 'Choisissez votre nouveau mot de passe.' : 'Connectez-vous pour mettre à jour le site du Golf de Marcilly.';
  }
  function setStatus(el, msg, ok) { el.hidden = !msg; el.textContent = msg || ''; el.className = 'status ' + (ok ? 'ok' : 'err'); }

  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#login-btn'); btn.disabled = true; setStatus($('#login-status'), '');
    sb.auth.signInWithPassword({ email: $('#l-email').value.trim(), password: $('#l-pass').value }).then(function (r) {
      btn.disabled = false;
      if (r.error) { setStatus($('#login-status'), r.error.message === 'Invalid login credentials' ? 'E-mail ou mot de passe incorrect.' : r.error.message); return; }
      enter(r.data.user);
    });
  });
  $('#forgot-btn').addEventListener('click', function () {
    var email = $('#l-email').value.trim();
    if (!email) { setStatus($('#login-status'), 'Saisissez d\'abord votre e-mail ci-dessus.'); $('#l-email').focus(); return; }
    sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0].split('?')[0] }).then(function (r) {
      setStatus($('#login-status'), r.error ? r.error.message : 'Un e-mail de réinitialisation vient de vous être envoyé.', !r.error);
    });
  });
  $('#newpw-form').addEventListener('submit', function (e) {
    e.preventDefault();
    sb.auth.updateUser({ password: $('#n-pass').value }).then(function (r) {
      if (r.error) return setStatus($('#newpw-status'), r.error.message);
      setStatus($('#newpw-status'), 'Mot de passe enregistré.', true);
      setTimeout(function () { enter(r.data.user); }, 800);
    });
  });
  $('#logout').addEventListener('click', function () { sb.auth.signOut().then(function () { USER = null; showLogin(); }); });
  $('#menu-btn').addEventListener('click', function () { var s = $('#side'); s.classList.toggle('is-open'); this.setAttribute('aria-expanded', s.classList.contains('is-open')); });

  sb.auth.onAuthStateChange(function (ev, session) {
    if (ev === 'PASSWORD_RECOVERY') showLogin('newpw');
  });
  sb.auth.getSession().then(function (r) {
    if (/type=recovery/.test(location.hash)) return showLogin('newpw');
    if (r.data.session) enter(r.data.session.user); else showLogin();
  });

  function enter(user) {
    sb.rpc('marcilly_is_admin').then(function (r) {
      if (r.error || !r.data) {
        showLogin(); setStatus($('#login-status'), 'Ce compte n\'a pas les droits d\'administration du site Marcilly.');
        sb.auth.signOut(); return;
      }
      USER = user; $('#login').hidden = true; $('#app').hidden = false;
      $('#who').textContent = user.email;
      renderNav(); go(location.hash.replace('#', '') || 'dashboard');
      refreshBadge();
    });
  }

  function renderNav() {
    $('#side-nav').innerHTML = NAV.map(function (n) {
      if (n === 'sep') return '<div class="side__sep"></div>';
      return '<button data-go="' + n[0] + '"' + (CURRENT === n[0] ? ' aria-current="page"' : '') + '><span>' + n[1] + '</span>' + (n[0] === 'messages' && newCount ? '<span class="badge">' + newCount + '</span>' : '') + '</button>';
    }).join('');
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) { go(b.dataset.go); $('#side').classList.remove('is-open'); } });
  function refreshBadge() { sb.from('marcilly_messages').select('id', { count: 'exact', head: true }).eq('status', 'nouveau').then(function (r) { newCount = r.count || 0; renderNav(); }); }

  function go(name) {
    if (!SECTIONS[name] && ['dashboard', 'messages', 'settings', 'media'].indexOf(name) < 0) name = 'dashboard';
    CURRENT = name; history.replaceState(null, '', '#' + name); renderNav(); window.scrollTo(0, 0);
    if (name === 'dashboard') return viewDashboard();
    if (name === 'messages') return viewMessages();
    if (name === 'settings') return viewSettings();
    if (name === 'media') return viewMedia();
    viewTable(name);
  }

  function header(title, intro, actions) {
    return '<div class="topbar"><div><h1>' + esc(title) + '</h1>' + (intro ? '<p>' + esc(intro) + '</p>' : '') + '</div><div class="row">' + (actions || '') + '</div></div>';
  }

  /* ------------------------------------------------------------
     Tableau de bord
     ------------------------------------------------------------ */
  function viewDashboard() {
    var m = $('#main');
    m.innerHTML = header('Bonjour !', 'Que voulez-vous mettre à jour aujourd\'hui ?', '<a class="btn btn--ghost" href="../index.html" target="_blank" rel="noopener">Voir le site</a>') + '<div class="grid" id="stats"></div>' +
      '<h2 style="font-size:1.2rem;margin:2rem 0 1rem">Raccourcis</h2><div class="row">' +
      '<button class="btn btn--red" data-new="posts">Écrire une actualité</button><button class="btn" data-new="events">Ajouter une compétition</button><button class="btn btn--ghost" data-go="settings">Modifier le bandeau d\'annonce</button><button class="btn btn--ghost" data-go="prices">Mettre à jour un tarif</button></div>' +
      '<h2 style="font-size:1.2rem;margin:2rem 0 1rem">Prochaines compétitions</h2><div class="list" id="dash-events"></div>';
    var t = new Date().toISOString().slice(0, 10);
    Promise.all([
      sb.from('marcilly_messages').select('id', { count: 'exact', head: true }).eq('status', 'nouveau'),
      sb.from('marcilly_events').select('id', { count: 'exact', head: true }).gte('date', t),
      sb.from('marcilly_posts').select('id', { count: 'exact', head: true }),
      sb.from('marcilly_events').select('*').gte('date', t).order('date').limit(5)
    ]).then(function (r) {
      $('#stats').innerHTML =
        '<div class="card stat"><b>' + (r[0].count || 0) + '</b><span>nouveau(x) message(s)</span><a href="#messages" data-go="messages">Lire les messages</a></div>' +
        '<div class="card stat"><b>' + (r[1].count || 0) + '</b><span>compétitions à venir</span><a href="#events" data-go="events">Gérer le calendrier</a></div>' +
        '<div class="card stat"><b>' + (r[2].count || 0) + '</b><span>actualités publiées</span><a href="#posts" data-go="posts">Gérer les actualités</a></div>';
      var ev = r[3].data || [];
      $('#dash-events').innerHTML = ev.length ? ev.map(function (e) { return '<div class="item"><div class="item__thumb">' + SECTIONS.events.thumb(e) + '</div><div><div class="item__title">' + esc(e.title) + '</div><div class="item__meta">' + esc(SECTIONS.events.itemMeta(e)) + '</div></div><div></div></div>'; }).join('') : '<p class="empty">Aucune compétition à venir. Ajoutez la prochaine saison !</p>';
    });
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-new]'); if (b) { go(b.dataset.new); setTimeout(function () { openEditor(b.dataset.new, null); }, 50); } });

  /* ------------------------------------------------------------
     Listes génériques
     ------------------------------------------------------------ */
  var STATE = {};
  function viewTable(name) {
    var cfg = SECTIONS[name]; var st = STATE[name] = STATE[name] || { q: '', filter: cfg.filter ? cfg.filter.options[0][0] : '' };
    var m = $('#main');
    m.innerHTML = header(cfg.title, cfg.intro, cfg.noCreate ? '' : '<button class="btn btn--red" id="add">Ajouter</button>') +
      '<div class="toolbar">' + (cfg.search ? '<input type="search" id="q" placeholder="Rechercher…" value="' + esc(st.q) + '">' : '') +
      (cfg.filter ? '<select id="flt">' + cfg.filter.options.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === st.filter ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>' : '') +
      '<span id="count" style="color:var(--muted);font-size:.88rem"></span></div><div class="list" id="list"><p class="empty">Chargement…</p></div>';
    if (!cfg.noCreate) $('#add').addEventListener('click', function () { openEditor(name, null); });
    if ($('#q')) $('#q').addEventListener('input', function () { st.q = this.value; draw(); });
    if ($('#flt')) $('#flt').addEventListener('change', function () { st.filter = this.value; draw(); });
    var rows = [];
    var qb = sb.from(cfg.table).select('*');
    cfg.order.forEach(function (o) { qb = qb.order(o[0], { ascending: o[1] }); });
    qb.then(function (r) { if (r.error) { $('#list').innerHTML = '<p class="empty">Erreur : ' + esc(r.error.message) + '</p>'; return; } rows = r.data; STATE[name].rows = rows; draw(); });
    function draw() {
      var list = rows;
      if (cfg.filter) list = cfg.filter.apply(list, st.filter);
      if (st.q) { var q = st.q.toLowerCase(); list = list.filter(function (r) { return cfg.search.some(function (k) { return String(r[k] || '').toLowerCase().indexOf(q) > -1; }); }); }
      $('#count').textContent = list.length + ' élément' + (list.length > 1 ? 's' : '');
      if (!list.length) { $('#list').innerHTML = '<p class="empty">Rien ici pour le moment.' + (cfg.noCreate ? '' : ' Cliquez sur « Ajouter ».') + '</p>'; return; }
      var html = '', lastGroup = null;
      list.forEach(function (r) {
        if (cfg.group) { var g = cfg.group(r); if (g !== lastGroup) { html += '<div class="group-title">' + esc(g) + '</div>'; lastGroup = g; } }
        var th = typeof cfg.thumb === 'function' ? '<div class="item__thumb">' + cfg.thumb(r) + '</div>' : '<div class="item__thumb" style="background-image:url(\'' + esc(r[cfg.thumb] || '') + '\')"></div>';
        var id = r[cfg.pk || 'id'];
        html += '<div class="item">' + th + '<div style="min-width:0"><div class="item__title">' + cfg.itemTitle(r) + '</div><div class="item__meta">' + esc(cfg.itemMeta(r)) + '</div></div>' +
          '<div class="row"><button class="btn btn--sm btn--ghost" data-edit="' + esc(id) + '">Modifier</button>' + (cfg.duplicate ? '<button class="btn btn--sm btn--ghost" data-dup="' + esc(id) + '" title="Dupliquer">Dupliquer</button>' : '') + '</div></div>';
      });
      $('#list').innerHTML = html;
    }
    $('#list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-edit],[data-dup]'); if (!b) return;
      var id = b.dataset.edit || b.dataset.dup; var row = rows.find(function (r) { return String(r[cfg.pk || 'id']) === id; });
      if (b.dataset.dup) { var c = Object.assign({}, row); delete c.id; delete c.updated_at; c.title && (c.title = c.title); openEditor(name, null, c); }
      else openEditor(name, row);
    });
  }

  /* ------------------------------------------------------------
     Éditeur (panneau latéral)
     ------------------------------------------------------------ */
  function fieldHtml(f, v) {
    var id = 'f-' + f.k, req = f.req ? ' required' : '', help = f.help ? '<small>' + esc(f.help) + '</small>' : '';
    var cls = 'field' + (f.full ? ' full' : '');
    if (v == null) v = '';
    switch (f.t) {
      case 'readonly': return '<div class="' + cls + '"><span class="label">' + esc(f.l) + '</span><div>' + esc(v) + '</div></div>';
      case 'textarea': return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.l) + '</label><textarea id="' + id + '" name="' + f.k + '"' + req + '>' + esc(v) + '</textarea>' + help + '</div>';
      case 'md': return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.l) + '</label><textarea class="md" id="' + id + '" name="' + f.k + '"' + req + '>' + esc(v) + '</textarea><small>' + MD_HELP + '</small></div>';
      case 'bool': return '<div class="' + cls + '" style="align-self:end"><label class="check"><input type="checkbox" name="' + f.k + '"' + (v ? ' checked' : '') + '> ' + esc(f.l) + '</label>' + help + '</div>';
      case 'select': return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.l) + '</label><select id="' + id + '" name="' + f.k + '">' + f.options.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>' + help + '</div>';
      case 'number': return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.l) + '</label><input type="number" id="' + id + '" name="' + f.k + '" value="' + esc(v) + '"' + req + '>' + help + '</div>';
      case 'date': return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.l) + '</label><input type="date" id="' + id + '" name="' + f.k + '" value="' + esc(String(v).slice(0, 10)) + '"' + req + '>' + help + '</div>';
      case 'datetime': var dv = v ? toLocalInput(v) : ''; return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.l) + '</label><input type="datetime-local" id="' + id + '" name="' + f.k + '" value="' + dv + '"' + req + '>' + help + '</div>';
      case 'image': return '<div class="' + cls + '"><span class="label">' + esc(f.l) + '</span><div class="imgfield"><div class="imgfield__prev" style="background-image:url(\'' + esc(v) + '\')"></div><div><input type="url" name="' + f.k + '" value="' + esc(v) + '" placeholder="https://…"' + req + ' aria-label="' + esc(f.l) + ' (adresse)"><div class="row"><label class="btn btn--sm">Téléverser<input type="file" accept="image/*,application/pdf" hidden data-upload="' + f.k + '"></label><button type="button" class="btn btn--sm btn--ghost" data-pick="' + f.k + '">Médiathèque</button>' + (v ? '<button type="button" class="btn btn--sm btn--danger" data-clear="' + f.k + '">Retirer</button>' : '') + '</div>' + help + '</div></div></div>';
      default: return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.l) + '</label><input type="' + (f.t === 'url' ? 'url' : 'text') + '" id="' + id + '" name="' + f.k + '" value="' + esc(v) + '"' + req + '>' + help + '</div>';
    }
  }
  function toLocalInput(v) { var d = new Date(v); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
  function readForm(form, fields) {
    var o = {};
    fields.forEach(function (f) {
      if (f.t === 'readonly') return;
      var el = form.elements[f.k]; if (!el) return;
      if (f.t === 'bool') o[f.k] = el.checked;
      else if (f.t === 'number') o[f.k] = el.value === '' ? null : Number(el.value);
      else if (f.t === 'datetime') o[f.k] = el.value ? new Date(el.value).toISOString() : null;
      else if (f.t === 'date') o[f.k] = el.value || null;
      else o[f.k] = el.value.trim() === '' ? null : el.value.trim();
    });
    return o;
  }

  function bindImageFields(scope) {
    scope.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-upload]'); if (!inp || !inp.files[0]) return;
      var k = inp.dataset.upload, btn = inp.parentElement; btn.textContent = 'Envoi…';
      uploadFile(inp.files[0]).then(function (url) { setImage(scope, k, url); toast('Image envoyée'); }).catch(function (err) { toast('Échec de l\'envoi : ' + err.message, true); }).then(function () { btn.innerHTML = 'Téléverser<input type="file" accept="image/*,application/pdf" hidden data-upload="' + k + '">'; });
    });
    scope.addEventListener('click', function (e) {
      var p = e.target.closest('[data-pick]'); if (p) { pickMedia().then(function (url) { if (url) setImage(scope, p.dataset.pick, url); }); }
      var c = e.target.closest('[data-clear]'); if (c) { setImage(scope, c.dataset.clear, ''); }
    });
    scope.addEventListener('input', function (e) { if (e.target.type === 'url' && e.target.closest('.imgfield')) { e.target.closest('.imgfield').querySelector('.imgfield__prev').style.backgroundImage = 'url("' + e.target.value + '")'; } });
  }
  function setImage(scope, k, url) {
    var inp = scope.querySelector('input[name="' + k + '"]'); inp.value = url;
    inp.closest('.imgfield').querySelector('.imgfield__prev').style.backgroundImage = 'url("' + url + '")';
  }

  function openEditor(name, row, preset) {
    var cfg = SECTIONS[name]; var isNew = !row;
    var data = row || Object.assign({}, cfg.defaults ? cfg.defaults({ filter: (STATE[name] || {}).filter }) : {}, preset || {});
    var bg = document.createElement('div'); bg.className = 'drawer-bg';
    var d = document.createElement('aside'); d.className = 'drawer'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = '<header><h2>' + (isNew ? 'Ajouter' : 'Modifier') + ' — ' + esc(cfg.title) + '</h2><button class="x" aria-label="Fermer">×</button></header>' +
      '<form class="body" novalidate><div class="form-grid">' + cfg.fields.map(function (f) { return fieldHtml(f, data[f.k]); }).join('') + '</div></form>' +
      '<footer><div>' + (!isNew && !cfg.noDelete ? '<button class="btn btn--danger" data-del>Supprimer</button>' : '') + '</div><div class="row"><button class="btn btn--ghost" data-close>Annuler</button><button class="btn btn--red" data-save>Enregistrer</button></div></footer>';
    document.body.appendChild(bg); document.body.appendChild(d);
    var form = $('form', d); bindImageFields(form);
    var first = $('input:not([type=hidden]),textarea,select', form); if (first) first.focus();
    function close() { d.remove(); bg.remove(); document.removeEventListener('keydown', esc_); }
    function esc_(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc_);
    bg.addEventListener('click', close); $('.x', d).addEventListener('click', close); $('[data-close]', d).addEventListener('click', close);
    $('[data-save]', d).addEventListener('click', function () {
      var missing = cfg.fields.filter(function (f) { return f.req && !(form.elements[f.k] && String(form.elements[f.k].value).trim()); });
      if (missing.length) { toast('À remplir : ' + missing.map(function (f) { return f.l; }).join(', '), true); return; }
      var o = readForm(form, cfg.fields);
      if (cfg.beforeSave) cfg.beforeSave(o);
      var btn = this; btn.disabled = true;
      var pk = cfg.pk || 'id';
      var req = isNew ? sb.from(cfg.table).insert(o) : sb.from(cfg.table).update(o).eq(pk, row[pk]);
      req.then(function (r) {
        btn.disabled = false;
        if (r.error) { toast(r.error.code === '23505' ? 'Cette adresse de page existe déjà, changez-la.' : 'Erreur : ' + r.error.message, true); return; }
        toast('Enregistré, le site est à jour'); close(); viewTable(name);
      });
    });
    var del = $('[data-del]', d);
    if (del) del.addEventListener('click', function () {
      confirmBox('Supprimer définitivement cet élément du site ?').then(function (ok) {
        if (!ok) return;
        sb.from(cfg.table).delete().eq(cfg.pk || 'id', row[cfg.pk || 'id']).then(function (r) { if (r.error) return toast('Erreur : ' + r.error.message, true); toast('Supprimé'); close(); viewTable(name); });
      });
    });
  }

  /* ------------------------------------------------------------
     Messages (contact + devis)
     ------------------------------------------------------------ */
  function viewMessages() {
    var st = STATE.messages = STATE.messages || { f: 'actifs' };
    $('#main').innerHTML = header('Messages', 'Demandes reçues par les formulaires de contact et de devis.') +
      '<div class="toolbar"><select id="mf"><option value="actifs">Nouveaux et traités</option><option value="nouveau">Nouveaux</option><option value="archivé">Archivés</option><option value="tous">Tous</option></select></div><div class="list" id="msgs"><p class="empty">Chargement…</p></div>';
    $('#mf').value = st.f;
    $('#mf').addEventListener('change', function () { st.f = this.value; load(); });
    function load() {
      var qb = sb.from('marcilly_messages').select('*').order('created_at', { ascending: false });
      if (st.f === 'actifs') qb = qb.neq('status', 'archivé'); else if (st.f !== 'tous') qb = qb.eq('status', st.f);
      qb.then(function (r) {
        var l = r.data || [];
        if (!l.length) { $('#msgs').innerHTML = '<p class="empty">Aucun message dans cette liste.</p>'; return; }
        $('#msgs').innerHTML = l.map(function (m) {
          var pill = m.status === 'nouveau' ? 'pill--new' : m.status === 'traité' ? 'pill--ok' : 'pill--off';
          return '<div class="msg' + (m.status === 'nouveau' ? ' is-new' : '') + '"><div class="msg__head"><div><strong>' + esc(m.name) + '</strong> <span class="pill">' + (m.kind === 'devis' ? 'Devis' : 'Contact') + '</span><span class="pill ' + pill + '">' + esc(m.status) + '</span></div><small style="color:var(--muted)">' + new Date(m.created_at).toLocaleString('fr-FR') + '</small></div>' +
            '<div style="font-size:.9rem"><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a>' + (m.phone ? ' — <a href="tel:' + esc(m.phone) + '">' + esc(m.phone) + '</a>' : '') + (m.participants ? ' — ' + m.participants + ' participants' : '') + (m.wished_date ? ' — le ' + fmtDate(m.wished_date) : '') + '</div>' +
            '<div class="msg__text">' + esc(m.message) + '</div>' +
            '<div class="row"><a class="btn btn--sm" href="mailto:' + esc(m.email) + '?subject=' + encodeURIComponent('Golf de Marcilly — votre ' + (m.kind === 'devis' ? 'demande de devis' : 'message')) + '">Répondre</a>' +
            (m.status !== 'traité' ? '<button class="btn btn--sm btn--ghost" data-st="traité" data-id="' + m.id + '">Marquer traité</button>' : '') +
            (m.status !== 'archivé' ? '<button class="btn btn--sm btn--ghost" data-st="archivé" data-id="' + m.id + '">Archiver</button>' : '<button class="btn btn--sm btn--ghost" data-st="nouveau" data-id="' + m.id + '">Restaurer</button>') +
            '<button class="btn btn--sm btn--danger" data-delmsg="' + m.id + '">Supprimer</button></div></div>';
        }).join('');
      });
    }
    $('#msgs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-st]');
      if (b) sb.from('marcilly_messages').update({ status: b.dataset.st }).eq('id', b.dataset.id).then(function (r) { if (r.error) return toast(r.error.message, true); toast('Message mis à jour'); load(); refreshBadge(); });
      var dl = e.target.closest('[data-delmsg]');
      if (dl) confirmBox('Supprimer définitivement ce message ?').then(function (ok) { if (ok) sb.from('marcilly_messages').delete().eq('id', dl.dataset.delmsg).then(function () { toast('Message supprimé'); load(); refreshBadge(); }); });
    });
    load();
  }

  /* ------------------------------------------------------------
     Infos pratiques (réglages)
     ------------------------------------------------------------ */
  function viewSettings() {
    $('#main').innerHTML = header('Infos pratiques', 'Coordonnées, horaires, liens et bandeau d\'annonce : modifiés ici, ils changent partout sur le site.') + '<div id="sets" style="display:grid;gap:1.2rem"><p class="empty">Chargement…</p></div>';
    sb.from('marcilly_settings').select('*').then(function (r) {
      var vals = {}; (r.data || []).forEach(function (x) { vals[x.key] = x.value || {}; });
      $('#sets').innerHTML = SETTINGS.map(function (s) {
        var v = vals[s.key] || {};
        return '<form class="card" data-key="' + s.key + '"><h2 style="font-size:1.15rem;margin-bottom:.3rem">' + esc(s.title) + '</h2>' + (s.help ? '<p style="margin:0 0 1rem;color:var(--muted)">' + esc(s.help) + '</p>' : '<div style="height:.8rem"></div>') +
          '<div class="form-grid">' + s.fields.map(function (f) { return fieldHtml(Object.assign({}, f, { k: f.k }), v[f.k]); }).join('') + '</div><div class="row" style="justify-content:flex-end;margin-top:1rem"><button class="btn btn--red" type="submit">Enregistrer</button></div></form>';
      }).join('');
      $$('#sets form').forEach(function (form) {
        bindImageFields(form);
        // identifiants uniques par formulaire
        $$('[id^="f-"]', form).forEach(function (el) { var nid = el.id + '-' + form.dataset.key; var lab = $('label[for="' + el.id + '"]', form); if (lab) lab.setAttribute('for', nid); el.id = nid; });
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var s = SETTINGS.find(function (x) { return x.key === form.dataset.key; });
          var o = Object.assign({}, vals[s.key] || {}, readForm(form, s.fields));
          Object.keys(o).forEach(function (k) { if (o[k] === null) o[k] = ''; });
          sb.from('marcilly_settings').upsert({ key: s.key, value: o }).then(function (r) { if (r.error) return toast('Erreur : ' + r.error.message, true); vals[s.key] = o; toast(s.title + ' : enregistré'); });
        });
      });
    });
  }

  /* ------------------------------------------------------------
     Médiathèque (Supabase Storage)
     ------------------------------------------------------------ */
  function publicUrl(path) { return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl; }
  function uploadFile(file) {
    if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error('fichier trop lourd (15 Mo max)'));
    var d = new Date(); var path = 'uploads/' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '/' + Date.now().toString(36) + '-' + slugify(file.name.replace(/\.[^.]+$/, '')) + (file.name.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
    return maybeCompress(file).then(function (blob) {
      return sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || file.type, upsert: false });
    }).then(function (r) { if (r.error) throw r.error; return publicUrl(path); });
  }
  // réduit les grosses photos (> 2400 px) avant envoi
  function maybeCompress(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 900 * 1024) return Promise.resolve(file);
    return new Promise(function (res) {
      var img = new Image(); img.onload = function () {
        var s = Math.min(1, 2400 / Math.max(img.width, img.height));
        if (s === 1 && file.type !== 'image/png') { res(file); return; }
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        var hasAlpha = file.type === 'image/png';
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { res(b && b.size < file.size ? b : file); }, hasAlpha ? 'image/png' : 'image/jpeg', .85);
      }; img.onerror = function () { res(file); }; img.src = URL.createObjectURL(file);
    });
  }
  function listMedia() {
    return Promise.all(['uploads', 'import'].map(function (folder) {
      return sb.storage.from(BUCKET).list(folder, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }).then(function (r) {
        var out = [], subs = [];
        (r.data || []).forEach(function (f) { if (f.id) out.push({ path: folder + '/' + f.name, name: f.name, size: f.metadata && f.metadata.size, at: f.created_at }); else subs.push(folder + '/' + f.name); });
        return Promise.all(subs.map(function (s) { return sb.storage.from(BUCKET).list(s, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }).then(function (r2) { (r2.data || []).forEach(function (f) { if (f.id) out.push({ path: s + '/' + f.name, name: f.name, size: f.metadata && f.metadata.size, at: f.created_at }); }); }); })).then(function () { return out; });
      });
    })).then(function (a) { return a[0].concat(a[1]); });
  }
  function mediaCard(f, pick) {
    var url = publicUrl(f.path), isPdf = /\.pdf$/i.test(f.name);
    return '<div class="media' + (pick ? ' is-pick' : '') + '" data-url="' + esc(url) + '" data-path="' + esc(f.path) + '"><div class="media__img" style="background-image:url(\'' + (isPdf ? '' : esc(url)) + '\')">' + (isPdf ? '<b style="display:grid;place-items:center;height:100%">PDF</b>' : '') + '</div><div class="media__info"><span title="' + esc(f.name) + '">' + esc(f.name) + '</span>' +
      (pick ? '' : '<div class="row"><button class="btn btn--sm btn--ghost" data-copy>Copier le lien</button>' + (f.path.indexOf('uploads/') === 0 ? '<button class="btn btn--sm btn--danger" data-delfile>Suppr.</button>' : '') + '</div>') + '</div></div>';
  }
  function viewMedia() {
    $('#main').innerHTML = header('Médiathèque', 'Toutes les images du site. Les nouvelles photos sont réduites automatiquement avant l\'envoi.') +
      '<label class="dropzone" id="dz"><strong>Glissez vos photos ici</strong> ou cliquez pour choisir des fichiers<input type="file" id="files" multiple accept="image/*,application/pdf" hidden></label><div class="media-grid" id="mg"><p class="empty">Chargement…</p></div>';
    function load() { listMedia().then(function (l) { $('#mg').innerHTML = l.length ? l.map(function (f) { return mediaCard(f); }).join('') : '<p class="empty">Aucun fichier.</p>'; }); }
    function send(files) {
      files = Array.prototype.slice.call(files); if (!files.length) return;
      toast('Envoi de ' + files.length + ' fichier(s)…');
      Promise.all(files.map(function (f) { return uploadFile(f).catch(function (e) { toast(f.name + ' : ' + e.message, true); }); })).then(function () { toast('Envoi terminé'); load(); });
    }
    var dz = $('#dz');
    $('#files').addEventListener('change', function () { send(this.files); this.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-over'); }); });
    dz.addEventListener('drop', function (e) { send(e.dataTransfer.files); });
    $('#mg').addEventListener('click', function (e) {
      var card = e.target.closest('.media'); if (!card) return;
      if (e.target.closest('[data-copy]')) { navigator.clipboard.writeText(card.dataset.url).then(function () { toast('Lien copié'); }); }
      if (e.target.closest('[data-delfile]')) confirmBox('Supprimer ce fichier ? Vérifiez qu\'il n\'est plus utilisé sur le site.').then(function (ok) { if (ok) sb.storage.from(BUCKET).remove([card.dataset.path]).then(function (r) { if (r.error) return toast(r.error.message, true); toast('Fichier supprimé'); load(); }); });
    });
    load();
  }
  function pickMedia() {
    return new Promise(function (res) {
      var w = document.createElement('div'); w.className = 'confirm';
      w.innerHTML = '<div class="card" style="max-width:900px;width:100%;max-height:85vh;overflow:auto"><div class="row" style="justify-content:space-between"><h2 style="font-size:1.2rem">Choisir une image</h2><button class="x" aria-label="Fermer">×</button></div><div class="media-grid" id="pk"><p class="empty">Chargement…</p></div></div>';
      document.body.appendChild(w);
      listMedia().then(function (l) { $('#pk', w).innerHTML = l.map(function (f) { return mediaCard(f, true); }).join(''); });
      w.addEventListener('click', function (e) {
        var c = e.target.closest('.media'); if (c) { w.remove(); res(c.dataset.url); return; }
        if (e.target === w || e.target.closest('.x')) { w.remove(); res(null); }
      });
    });
  }
})();

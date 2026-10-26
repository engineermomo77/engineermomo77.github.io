(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};

/* ---------- Theme ---------- */
const root = document.documentElement;
const saved = store.get('theme');
if (saved) root.dataset.theme = saved;
else if (matchMedia('(prefers-color-scheme: light)').matches) root.dataset.theme = 'light';
let palette = {};
const readPalette = () => palette = { hot: css('--hot'), sig: css('--sig'), sun: css('--sun'), ink: css('--ink'), line: css('--line'), bg: css('--bg') };
$('#theme').addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  store.set('theme', root.dataset.theme);
  setTimeout(readPalette, 50);
});
readPalette();

/* ---------- Scroll: progress, nav, active link ---------- */
const nav = $('#nav'), bar = $('#progress');
const navLinks = $$('.links a');
const secs = navLinks.map(a => $(a.getAttribute('href')));
const tl = $('#tl'), fill = $('#tl-fill');
function onScroll() {
  const h = document.documentElement;
  bar.style.width = (h.scrollTop / (h.scrollHeight - innerHeight) * 100) + '%';
  nav.classList.toggle('stuck', h.scrollTop > 20);
  const y = innerHeight * .4;
  secs.forEach((s, i) => {
    const r = s.getBoundingClientRect();
    navLinks[i].classList.toggle('on', r.top < y && r.bottom > y);
  });
  const r = tl.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, (innerHeight * .6 - r.top) / r.height));
  fill.style.height = (p * 100) + '%';
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Reveal + counters ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  io.unobserve(e.target);
  if (e.target.id === 'stats') $$('[data-count]', e.target).forEach(countUp);
}), { threshold: .15 });
$$('.reveal').forEach(el => io.observe(el));
function countUp(el) {
  const to = +el.dataset.count;
  if (reduced) { el.textContent = to; return; }
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / 1100);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

/* ---------- Typed line ---------- */
const phrases = [
  'des API Spring Boot sécurisées par JWT',
  'des consoles de dispatch en temps réel',
  'des apps Flutter publiées sur Google Play',
  'des firmwares C/C++ sur STM32',
  'des pipelines GitLab CI/CD',
  'des systèmes de sécurité embarqués'
];
const typed = $('#typed');
if (reduced) typed.textContent = phrases[0];
else {
  let pi = 0, ci = 0, del = false;
  (function tick() {
    const p = phrases[pi];
    typed.textContent = p.slice(0, ci);
    if (!del && ci === p.length) { del = true; return setTimeout(tick, 1700); }
    if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; }
    ci += del ? -1 : 1;
    setTimeout(tick, del ? 18 : 42);
  })();
}

/* ---------- Hero: live dispatch map ---------- */
(() => {
  const cv = $('#map'), ctx = cv.getContext('2d');
  const hudFleet = $('#hud-fleet');
  let W, H, dpr, cell, cols, rows, nodes, edges, riders, pins;
  const mouse = { x: -999, y: -999 };
  const rnd = (a, b) => a + Math.random() * (b - a);

  function build() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = W < 700 ? 56 : 78;
    cols = Math.ceil(W / cell) + 1; rows = Math.ceil(H / cell) + 1;
    nodes = []; edges = [];
    const jit = cell * .22;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++)
      nodes.push({ x: i * cell + rnd(-jit, jit), y: j * cell + rnd(-jit, jit), n: [] });
    const at = (i, j) => nodes[j * cols + i];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = at(i, j);
      if (i + 1 < cols && Math.random() > .16) link(a, at(i + 1, j));
      if (j + 1 < rows && Math.random() > .16) link(a, at(i, j + 1));
    }
    function link(a, b) { a.n.push(b); b.n.push(a); edges.push([a, b]); }
    const live = nodes.filter(n => n.n.length > 1);
    pins = Array.from({ length: Math.round(W / 190) }, () => ({ n: live[Math.random() * live.length | 0], ph: rnd(0, 6) }));
    riders = Array.from({ length: Math.round(Math.min(26, W / 55)) }, () => {
      const a = live[Math.random() * live.length | 0];
      return { a, b: a.n[Math.random() * a.n.length | 0], k: Math.random(), v: rnd(.006, .014), prev: null, trail: [], hue: Math.random() < .35 };
    });
    hudFleet.textContent = riders.length + ' livreurs';
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (const [a, b] of edges) {
      const mx = (a.x + b.x) / 2 - mouse.x, my = (a.y + b.y) / 2 - mouse.y;
      const near = Math.max(0, 1 - Math.hypot(mx, my) / 190);
      ctx.strokeStyle = near > 0 ? palette.sig : palette.line;
      ctx.globalAlpha = .55 + near * .45;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of pins) {
      const s = (Math.sin(t / 500 + p.ph) + 1) / 2;
      ctx.strokeStyle = palette.sun; ctx.globalAlpha = .7 * (1 - s);
      ctx.beginPath(); ctx.arc(p.n.x, p.n.y, 5 + s * 18, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = palette.sun;
      ctx.beginPath(); ctx.arc(p.n.x, p.n.y, 3.5, 0, 6.283); ctx.fill();
    }
    for (const r of riders) {
      if (!reduced) r.k += r.v;
      if (r.k >= 1) {
        r.k = 0; r.prev = r.a; r.a = r.b;
        const opts = r.a.n.filter(n => n !== r.prev);
        r.b = (opts.length ? opts : r.a.n)[Math.random() * (opts.length || r.a.n.length) | 0];
      }
      const x = r.a.x + (r.b.x - r.a.x) * r.k, y = r.a.y + (r.b.y - r.a.y) * r.k;
      r.trail.push({ x, y }); if (r.trail.length > 18) r.trail.shift();
      const col = r.hue ? palette.hot : palette.sig;
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (let i = 1; i < r.trail.length; i++) {
        ctx.globalAlpha = i / r.trail.length * .8;
        ctx.beginPath(); ctx.moveTo(r.trail[i - 1].x, r.trail[i - 1].y); ctx.lineTo(r.trail[i].x, r.trail[i].y); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.283); ctx.fill();
    }
    ctx.lineWidth = 1;
    if (mouse.x > 0) {
      ctx.strokeStyle = palette.ink; ctx.globalAlpha = .35;
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 22, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (!reduced) requestAnimationFrame(frame);
  }

  const hero = cv.parentElement;
  hero.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  hero.addEventListener('pointerleave', () => mouse.x = mouse.y = -999);
  // un clic « dépose » une nouvelle commande : un livreur y est envoyé
  hero.addEventListener('click', e => {
    if (e.target.closest('a,button')) return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, d = 1e9;
    for (const n of nodes) { const k = Math.hypot(n.x - x, n.y - y); if (k < d && n.n.length > 1) { d = k; best = n; } }
    pins.push({ n: best, ph: 0 }); if (pins.length > 14) pins.shift();
    const rd = riders[Math.random() * riders.length | 0];
    rd.a = best; rd.b = best.n[0]; rd.k = 0; rd.trail = [];
  });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 150); });
  build(); requestAnimationFrame(frame);
})();

/* ---------- Duality slider ---------- */
(() => {
  const cv = $('#duo-canvas'), ctx = cv.getContext('2d');
  const range = $('#duo-range'), duo = $('#duo'), ps = $('#p-soft'), ph = $('#p-hard');
  let W, H, dpr, t = 0, lines = [];
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lines = Array.from({ length: Math.ceil(H / 22) + 2 }, () => ({ ind: (Math.random() * 4 | 0) * 22, w: 40 + Math.random() * W * .3 }));
  }
  function set() {
    t = range.value / 100;
    duo.dataset.side = t < .5 ? 'soft' : 'hard';
    const so = Math.min(1, Math.max(0, 1 - (t - .35) / .3)), ho = 1 - so;
    for (const [el, o] of [[ps, so], [ph, ho]]) {
      el.style.opacity = o; el.style.pointerEvents = o < .5 ? 'none' : 'auto';
      el.style.filter = `blur(${(1 - o) * 8}px)`; el.style.transform = `translateY(${(1 - o) * 14}px)`;
    }
  }
  let off = 0;
  function draw(ts) {
    ctx.clearRect(0, 0, W, H);
    off = (off + .35) % 22;
    ctx.globalAlpha = (1 - t) * .35; ctx.fillStyle = palette.sig;
    lines.forEach((l, i) => { ctx.fillRect(24 + l.ind, i * 22 - off, l.w, 7); });
    if (t > .02) {
      ctx.globalAlpha = t * .12; ctx.strokeStyle = palette.sun; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.globalAlpha = t * .9; ctx.lineWidth = 2.5; ctx.strokeStyle = palette.sun;
      ctx.beginPath();
      const ph0 = ts / 700;
      for (let x = 0; x <= W; x += 3) {
        const u = x / 70 - ph0, sq = Math.sign(Math.sin(u * 1.2)) * 24, sn = Math.sin(u * 2.2) * 24;
        const y = H * .78 + (x / W > .5 ? sq : sn) * (.4 + t);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(draw);
  }
  range.addEventListener('input', () => { set(); if (reduced) draw(0); });
  addEventListener('resize', () => { size(); if (reduced) draw(0); });
  size(); set(); requestAnimationFrame(draw);
})();

/* ---------- Projects ---------- */
const projects = [
  { id: 'eliyah', kind: 'Plateforme · Livraison', name: 'Eliyah Express', blurb: 'Gestion des livraisons et de flotte, avec console de dispatch et carte en temps réel.',
    ctx: 'Plateforme de gestion des livraisons et de la flotte, utilisée en production.',
    does: ['API Spring Boot / PostgreSQL sécurisées par JWT et services Node.js', 'Console de dispatch Nuxt.js avec carte temps réel', 'Filtres dynamiques sur des données JSONB', 'Refonte de l\'authentification biométrique', 'Résolution d\'incidents en production'],
    stack: ['Spring Boot', 'PostgreSQL', 'JWT', 'Node.js', 'Nuxt.js'], link: 'https://admin.eliyah-express.link2digit.com' },
  { id: 'eliyah-m', kind: 'Mobile · Android & iOS', name: 'Eliyah Express Mobile', blurb: 'L\'application des clients et des livreurs : demande, suivi et position en temps réel.',
    ctx: 'Application Flutter pour les clients et les livreurs d\'Eliyah Express.',
    does: ['Demande et suivi des livraisons en temps réel', 'Cartes OpenStreetMap / Google Maps avec bascule automatique', 'Partage de la position du livreur en arrière-plan', 'Notifications push Firebase (FCM)', 'Mise en production sur Google Play : bundle signé, déclarations de permissions', 'Préparation de la publication iOS : signature, notifications APNs, TestFlight'],
    stack: ['Flutter', 'Dart', 'Firebase', 'Google Play', 'iOS'],
    // iOS : renseigner l'URL App Store dès la publication (ex. https://apps.apple.com/app/id0000000000)
    stores: { play: 'https://play.google.com/store/apps/details?id=com.link2digit.eliya_express', apple: '', appleNote: 'en cours de validation par Apple' } },
  { id: 'pegasus', kind: 'Plateforme · Mobilité électrique', name: 'Pegasus', blurb: 'Motos électriques et stations d\'échange de batteries, côté plateforme et côté client.',
    ctx: 'Plateforme de motos électriques et de stations d\'échange de batteries, avec son application cliente Alioth Mobility.',
    does: ['Co-développement et maintenance de la plateforme et des interfaces d\'administration', 'Alioth Mobility (Flutter, Android & iOS) : échanges de batteries (swaps), recharges, contrats', 'Carte, paiement mobile et portefeuille (wallet)'],
    stack: ['Flutter', 'Dart', 'Nuxt.js', 'Spring Boot'], link: 'https://pegasus.link2digit.com',
    // Alioth Mobility : renseigner les URL Google Play / App Store quand elles sont connues
    stores: { play: 'https://play.google.com/store/apps/details?id=com.alioth.mobility', apple: 'https://apps.apple.com/bf/app/alioth-mobile-app/id6785934335?l=fr-FR' } },
  { id: 'phebus', kind: 'Plateforme · Énergie solaire', name: 'Phebus', blurb: 'Gestion et supervision de kits solaires, de l\'import CSV au déploiement serveur.',
    ctx: 'Gestion et supervision de kits solaires.',
    does: ['Microservice Spring Boot avec Spring Cloud Config', 'Base PostgreSQL et interface d\'administration', 'Déploiement et exploitation sur serveur Linux (Debian, systemd)', 'Import de données CSV'],
    stack: ['Spring Boot', 'PostgreSQL', 'Linux', 'Spring Cloud Config'], link: 'https://phebus.link2digit.com' },
  { id: 'secu', kind: 'Embarqué · Projet de fin d\'études', name: 'Système de sécurité intégré', blurb: 'Intrusion, accès, vidéosurveillance : un système complet piloté par microcontrôleurs.',
    ctx: 'Conçu chez Ecom.High-Tech (mars – septembre 2024).',
    does: ['Détection d\'intrusion', 'Contrôle d\'accès', 'Vidéosurveillance', 'Programmation des microcontrôleurs en C/C++'],
    stack: ['C/C++', 'STM32', 'Arduino', 'Capteurs'] },
  { id: 'yaare', kind: 'Web · E-commerce', name: 'yaare.shop', blurb: 'Site e-commerce complet : catalogue, commandes et base de données.',
    ctx: 'Réalisé en stage chez Ecom.High-Tech (janvier – février 2024).',
    does: ['Catalogue produits', 'Gestion des commandes', 'Base MySQL', 'Développement Laravel (PHP)'],
    stack: ['Laravel', 'PHP', 'MySQL'], link: 'https://yaare.shop' }
];
const grid = $('#grid'), filters = $('#filters');
const allTags = [...new Set(projects.flatMap(p => p.stack))];
const mkChip = (label, val) => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = label; b.dataset.v = val; return b; };
filters.append(mkChip('Tout', ''), ...allTags.map(t => mkChip(t, t)));
filters.firstChild.classList.add('on');
projects.forEach((p, i) => {
  const c = document.createElement('button');
  c.className = 'card reveal'; c.dataset.stack = p.stack.join('|'); c.dataset.id = p.id;
  c.innerHTML = `<div class="no"><span>0${i + 1}</span><span class="kind">${p.kind}</span></div>
    <h3>${p.name}</h3><p>${p.blurb}</p>
    <ul class="tags">${p.stack.map(s => `<li>${s}</li>`).join('')}</ul><span class="more">Voir le détail →</span>`;
  c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  c.addEventListener('click', () => openProject(p));
  grid.append(c); io.observe(c);
});
filters.addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  $$('.chip', filters).forEach(x => x.classList.toggle('on', x === b));
  $$('.card', grid).forEach(c => c.classList.toggle('off', !!b.dataset.v && !c.dataset.stack.split('|').includes(b.dataset.v)));
});
const dlg = $('#dlg');
let lastFocus = null;
function qrSvg(url) {
  try { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
  catch { return ''; }
}
function storesHtml(p) {
  if (!p.stores) return '';
  const defs = [['play', 'Google Play', 'Android'], ['apple', 'App Store', 'iPhone & iPad']];
  const items = defs.map(([k, name, os]) => {
    const url = p.stores[k];
    if (!url) return `<div class="store soon"><div><b>${name}</b><small>${os} · ${p.stores[k + 'Note'] || 'bientôt disponible'}</small></div></div>`;
    return `<div class="store"><div class="qr" aria-hidden="true">${qrSvg(url)}</div>
      <div><b>${name}</b><small>${os} · scanne ou clique</small><a href="${url}" target="_blank" rel="noopener">Ouvrir ↗</a></div></div>`;
  });
  return `<div class="stores"><h4>TÉLÉCHARGER L'APPLICATION</h4><div class="store-row">${items.join('')}</div></div>`;
}
function openProject(p) {
  lastFocus = document.activeElement;
  $('#dlg-body').innerHTML = `<span class="sub">${p.kind}</span><h3 id="dlg-title">${p.name}</h3><p class="ctx">${p.ctx}</p>
    <ul class="do">${p.does.map(d => `<li>${d}</li>`).join('')}</ul>
    <ul class="tags">${p.stack.map(s => `<li>${s}</li>`).join('')}</ul>
    ${storesHtml(p)}
    ${p.link ? `<a class="live" href="${p.link}" target="_blank" rel="noopener">${p.link.replace('https://', '')} ↗</a>` : ''}`;
  dlg.hidden = false; document.body.classList.add('lock');
  $('.modal-box', dlg).scrollTop = 0; $('#dlg-close').focus();
}
function closeProject() { dlg.hidden = true; document.body.classList.remove('lock'); if (lastFocus) lastFocus.focus({ preventScroll: true }); }
dlg.addEventListener('click', e => { if (e.target === dlg) closeProject(); });
$('#dlg-close').addEventListener('click', closeProject);
addEventListener('keydown', e => { if (e.key === 'Escape' && !dlg.hidden) closeProject(); });

/* ---------- Terminal ---------- */
(() => {
  const body = $('#term-body'), form = $('#term-form'), input = $('#term-input');
  const hist = []; let hi = 0;
  const out = (txt, cls = '') => { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = txt; body.append(d); body.scrollTop = body.scrollHeight; };
  const cmds = {
    help: () => out('Commandes : whoami · skills · projects · stack · contact · whatsapp · cv · theme · clear', 'm'),
    whoami: () => out('Mohammad Ramadan Tassembedo — ingénieur informatique (BAC+5), double compétence logiciel & électronique. Ouagadougou.'),
    skills: () => out('backend   Java, Spring Boot, microservices, REST, JWT, Node.js, Laravel, Python, C#\nfrontend  Vue.js, Nuxt.js, HTML5, CSS3, JavaScript\nmobile    Flutter, Dart, Firebase FCM, Play Store / App Store\nembarqué  C, C++, STM32, Arduino, FPGA (Quartus, ModelSim)\ndevops    GitLab CI/CD, Docker, Maven, Nexus, Linux'),
    projects: () => out(projects.map(p => '• ' + p.name).join('\n')),
    stack: () => out('PostgreSQL · Spring Boot · Nuxt.js · Flutter · GitLab CI · Debian/systemd · Raspberry Pi · OVH'),
    contact: () => out('tassembedoramadan7@gmail.com\n+226 60 48 89 49\nWhatsApp : wa.me/22656412939\ngithub.com/ramadantass', 'c'),
    whatsapp: () => { out('Ouverture de WhatsApp…', 'c'); window.open('https://wa.me/22656412939', '_blank', 'noopener'); },
    cv: () => { out('Téléchargement du CV…', 'c'); const a = document.createElement('a'); a.href = 'assets/CV_Tassembedo_2026.pdf'; a.download = ''; a.click(); },
    theme: () => { $('#theme').click(); out('Thème basculé.', 'm'); },
    clear: () => body.replaceChildren(),
    sudo: () => out('Bien tenté. Mais je préfère qu\'on m\'écrive : contact', 'e'),
    ls: () => out('eliyah/  pegasus/  phebus/  securite-integree/  yaare.shop/', 'm')
  };
  out('Bienvenue. Tape "help" pour commencer.', 'm');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value.trim(); input.value = '';
    if (!v) return;
    hist.push(v); hi = hist.length;
    out('$ ' + v, 'm');
    const key = v.split(/\s+/)[0].toLowerCase();
    (cmds[key] || (() => out(`${key} : commande introuvable. Essaie "help".`, 'e')))();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && hi > 0) { input.value = hist[--hi]; e.preventDefault(); }
    if (e.key === 'ArrowDown') { input.value = hist[++hi] || ''; hi = Math.min(hi, hist.length); e.preventDefault(); }
  });
  $('#term').addEventListener('click', () => input.focus({ preventScroll: true }));
})();
})();

/* PULSEPACK — interface. Dépend de engine.js (window.KP). Mode local : tout est dans le navigateur. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('fr-FR');
const KP = window.KP;
const S = () => KP.S;
const RORDER = KP.RARITIES;
const RCOL = { commune: ['#555e66', '#aeb7be'], rare: ['#1c4f92', '#59b0ff'], epique: ['#592a9a', '#c18bff'], legendaire: ['#8a5a0c', '#ffd36b'], icone: ['#7d1f66', '#ff9be6'] };
const GLOW = { commune: '#1c2227', rare: '#0f2b52', epique: '#34165e', legendaire: '#5a3b06', icone: '#5a1448' };
const THEMES = { normal: 'Normal', halloween: 'Halloween', christmas: 'Noël', newyear: 'Nouvel An', birthday: 'Anniversaire', easter: 'Pâques' };
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const flag = iso => /^[A-Z]{2}$/.test(iso) ? String.fromCodePoint(...[...iso].map(c => 127397 + c.charCodeAt(0))) : '🏳';
// Logos externes : liens publics, aucune clé API ni droit de redistribution implicite.
const clubDomains = {
  'PSG':'psg.fr','Marseille':'om.fr','Lyon':'ol.fr','Monaco':'asmonaco.com','Lille':'losc.fr',
  'Man City':'mancity.com','Man Utd':'manutd.com','Liverpool':'liverpoolfc.com','Arsenal':'arsenal.com',
  'Chelsea':'chelseafc.com','Tottenham':'tottenhamhotspur.com','Newcastle':'nufc.co.uk',
  'Aston Villa':'avfc.co.uk','West Ham':'whufc.com','Real Madrid':'realmadrid.com',
  'Barcelona':'fcbarcelona.com','Atlético Madrid':'atleticodemadrid.com',
  'Athletic Club':'athletic-club.eus','Real Sociedad':'realsociedad.eus',
  'Inter':'inter.it','AC Milan':'acmilan.com','Juventus':'juventus.com','Napoli':'sscnapoli.it',
  'Roma':'asroma.com','Atalanta':'atalanta.it','Bayern Munich':'fcbayern.com',
  'Dortmund':'bvb.de','Leverkusen':'bayer04.de','Galatasaray':'galatasaray.org',
  'Al-Nassr':'alnassr.sa','Al-Ittihad':'ittihadclub.sa','Inter Miami':'intermiamicf.com',
  'LAFC':'lafc.com','Santos':'santosfc.com.br'
};
const leagueDomains = { l1:'ligue1.com', pl:'premierleague.com', ll:'laliga.com', sa:'legaseriea.it', bl:'bundesliga.com' };
const imageFallback = 'onerror="this.hidden=true;this.nextElementSibling.hidden=false"';
function crestHTML(club) {
  if (/^(légende|legende|legends?)$/i.test(String(club || "").trim())) return `<img class="kp-crest-img kp-legend-crest" src="assets/legendes-embleme.png" alt="Écusson des légendes">`;
  const domain = clubDomains[club];
  if (!domain) return `<span class="kp-crest-fallback" title="${esc(club)}">${esc(club.slice(0,2).toUpperCase())}</span>`;
  return `<img class="kp-crest-img" loading="lazy" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128" alt="Logo ${esc(club)}" ${imageFallback}><span class="kp-crest-fallback" hidden>${esc(club.slice(0,2).toUpperCase())}</span>`;
}
function countryHTML(iso) {
  if (!/^[A-Z]{2}$/.test(iso || '')) return `<span class="kp-flag-fallback">🏳</span>`;
  return `<img class="kp-flag-img" loading="lazy" src="https://flagcdn.com/w80/${iso.toLowerCase()}.png" alt="Drapeau ${esc(iso)}" ${imageFallback}><span class="kp-flag-fallback" hidden>${flag(iso)}</span>`;
}
function leagueLogoHTML(pk) {
  if (pk.id === 'legendes') return `<img class="kp-pack-illustration kp-pack-legend" src="assets/legendes-embleme.png" alt="Écusson Légendes">`;
  if (pk.id === 'fr' || pk.id === 'br') { const id = pk.id === 'fr' ? '2' : '6'; return `<img class="kp-pack-illustration kp-pack-crest" src="https://media.api-sports.io/football/teams/${id}.png" alt="Écusson officiel ${esc(pk.name)}" onerror="this.onerror=null;this.src='assets/packs/${pk.id}.svg'">`; }
  if (['att','gar'].includes(pk.id)) return `<img class="kp-pack-illustration kp-pack-special" src="assets/packs/${pk.id}.svg" alt="Illustration ${esc(pk.name)}">`;
  if (pk.id === 'l1' || pk.id === 'll') {
    // V30: véritables logos officiels, SVG haute définition (Wikimedia Commons).
    // On ne revient jamais aux faux badges L1/LL.
    const logo = pk.id === 'l1'
      ? 'https://commons.wikimedia.org/wiki/Special:FilePath/Logo_Ligue_1_McDonald%27s_2024.svg'
      : 'https://commons.wikimedia.org/wiki/Special:FilePath/LaLiga_EA_Sports_2023_Vertical_Logo.svg';
    return `<img class="kp-league-img kp-league-official" src="${logo}" alt="Logo officiel ${esc(pk.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';this.parentElement.classList.add('kp-logo-unavailable');">`;
  }
  const domain = leagueDomains[pk.id];
  if (!domain) return esc(pk.icon);
  return `<img class="kp-league-img" loading="lazy" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256" alt="Logo ${esc(pk.name)}" ${imageFallback}><span class="kp-league-fallback" hidden>${esc(pk.icon)}</span>`;
}
const ui = { pack: 'monde', cls: { q: '', rar: '', lg: '', show: 'all' }, limit: 60, mt: 'buy', mq: '', lb: 'all', fuse: 'commune' };
// V43 : chargement progressif automatique du classeur, sans bouton ni rendu de 48 000 cartes d'un coup.
let classeurObserver = null;
let classeurLoading = false;
let anim = localStorage.getItem('kp-anim') !== 'false';

/* ---------- petits utilitaires ---------- */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
function beep(f, d = .12) {
  if (!S().sound) return;
  try { const a = beep.a || (beep.a = new (window.AudioContext || window.webkitAudioContext)()), o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; o.type = 'triangle'; g.gain.setValueAtTime(.08, a.currentTime); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + d); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + d); } catch (e) {}
}
const run = fn => { try { return fn(); } catch (e) { toast(e.message || String(e)); return null; } };

/* ---------- cartes (silhouette stylisée : aucune photo officielle) ---------- */
function art(p) {
  const h = hash(p.club || p.name) % 360, sk = ['#f1c9a5', '#d9a47a', '#a8744f', '#6e4a32'][hash(p.name) % 4], hair = ['#1b1410', '#3a2616', '#caa24a', '#111'][hash(p.name + 'h') % 4];
  const jersey = `hsl(${h} 70% ${['G','GAR'].includes(p.pos) ? 58 : 45}%)`, ini = esc(p.name.split(/[\s-]+/).map(w => w[0]).slice(0, 2).join('').toUpperCase());
  return `<svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><text x="50" y="80" text-anchor="middle" font-size="66" font-weight="800" fill="#fff" opacity=".08" font-family="Barlow Condensed,Impact,sans-serif">${ini}</text><path d="M8 120C10 92 28 82 50 82s40 10 42 38Z" fill="${jersey}"/><path d="M40 82l10 14 10-14" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"/><rect x="43" y="68" width="14" height="16" rx="5" fill="${sk}"/><ellipse cx="50" cy="52" rx="17" ry="20" fill="${sk}"/><path d="M33 50c0-16 10-23 17-23s17 7 17 23c-4-8-9-11-17-11s-13 3-17 11Z" fill="${hair}"/></svg>`;
}
function cardHTML(p, o = {}) {
  const hi = RORDER.indexOf(p.rarity) >= 3;
  return `<div class="card r-${p.rarity}${hi ? ' holo' : ''}${o.off ? ' off' : ''}${o.n > 1 ? ' dupe' : ''}${o.cls ? ' ' + o.cls : ''}" ${o.n > 1 ? `data-n="x${o.n}"` : ''} ${o.pid ? `data-act="detail" data-pid="${esc(p.id)}"` : ''} role="${o.pid ? 'button' : 'img'}" aria-label="${esc(p.name)}, ${p.rating}, ${KP.RLABEL[p.rarity]}"><div class="in"><div class="art" data-player-id="${esc(p.id)}" data-player-name="${esc(p.name)}">${art(p)}<div class="rt"><b>${p.rating}</b><span>${p.pos}</span></div><div class="fl">${countryHTML(p.nation)}</div>${o.serial ? `<div class="sn">N°${o.serial}</div>` : ''}</div><div class="nb"><b title="${esc(p.name)}">${esc(p.name)}</b><small class="kp-club-line">${crestHTML(p.club)}<span>${esc(p.club)}</span></small><small class="kp-league-line">${esc(KP.LEAGUES[p.league] || p.league)}</small></div><div class="rr rr-${p.rarity}">${KP.RLABEL[p.rarity]}</div></div>${o.isNew ? '<span class="new">NOUVEAU</span>' : ''}</div>`;
}
function packHTML(pk, size = '') {
  return `<div class="pack ${size}" style="--h:${pk.hue}"><div class="sheen"></div><div class="pk-top"><span>PULSEPACK</span><span>${pk.size} cartes</span></div><div class="pk-art">${leagueLogoHTML(pk)}</div><div class="pk-name">${esc(pk.name)}</div></div>`;
}
const ratesTxt = pk => KP.RARITIES.filter(r => pk.rates[r] > 0).map(r => `${KP.RLABEL[r]} ${pk.rates[r]}%`).join(' · ');

/* ---------- thèmes saisonniers (seasons.js lit les classes sur <body>) ---------- */
function applyTheme(t, fromUser) {
  if (!THEMES[t]) t = 'normal';
  if (fromUser) return; // Thème du site contrôlé exclusivement par Supabase
  document.body.classList.remove('halloween', 'christmas', 'newyear', 'birthday', 'easter');
  if (t !== 'normal') document.body.classList.add(t);
  document.body.classList.toggle('no-motion', !anim);
  // Ne jamais enregistrer un thème global dans le stockage local
}

/* ---------- vues ---------- */
function viewDrops() {
  const s = S(), ticks = [];
  const pk = KP.packById(ui.pack) || KP.PACKS[0], daily = KP.dailyPlayer();
  const tile = k => `<button class="pack-tile${k.id === ui.pack ? ' sel' : ''}" data-act="pick" data-id="${k.id}">${k.tag === 'featured' ? '<span class="flag">À LA UNE</span>' : k.tag === 'daily' ? '<span class="flag">DU JOUR</span>' : ''}${packHTML(k, 'sm')}<div><div class="nm">${esc(k.name)}</div><small>${k.tag === 'daily' && daily ? esc(daily.name) : esc(k.sub)} · 💎 ${k.cost}</small></div></button>`;
  const groups = [['ligue', 'Championnats'], ['nation', 'Nations'], ['style', 'Styles de jeu'], ['epoque', 'Époques']];
  const free = s.free.count;
  return `<h1 class="page kp-drops-heading">Drops</h1><p class="lead">Choisis un pack, ouvre-le, découvre tes joueurs. Chaque carte a un numéro de série unique.</p>
  <div class="stat-bar"><span>Ouverts aujourd’hui <b>${s.stats.opened}</b></span><span title="Nombre total de cartes, doublons compris">Cartes totales <b>${s.cards.length}</b></span><span title="Nombre de joueurs différents dans ta collection">Joueurs différents <b>${KP.owned().size}</b></span><span>Valeur de collection <b>${fmt(KP.collectionValue())}</b></span></div>
  ${ticks.length ? `<div class="ticker"><span>${ticks.join(' &nbsp;·&nbsp; ')} &nbsp;·&nbsp; ${ticks.join(' &nbsp;·&nbsp; ')}</span></div>` : ''}
  <div class="eyebrow">EN VEDETTE</div><div class="fav">${KP.PACKS.filter(k => k.tag === 'featured' || k.tag === 'daily' || k.id === 'elite').map(tile).join('')}</div>
  ${groups.map(([t, label]) => { const l = KP.PACKS.filter(k => k.tag === t && k.id !== 'elite'); return l.length ? `<div class="eyebrow">${label.toUpperCase()}</div><div class="packs big">${l.map(tile).join('')}</div>` : ''; }).join('')}
  <div class="opener"><div class="info"><b>${esc(pk.name)}</b><div class="rates">${ratesTxt(pk)} · ${KP.RLABEL[pk.guarantee]} min. garanti</div></div>
  <button class="btn-o" data-act="open" data-id="${pk.id}" data-free="1" ${free ? '' : 'disabled'}>Gratuit (${free})</button>
  <button class="btn-p" data-act="open" data-id="${pk.id}">Ouvrir<small>${(s.giftPacks?.[pk.id]||0)>0?`🎁 ${s.giftPacks[pk.id]} offert(s)`:`💎 ${pk.cost}`}</small></button></div>`;
}

function filteredPlayers() {
  const f = ui.cls, s = S(), have = KP.owned(), q = f.q.toLowerCase();
  return KP.PLAYERS.filter(p => (!q || (p.name + ' ' + p.club).toLowerCase().includes(q)) && (!f.rar || p.rarity === f.rar) && (!f.lg || p.league === f.lg)
    && (f.show === 'all' || (f.show === 'owned' && have.has(p.id)) || (f.show === 'missing' && !have.has(p.id)) || (f.show === 'wish' && s.wish.includes(p.id))))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
}
function viewClasseur() {
  const s = S(), counts = {}, serial = {};
  for (const c of s.cards) { counts[c.pid] = (counts[c.pid] || 0) + 1; if (!serial[c.pid]) serial[c.pid] = c.serial; }
  const have = Object.keys(counts).length, total = KP.PLAYERS.length, list = filteredPlayers(), f = ui.cls;
  const dup = KP.duplicates(), gain = dup.reduce((a, c) => a + KP.recycleValue(KP.BYID[c.pid]), 0);
  const opt = (v, cur, l) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`;
  const dupOf = r => dup.filter(c => KP.BYID[c.pid].rarity === r).length;
  return `<h1 class="page">Classeur</h1><p class="lead">Ta collection. Les cartes grisées te manquent encore.</p>
  <div class="sect-h"><h3>${have} / ${total} joueurs</h3><div class="lg-prog"><i style="width:${total ? have / total * 100 : 0}%"></i></div></div>
  <div class="row" style="margin-bottom:14px"><input class="grow" type="search" placeholder="Rechercher un joueur ou un club…" value="${esc(f.q)}" data-f="q" aria-label="Rechercher">
  <select data-f="rar" aria-label="Rareté">${opt('', f.rar, 'Toutes raretés')}${RORDER.map(r => opt(r, f.rar, KP.RLABEL[r])).join('')}</select>
  <select data-f="lg" aria-label="Ligue">${opt('', f.lg, 'Toutes ligues')}${Object.entries(KP.LEAGUES).map(([k, v]) => opt(k, f.lg, v)).join('')}</select>
  <select data-f="show" aria-label="Affichage">${opt('all', f.show, 'Tout')}${opt('owned', f.show, 'Possédées')}${opt('missing', f.show, 'Manquantes')}${opt('wish', f.show, 'Souhaits')}</select></div>
  <div class="cards" id="kpClasseurCards">${list.slice(0, ui.limit).map(p => cardHTML(p, { pid: true, off: !counts[p.id], n: counts[p.id], serial: serial[p.id] })).join('') || '<div class="empty">Aucun joueur ne correspond.</div>'}</div>
  ${list.length > ui.limit ? `<div id="kpClasseurSentinel" aria-label="Chargement automatique des joueurs" style="height:12px;margin:14px 0"></div>` : ''}
  <div class="sect-h"><h3>Doublons</h3></div><div class="countdown"><div>${dup.length ? `<b>${dup.length}</b> doublon${dup.length > 1 ? 's' : ''} · recyclage = <span class="pill">🪙 ${fmt(gain)}</span>` : 'Aucun doublon pour l’instant.'}</div><div class="row">
  <button class="btn-o" data-act="recycleAll" ${dup.length ? '' : 'disabled'}>Tout recycler</button>
  <select data-f="fuse" aria-label="Rareté à fusionner">${RORDER.slice(0, 3).map(r => opt(r, ui.fuse, `${KP.RLABEL[r]} (${dupOf(r)})`)).join('')}</select><button class="btn-o" data-act="fuse" ${dupOf(ui.fuse) >= 5 ? '' : 'disabled'}>Fusionner 5 → 1 rareté sup.</button></div></div>`;
}

function miniRow(p, extra) { return `<div class="tr"><div class="mini">${cardHTML(p, { pid: true })}</div>${extra}</div>`; }
function viewMarche() {
  const s = S(), tabs = [['buy', 'Acheter'], ['sell', 'Mes ventes'], ['hist', 'Historique']];
  let body = '';
  if (ui.mt === 'buy') {
    const all = KP.market(), q = ui.mq.toLowerCase(), list = all.filter(m => !q || KP.BYID[m.pid].name.toLowerCase().includes(q));
    const trend = [...all].filter(m => m.trend != null).sort((a, b) => b.trend - a.trend).slice(0, 6);
    body = `<div class="eyebrow">TENDANCES</div><div class="trend-row">${trend.map(m => `<div>${cardHTML(KP.BYID[m.pid], { pid: true })}<div class="price" style="margin-top:6px">🪙 ${fmt(m.price)} <span class="${m.trend >= 0 ? 'up' : 'dn'}">${m.trend >= 0 ? '+' : ''}${m.trend}%</span></div></div>`).join('')}</div>
    <input type="search" placeholder="Rechercher un joueur…" value="${esc(ui.mq)}" data-f="mq" style="width:100%;margin:18px 0 6px" aria-label="Rechercher sur le marché"><div class="tbl">${list.map(m => { const p = KP.BYID[m.pid]; return miniRow(p, `<div class="nm"><b>${esc(p.name)}</b><small>${KP.RLABEL[p.rarity]} · vendu par ${esc(m.seller)}</small></div><span class="${(m.trend || 0) >= 0 ? 'up' : 'dn'}">${(m.trend || 0) >= 0 ? '+' : ''}${m.trend || 0}%</span><span class="price">🪙 ${fmt(m.price)}</span>${m.mine ? `<button class="btn-o" data-act="unlist" data-id="${m.id}">Retirer</button>` : `<button class="btn-p" data-act="buy" data-id="${m.id}" ${s.coins < m.price ? 'disabled' : ''}>Acheter</button>`}`); }).join('') || '<div class="empty">Rien à ce nom.</div>'}</div>`;
  } else if (ui.mt === 'sell') {
    body = `<p class="lead">Pour vendre une carte, ouvre-la depuis ton classeur puis choisis « Mettre en vente ». Commission : ${Math.round(KP.CFG.MARKET_FEE * 100)} %.</p><div class="tbl">${s.listings.map(l => { const p = KP.BYID[l.pid]; return miniRow(p, `<div class="nm"><b>${esc(p.name)}</b><small>Valeur estimée 🪙 ${fmt(p.value)}</small></div><span class="price">🪙 ${fmt(l.price)}</span><button class="btn-o" data-act="unlist" data-id="${l.id}">Retirer</button>`); }).join('') || '<div class="empty">Aucune vente en cours.</div>'}</div>`;
  } else {
    const rows = [...s.sold.map(x => ({ ...x, k: 'Vendue' })), ...s.bought.map(x => ({ ...x, k: 'Achetée' }))].sort((a, b) => b.at - a.at).slice(0, 40);
    body = `<div class="tbl">${rows.map(x => { const p = KP.BYID[x.pid]; return p ? miniRow(p, `<div class="nm"><b>${esc(p.name)}</b><small>${x.k} · ${new Date(x.at).toLocaleString('fr-FR')}</small></div><span class="price">🪙 ${fmt(x.net || x.price)}</span>`) : ''; }).join('') || '<div class="empty">Aucune transaction.</div>'}</div>`;
  }
  return `<h1 class="page">Marché</h1><p class="lead">Achète et vends des cartes avec des pièces. Aucun faux vendeur. Le marché public attend une synchronisation sécurisée entre vrais comptes.</p><div class="tabs">${tabs.map(([k, l]) => `<button class="${ui.mt === k ? 'on' : ''}" data-act="mt" data-id="${k}">${l}</button>`).join('')}</div>${body}`;
}

function viewClassement() {
  const rows = KP.leaderboard(ui.lb), top = rows.slice(0, 3), now = new Date(), d = (8 - now.getUTCDay()) % 7 || 7, ms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + d) - now.getTime();
  const podium = rows.length >= 3 ? `<div class="podium">${[top[1], top[0], top[2]].map((r, i) => `<div class="pl p${[2, 1, 3][i]}"><div class="av">${esc(r.name[0].toUpperCase())}</div><b>${esc(r.name)}</b><small class="mono">${fmt(r.score)}</small><div class="st">${[2, 1, 3][i]}</div></div>`).join('')}</div>` : '';
  return `<h1 class="page">Classement</h1><p class="lead">Classé par valeur de collection. Aucun faux joueur : seuls les comptes réels apparaîtront dans le classement connecté.</p>
  <div class="tabs">${[['week', 'Semaine'], ['all', 'Général'], ['friends', 'Amis']].map(([k, l]) => `<button class="${ui.lb === k ? 'on' : ''}" data-act="lb" data-id="${k}">${l}</button>`).join('')}</div>
  ${ui.lb === 'week' ? `<div class="countdown" style="margin-bottom:10px"><span>Fin de la semaine dans <b>${Math.floor(ms / 864e5)} j ${Math.floor(ms % 864e5 / 36e5)} h</b></span><span class="pill">🥇 5 boosters · 🥈 3 · 🥉 1</span></div>` : ''}
  ${ui.lb === 'friends' ? '<p class="lead">Seuls les comptes réels sont affichés.</p>' : podium}
  <div class="tbl">${rows.map(r => `<div class="tr${r.me ? ' me-row' : ''}"><span class="mono" style="width:34px">${r.rank || 1}</span><div class="nm"><b>${esc(r.name)}${r.me ? ' (toi)' : ''}</b><small>${fmt(r.cards)} cartes${r.badge ? ' · ' + r.badge : ''}</small></div><span class="price">${fmt(r.score)}</span></div>`).join('')}</div>`;
}

function viewMissions() {
  const s = S(), st = KP.loginState(), done = st.can ? st.streak % 7 : ((s.streak - 1) % 7) + 1;
  const rw = r => [r.g ? '💎 ' + r.g : '', r.c ? '🪙 ' + r.c : '', r.f ? '+' + r.f + ' gratuit' : ''].filter(Boolean).join(' ');
  const reach = KP.MISSIONS.filter(m => !s.claimed[m.id] && s.stats[m.stat] >= m.goal).length;
  return `<h1 class="page">Missions</h1><p class="lead">Reviens chaque jour : plus ta série est longue, plus la récompense grandit.</p>
  <div class="countdown"><div class="row"><span class="flame">🔥</span><div><b style="font:800 1.6rem var(--font)">${st.streak} jour${st.streak > 1 ? 's' : ''} de suite</b><div class="mono">Série de connexion</div></div></div><button class="btn-p" data-act="login" ${st.can ? '' : 'disabled'}>${st.can ? 'Récupérer aujourd’hui' : 'Déjà récupéré'}</button></div>
  <div class="login-grid">${KP.LOGIN_REWARDS.map((r, i) => `<div class="day${i < done ? ' done' : ''}${st.can && i === done ? ' today' : ''}"><small>JOUR ${i + 1}</small><span>${i < done ? '✓' : '🎁'}</span><b class="ex">${rw(r)}</b></div>`).join('')}</div>
  <div class="sect-h"><h3>Missions du jour</h3><button class="btn-o" data-act="claimAll" ${reach ? '' : 'disabled'}>Tout récupérer (${reach})</button></div>
  ${KP.MISSIONS.map(m => { const v = Math.min(m.goal, s.stats[m.stat] || 0), ok = v >= m.goal, cl = s.claimed[m.id]; return `<div class="mis"><div class="lab"><b>${esc(m.label)}</b><div class="bar"><i style="width:${v / m.goal * 100}%"></i></div></div><span class="cnt">${v}/${m.goal}</span>${cl ? '<span class="rw done">✓ Pris</span>' : ok ? `<button class="rw ok" data-act="claim" data-id="${m.id}">${rw(m)}</button>` : `<span class="rw">${rw(m)}</span>`}</div>`; }).join('')}`;
}

function viewParrainage() {
  const s = S(), link = location.origin.replace('null', '') + location.pathname + '?ref=' + s.refCode;
  return `<div class="hero-ref"><h1>Invite un ami.<br><em>Gagnez tous les deux.</em></h1><p class="lead">Ton ami reçoit 💎 240 à son inscription, et toi 💎 480 pour chaque ami invité.</p>
  <div class="ref-box"><div><b>${s.invited}</b><span class="mono">Amis invités</span></div><div><b>${fmt(s.invited * 480)}</b><span class="mono">Gemmes gagnées</span></div></div>
  <div class="linkbox"><input readonly value="${esc(link)}" id="refLink" aria-label="Ton lien de parrainage"><button class="btn-p" data-act="copy">Copier le lien</button></div>
  <p class="mono" style="margin-top:12px">En mode local, le parrainage est simulé. Il devient réel avec Supabase.</p></div>
  <div class="sect-h"><h3>Paliers</h3></div><div class="tiers">${KP.TIERS.map(t => `<div class="tier${s.invited >= t.n ? ' ok' : ''}"><div class="ring">${t.n}</div><b>${t.name}</b><small class="mono">${t.gems ? '💎 ' + t.gems : 'Badge'}</small></div>`).join('')}</div>
  <div class="row"><input class="grow" id="refCode" placeholder="As-tu un code de parrain ?" ${s.refBy ? 'disabled value="' + esc(s.refBy) + '"' : ''}><button class="btn-o" data-act="applyRef" ${s.refBy ? 'disabled' : ''}>Valider</button><button class="btn-o" data-act="simInvite">Simuler une invitation</button></div>`;
}

function viewSocial() {
 return `<h1 class="page">Social</h1><p class="lead">Ajoute des amis par pseudo et retrouve les collections des vrais comptes PULSEPACK.</p><div id="kpSocialPage"><div class="empty">Chargement des comptes…</div></div>`;
}

// Charge seulement les cartes visibles au fil du défilement ; préserve les champs et la position.
function setupClasseurInfiniteScroll() {
  if (classeurObserver) { classeurObserver.disconnect(); classeurObserver = null; }
  const sentinel = document.getElementById('kpClasseurSentinel');
  if (!sentinel || location.hash !== '#classeur') return;
  classeurObserver = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting) || classeurLoading || location.hash !== '#classeur') return;
    classeurLoading = true;
    // Une tranche par frame évite les gels du navigateur sur les grandes bases.
    requestAnimationFrame(() => {
      try {
        const target = document.getElementById('kpClasseurCards');
        const marker = document.getElementById('kpClasseurSentinel');
        if (!target || !marker || location.hash !== '#classeur') return;
        const list = filteredPlayers();
        const start = ui.limit;
        const end = Math.min(start + 60, list.length);
        const counts = {}, serial = {};
        for (const c of S().cards) { counts[c.pid] = (counts[c.pid] || 0) + 1; if (!serial[c.pid]) serial[c.pid] = c.serial; }
        target.insertAdjacentHTML('beforeend', list.slice(start, end).map(p => cardHTML(p, {pid:true,off:!counts[p.id],n:counts[p.id],serial:serial[p.id]})).join(''));
        ui.limit = end;
        if (end >= list.length) { marker.remove(); classeurObserver?.disconnect(); classeurObserver = null; }
      } finally { classeurLoading = false; }
    });
  }, { rootMargin: '900px 0px', threshold: 0 });
  classeurObserver.observe(sentinel);
}
const VIEWS = { social: viewSocial, drops: viewDrops, classeur: viewClasseur, marche: viewMarche, classement: viewClassement, missions: viewMissions, parrainage: viewParrainage };
function render(keepScroll) {
  const r = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'drops', y = scrollY;
  // Social contient des formulaires et des requêtes asynchrones : ne pas le reconstruire
  // lors d'un rafraîchissement de l'état ou d'un clic sur l'onglet déjà ouvert.
  if (r === 'social' && $('#kpSocialPage') && $('#view').dataset.currentView === 'social') {
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === r));
    return;
  }
  if (classeurObserver) { classeurObserver.disconnect(); classeurObserver = null; }
  $('#view').innerHTML = VIEWS[r]();
  $('#view').dataset.currentView = r;
  if (r === 'classeur') setupClasseurInfiniteScroll();
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === r));
  if (keepScroll) scrollTo(0, y);
}

/* ---------- wallet / timer ---------- */
function wallet() {
  const s = S(); KP.tick();
  $('#gems').textContent = fmt(s.gems); $('#coins').textContent = fmt(s.coins);
  const left = s.free.next ? Math.max(0, s.free.next - Date.now()) : 0, m = Math.floor(left / 60000), sec = Math.floor(left % 60000 / 1000);
  $('#freeTxt').textContent = `${s.free.count}/${KP.CFG.FREE_MAX}${left ? ` · ${m}:${String(sec).padStart(2, '0')}` : ''}`;
  $('#freeBar').style.width = (s.free.count >= KP.CFG.FREE_MAX ? 100 : (1 - left / (KP.CFG.FREE_EVERY_MIN * 60000)) * 100) + '%';
  const lg = KP.loginState(); $('#navStreak').textContent = lg.can ? '●' : lg.streak ? '🔥' + lg.streak : '';
}

/* ---------- fenêtre ---------- */
function modal(html) { $('#modalBody').innerHTML = html; $('#modal').hidden = false; document.body.classList.add('lock'); }
function closeModal() { $('#modal').hidden = true; document.body.classList.remove('lock'); }
function detail(pid) {
  const p = KP.BYID[pid]; if (!p) return;
  const s = S(), mine = s.cards.filter(c => c.pid === pid), dup = KP.duplicates().filter(c => c.pid === pid), wished = s.wish.includes(pid);
  modal(`<div class="detail"><div>${cardHTML(p, { cls: 'xl', serial: mine[0]?.serial, off: !mine.length })}</div><div><h2 style="font-size:2.2rem">${esc(p.name)}</h2>
  <div class="kv"><span>Poste</span><b>${KP.POS[p.pos] || p.pos}</b><span>Club</span><b>${esc(p.club)}</b><span>Nation</span><b>${countryHTML(p.nation)} ${esc(p.nation)}</b><span>Ligue</span><b>${KP.LEAGUES[p.league] || p.league}</b><span>Note</span><b>${p.rating}</b><span>Rareté</span><b class="rr-${p.rarity}">${KP.RLABEL[p.rarity]}</b><span>Valeur</span><b>🪙 ${fmt(p.value)}</b><span>Exemplaires</span><b>${mine.length}</b></div>
  <div class="row"><button class="btn-o" data-act="wish" data-pid="${esc(pid)}">${wished ? '★ Dans mes souhaits' : '☆ Ajouter aux souhaits'}</button>
  ${dup.length ? `<button class="btn-o" data-act="recycle1" data-id="${dup[0].id}">Recycler un doublon (🪙 ${KP.recycleValue(p)})</button>` : ''}</div>
  ${mine.length ? `<p class="mono" style="margin-top:14px">Vente publique désactivée jusqu’au marché entre vrais comptes.</p>` : '<p class="mono" style="margin-top:14px">Tu ne possèdes pas encore cette carte.</p>'}</div></div>`);
}
function settings() {
  const s = S();
  const account = window.KP_AUTH;
  modal(`<h2 style="font-size:2rem;margin-bottom:14px">Paramètres</h2>
    <p class="lead">Personnalise l'affichage de PULSEPACK sur cet appareil.</p>
    <div class="kv"><span>Pseudo</span><span>${esc(account?.pseudo || s.pseudo)}</span>
    <span>Apparence</span><label><select id="setAppearance" aria-label="Mode d'affichage"><option value="dark" ${localStorage.getItem('kp-appearance-'+(window.KP_AUTH?.userId||'guest')) !== 'light' ? 'selected' : ''}>Mode sombre</option><option value="light" ${localStorage.getItem('kp-appearance-'+(window.KP_AUTH?.userId||'guest')) === 'light' ? 'selected' : ''}>Mode clair</option></select></label>
    <span>Animations</span><label><input type="checkbox" id="setAnim" ${anim ? 'checked' : ''}> Activées</label>
    <span>Sons</span><label><input type="checkbox" id="setSound" ${s.sound ? 'checked' : ''}> Activés</label></div>`);
}

/* ---------- ouverture de pack plein écran ---------- */
function openFlow(packId, useFree) {
  if (window.KP_isRestricted?.('packs')) { window.KP_showBanWarning?.('packs'); return; }
  const pk = KP.packById(packId), ov = $('#overlay'); let n = 1, busy = false;
  const close = () => { ov.hidden = true; ov.innerHTML = ''; document.body.classList.remove('lock'); wallet(); render(true); };
  const sparks = col => `<div class="sparks">${[...Array(26)].map(() => `<i style="left:${Math.random() * 100}%;--sc:${col};animation-duration:${4 + Math.random() * 6}s;animation-delay:${-Math.random() * 8}s"></i>`).join('')}</div>`;
  const stage = () => {
    ov.style.removeProperty('--glow');
    ov.innerHTML = `<div class="bgfx">${sparks('#ffc04a')}</div><div class="ov-bar"><span class="ov-title">${esc(pk.name)}</span><button class="x" data-ov="close" aria-label="Fermer">✕</button></div>
    <div class="stage"><div class="pk-wrap" id="pkWrap" tabindex="0" role="button" aria-label="Ouvrir le pack"><div class="pack" style="--h:${pk.hue}"><div class="sheen"></div><div class="pk-top"><span>PULSEPACK</span><span>${pk.size} cartes</span></div><div class="pk-art">${leagueLogoHTML(pk)}</div><div class="pk-name">${esc(pk.name)}</div></div><div class="tear-line"></div><div class="tear-top" id="tearTop"><div class="pack" style="--h:${pk.hue}"><div class="pk-top"><span>PULSEPACK</span><span>${pk.size} cartes</span></div></div></div></div></div>
    <div class="ov-foot">${useFree ? '' : `<div class="qty">${[1, 3, 5].map(k => `<button data-qty="${k}" class="${k === n ? 'on' : ''}" ${!KP.canAfford(pk,k,false) ? 'disabled' : ''}>x${k} · 💎 ${pk.cost * k}</button>`).join('')}</div>`}<span>Touche le pack pour l’ouvrir</span></div><div class="flash" id="flash"></div>`;
    ov.hidden = false; document.body.classList.add('lock');
  };
  const go = async () => {
    if (busy) return; busy = true;
    if (!(await window.KP_authorizeAction?.('packs'))) { busy=false; return; }
    const res = run(() => KP.openPack(pk.id, n, useFree)); if (!res) {busy=false;return;}
    const best = res.reduce((a, r) => Math.max(a, RORDER.indexOf(r.player.rarity)), 0), bestR = RORDER[best];
    wallet(); const wrap = $('#pkWrap'); wrap.classList.add('opening'); beep(180, .25);
    setTimeout(() => { $('#flash').classList.add('go'); $('#tearTop').classList.add('gone'); ov.style.setProperty('--glow', GLOW[bestR]); beep(520 + best * 140, .3); }, anim ? 520 : 0);
    setTimeout(() => reveal(res, bestR), anim ? 1250 : 50);
  };
  const reveal = (res, bestR) => {
    let i = 0, flipped = false;
    const total = res.length;
    const draw = () => {
      const r = res[i], p = r.player, [c1, c2] = RCOL[p.rarity];
      ov.innerHTML = `<div class="bgfx">${sparks(c2)}</div><div class="ov-bar"><span class="ov-title">${i + 1} / ${total}</span><button class="btn-o" data-ov="skip">Tout révéler</button></div>
      <div class="stage"><div class="deck" id="deck"><div class="stackb"></div><div class="flipper" id="flipper"><div class="back"><div class="bl"></div><em>KP</em></div><div class="face">${cardHTML(p, { serial: r.card.serial, isNew: r.isNew })}</div></div></div></div>
      <div class="slots">${res.map((x, k) => `<i class="${k < i ? 'f' : ''}" style="--c1:${RCOL[x.player.rarity][0]};--c2:${RCOL[x.player.rarity][1]}"></i>`).join('')}</div><div class="ov-foot"><span>${flipped ? 'Touche pour la suite' : 'Touche la carte pour la retourner'}</span></div>`;
      ov.style.setProperty('--glow', GLOW[bestR]); flipped = false;
    };
    const click = () => {
      const fl = $('#flipper'); if (!fl) return;
      if (!flipped) { fl.classList.add('flip'); flipped = true; const p = res[i].player; beep(300 + RORDER.indexOf(p.rarity) * 120, .22); ov.style.setProperty('--glow', GLOW[p.rarity]); $('.ov-foot span', ov).textContent = i + 1 < total ? 'Touche pour la suite' : 'Touche pour voir le résumé'; return; }
      fl.classList.add('go'); setTimeout(() => { i++; i < total ? draw() : summary(res); }, anim ? 450 : 0);
    };
    draw(); ov.onclick = e => { if (e.target.closest('.deck')) click(); else if (e.target.closest('[data-ov=skip]')) summary(res); else if (e.target.closest('[data-ov=close]')) close(); };
  };
  const summary = res => {
    ov.scrollTop = 0; // V48 : toujours afficher le début du résumé, même après de nombreux packs.
    const worth = res.reduce((a, r) => a + r.player.value, 0);
    ov.innerHTML = `<div class="ov-bar"><span class="ov-title">Résumé</span><button class="x" data-ov="close" aria-label="Fermer">✕</button></div><div class="sum"><h2>Ton tirage</h2><div class="mono">Valeur totale 🪙 ${fmt(worth)}</div><div class="fan">${res.map((r, k) => `<div style="animation-delay:${k * 60}ms">${cardHTML(r.player, { serial: r.card.serial, isNew: r.isNew })}</div>`).join('')}</div><div class="row" style="justify-content:center"><button class="btn-o" data-ov="close">Fermer</button><button class="btn-p" data-ov="again">Rouvrir ce pack</button></div></div>`;
    ov.onclick = e => { const t = e.target.closest('[data-ov]'); if (!t) return; if (t.dataset.ov === 'close') close(); if (t.dataset.ov === 'again') { busy = false; const free = useFree && S().free.count > 0; if (useFree && !free) return close(); stage(); bind(); } };
  };
  const bind = () => {
    ov.onclick = e => {
      if (e.target.closest('[data-ov=close]')) return close();
      const q = e.target.closest('[data-qty]'); if (q) { n = +q.dataset.qty; stage(); bind(); return; }
      if (e.target.closest('#pkWrap')) go();
    };
  };
  stage(); bind();
}

/* ---------- événements ---------- */
const ACT = {
  pick: d => { ui.pack = d.id; render(true); },
  open: async d => { if(!(await window.KP_authorizeAction?.('packs')))return; const free = !!d.free; if (free && !KP.canAfford(KP.packById(d.id), 1, true)) return toast('Plus de boosters gratuits'); if (!free && !KP.canAfford(KP.packById(d.id), 1, false)) return toast('Pas assez de gemmes'); openFlow(d.id, free); },
  detail: d => detail(d.pid),
  wish: d => { KP.toggleWish(d.pid); detail(d.pid); },
  recycle1: d => { const r = run(() => KP.recycleCards([d.id])); if (r) { toast(`+${r.gain} 🪙`); closeModal(); render(true); } },
  recycleAll: () => { const r = KP.recycleCards(KP.duplicates().map(c => c.id)); toast(`${r.n} cartes recyclées · +${fmt(r.gain)} 🪙`); render(true); },
  fuse: () => { const ids = KP.duplicates().filter(c => KP.BYID[c.pid].rarity === ui.fuse).slice(0, 5).map(c => c.id); const r = run(() => KP.fuse(ids)); if (r) { modal(`<h2 style="font-size:1.8rem;margin-bottom:14px">Fusion réussie</h2><div style="display:grid;place-items:center">${cardHTML(r.player, { cls: 'xl', serial: r.card.serial, isNew: r.isNew })}</div>`); render(true); } },
  sell: d => { if(window.KP_showBanWarning?.('market'))return; const price = +$('#sellPrice').value; if (run(() => KP.listCard(d.id, price)) !== null) { toast('Carte mise en vente'); closeModal(); render(true); } },
  unlist: d => { if(window.KP_showBanWarning?.('market'))return; KP.cancelListing(d.id); toast('Annonce retirée'); render(true); },
  buy: d => { if(window.KP_showBanWarning?.('market'))return; const c = run(() => KP.buy(d.id)); if (c) { toast('Carte achetée !'); render(true); } },
  mt: d => { ui.mt = d.id; render(true); },
  lb: d => { ui.lb = d.id; render(true); },
  login: () => { const r = run(() => KP.claimLogin()); if (r) { toast('Récompense récupérée'); render(true); } },
  claim: d => { KP.claimMission(d.id); render(true); },
  claimAll: () => { const r = KP.claimAll(); toast(`+${r.g} 💎 +${r.c} 🪙`); render(true); },
  copy: () => { const i = $('#refLink'); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).catch(() => document.execCommand('copy')); toast('Lien copié'); },
  applyRef: () => { const ok = KP.applyReferral($('#refCode').value.trim()); toast(ok ? '+240 💎 de bienvenue' : 'Code invalide'); render(true); },
  simInvite: () => { KP.simulateInvite(); toast('Ami simulé : +480 💎'); render(true); },
  resetPlayers: () => { if (!['admin','owner'].includes(window.KP_AUTH?.role)) return toast('Réservé aux administrateurs'); KP.resetPlayers(); toast('Base de démo rechargée'); settings(); render(true); },
  grant: () => { if (!['admin','owner'].includes(window.KP_AUTH?.role)) return toast('Réservé aux administrateurs'); KP.grant(1000, 1000); toast('+1000 💎 +1000 🪙'); },
  resetAll: () => { if (!['admin','owner'].includes(window.KP_AUTH?.role)) return toast('Réservé aux administrateurs'); if (confirm('Effacer toute ta progression ?')) { KP.reset(); applyTheme(window.KP_AUTH?.theme || 'normal'); closeModal(); render(); toast('Progression réinitialisée'); } },
};
document.addEventListener('click', e => {
  if (e.target.id === 'modal' || e.target.closest('#modalX')) return closeModal();
  if (e.target.closest('#btnSettings')) return settings();
  if (e.target.closest('#openProfileFromSettings')) { closeModal(); document.querySelector('#kpAccountOpen')?.click(); return; }
  const t = e.target.closest('[data-act]'); if (t && ACT[t.dataset.act] && !t.closest('#overlay')) ACT[t.dataset.act](t.dataset);
});
document.addEventListener('input', e => {
  const f = e.target.dataset.f; if (!f) return;
  if (f === 'mq') ui.mq = e.target.value; else if (f === 'fuse') ui.fuse = e.target.value; else { ui.cls[f] = e.target.value; ui.limit = 60; }
  const pos = e.target.selectionStart, id = e.target.id; render(true);
  const again = document.querySelector(`[data-f="${f}"]`); if (again && again.tagName === 'INPUT' && f !== 'show') { again.focus(); try { again.setSelectionRange(pos, pos); } catch (x) {} }
});
document.addEventListener('change', e => {
  const t = e.target;

  if (t.id === 'setAppearance') { localStorage.setItem('kp-appearance-'+(window.KP_AUTH?.userId||'guest'), t.value); document.documentElement.dataset.appearance = t.value; }
  if (t.id === 'setAnim') { anim = t.checked; localStorage.setItem('kp-anim', anim); document.body.classList.toggle('no-motion', !anim); }
  if (t.id === 'setSound') { S().sound = t.checked; KP.save(); }
  if (t.id === 'setFile' && t.files[0] && ['admin','owner'].includes(window.KP_AUTH?.role)) { const fr = new FileReader(); fr.onload = () => { const n = run(() => KP.importPlayers(fr.result)); if (n) { toast(`${fmt(n)} joueurs importés`); settings(); render(true); } }; fr.readAsText(t.files[0]); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#overlay').hidden) { $('#overlay').hidden = true; $('#overlay').innerHTML = ''; document.body.classList.remove('lock'); render(true); } else closeModal(); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'pkWrap') { e.preventDefault(); e.target.click(); }
});
window.addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
window.addEventListener('kp:state', wallet);
window.addEventListener('kp:account-switched',()=>{ const mode=localStorage.getItem('kp-appearance-'+(window.KP_AUTH?.userId||'guest'))||'dark';document.documentElement.dataset.appearance=mode;render(true);wallet();});
window.addEventListener('kp:collection-loaded',()=>{if(location.hash!=='#social')render(true);wallet();});

/* ---------- démarrage ---------- */
(function init() {
  const ref = new URLSearchParams(location.search).get('ref'); if (ref) KP.applyReferral(ref);
  applyTheme(window.KP_AUTH?.theme || 'normal');
  render(); wallet(); setInterval(wallet, 1000);
})();
})();

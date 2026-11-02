/* PULSEPACK — moteur de jeu (mode LOCAL : tout est dans le navigateur, idéal pour tester).
   En mode Supabase, ces mêmes règles vivent côté serveur (sql/schema.sql) pour empêcher la triche. */
(() => {
'use strict';
const CFG = Object.assign({ FREE_MAX: 10, FREE_EVERY_MIN: 5, START_GEMS: 300, START_COINS: 500, MARKET_FEE: 0.05 }, window.PULSEPACK_CONFIG || {});

/* ---------- joueurs ---------- */
const RARITIES = ['commune', 'rare', 'epique', 'legendaire', 'icone'];
const RLABEL = { commune: 'Commune', rare: 'Rare', epique: 'Épique', legendaire: 'Légendaire', icone: 'Icône' };
const RBASE = { commune: 20, rare: 90, epique: 350, legendaire: 1400, icone: 6000 };
const LEAGUES = { L1: 'Ligue 1', PL: 'Premier League', LL: 'La Liga', SA: 'Serie A', BL: 'Bundesliga', AUT: 'Autres ligues', LEG: 'Légendes' };
const POS = { BU:'Buteur',AG:'Ailier gauche',AD:'Ailier droit',AT:'Attaquant',MOC:'Milieu offensif central',MC:'Milieu central',MDC:'Milieu défensif central',MG:'Milieu gauche',MD:'Milieu droit',DG:'Défenseur gauche',DD:'Défenseur droit',DC:'Défenseur central',G:'Gardien',ATT:'Attaquant',MIL:'Milieu',DEF:'Défenseur',GAR:'Gardien' };
const ATTACK_POS = ['BU','AG','AD','AT','ATT']; const GOAL_POS = ['G','GAR'];
const rarityOf = p => p.league === 'LEG' ? 'icone' : p.rating >= 86 ? 'legendaire' : p.rating >= 82 ? 'epique' : p.rating >= 78 ? 'rare' : 'commune';
const valueOf = p => Math.round(RBASE[p.rarity] * (0.8 + p.rating / 100));
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const mkPlayer = (name, pos, nation, club, league, rating) => { const oldPos = {ATT:'BU',MIL:'MC',DEF:'DC',GAR:'G'}; pos = oldPos[pos] || pos; const p = { id: slug(name), name, pos, nation, club, league, rating: +rating }; p.rarity = rarityOf(p); p.value = valueOf(p); return p; };

let PLAYERS = [], BYID = {};
function setPlayers(list) { PLAYERS = list; BYID = Object.fromEntries(list.map(p => [p.id, p])); }
function parseRaw(txt) {
  return txt.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split(/[|;,\t]/).map(x => x.trim())).filter(a => a.length >= 6 && !isNaN(+a[5])).map(a => mkPlayer(...a));
}
const LS_PLAYERS = 'kp-players-v1';
function loadPlayers() {
  try { const c = localStorage.getItem(LS_PLAYERS); if (c) { const a = JSON.parse(c); if (Array.isArray(a) && a.length > 20 && !window.KP_TM_PLAYERS) { const base = Object.fromEntries(parseRaw(window.RAW_PLAYERS || '').map(p=>[p.id,p.pos])); setPlayers(a.map(p => mkPlayer(p.name, ['ATT','MIL','DEF','GAR'].includes(p.pos) ? (base[slug(p.name)] || p.pos) : p.pos, p.nation, p.club, p.league, p.rating))); return; } } } catch (e) {}
  // V42: ajouter le lot historique sans supprimer les joueurs déjà présents.
  const base = parseRaw(window.RAW_PLAYERS || '');
  const extra = (window.KP_TM_PLAYERS || []).map(a => {
    const p = mkPlayer(a[1], a[2], a[3], a[4], a[5], a[6]);
    p.id = 'tm-' + a[0]; p.photo = a[7]; p.sourceSeason = a[8]; p.source = 'transfermarkt-2026-07';
    return p;
  });
  setPlayers(base.concat(extra));
}
function importPlayers(text) {
  let list = [];
  try { const j = JSON.parse(text); list = (Array.isArray(j) ? j : []).map(p => mkPlayer(p.name, p.pos || 'MIL', p.nation || 'FR', p.club || '—', p.league || 'AUT', p.rating || 70)); }
  catch (e) { list = parseRaw(text); }
  if (list.length < 5) throw new Error('Fichier non reconnu (colonnes : Nom|Poste|Nation|Club|Ligue|Note)');
  localStorage.setItem(LS_PLAYERS, JSON.stringify(list)); setPlayers(list); return list.length;
}
function resetPlayers() { localStorage.removeItem(LS_PLAYERS); loadPlayers(); }

/* ---------- packs ---------- */
const BASE_RATES = { commune: 48, rare: 34, epique: 12, legendaire: 5.3, icone: 0.7 }; // V42: moins de communes, davantage de rares et plus
const PACKS = [
  { id: 'monde', name: 'Foot du Monde', sub: 'Tous les joueurs', icon: '🌍', hue: 140, cost: 120, size: 5, rates: BASE_RATES, guarantee: 'rare', filter: () => true, tag: 'featured' },
  { id: 'daily', name: 'Joueur du jour', sub: 'Un joueur boosté', icon: '⭐', hue: 48, cost: 150, size: 5, rates: BASE_RATES, guarantee: 'rare', filter: () => true, tag: 'daily' },
  { id: 'l1', name: 'Ligue 1', sub: 'Championnat français', icon: '🇫🇷', hue: 220, cost: 120, size: 5, rates: BASE_RATES, guarantee: 'rare', filter: p => p.league === 'L1', tag: 'ligue' },
  { id: 'pl', name: 'Premier League', sub: 'Championnat anglais', icon: '🦁', hue: 275, cost: 120, size: 5, rates: BASE_RATES, guarantee: 'rare', filter: p => p.league === 'PL', tag: 'ligue' },
  { id: 'll', name: 'La Liga', sub: 'Championnat espagnol', icon: '🇪🇸', hue: 10, cost: 120, size: 5, rates: BASE_RATES, guarantee: 'rare', filter: p => p.league === 'LL', tag: 'ligue' },
  { id: 'sa', name: 'Serie A', sub: 'Championnat italien', icon: '🇮🇹', hue: 195, cost: 120, size: 5, rates: BASE_RATES, guarantee: 'rare', filter: p => p.league === 'SA', tag: 'ligue' },
  { id: 'bl', name: 'Bundesliga', sub: 'Championnat allemand', icon: '🇩🇪', hue: 0, cost: 120, size: 5, rates: BASE_RATES, guarantee: 'rare', filter: p => p.league === 'BL', tag: 'ligue' },
  { id: 'att', name: 'Attaquants', sub: 'Les buteurs', icon: '🎯', hue: 345, cost: 120, size: 5, rates: BASE_RATES, guarantee: 'rare', filter: p => ATTACK_POS.includes(p.pos), tag: 'style' },
  { id: 'gar', name: 'Gardiens', sub: 'Derniers remparts', icon: '🧤', hue: 170, cost: 100, size: 5, rates: BASE_RATES, guarantee: 'rare', filter: p => GOAL_POS.includes(p.pos), tag: 'style' },
  { id: 'fr', name: 'Équipe de France', sub: 'Les Bleus', icon: '🐓', hue: 230, cost: 120, size: 5, rates: BASE_RATES, guarantee: 'rare', filter: p => p.nation === 'FR', tag: 'nation' },
  { id: 'br', name: 'Seleção', sub: 'Brésil', icon: '🇧🇷', hue: 95, cost: 120, size: 5, rates: BASE_RATES, guarantee: 'rare', filter: p => p.nation === 'BR', tag: 'nation' },
  { id: 'legendes', name: 'Légendes', sub: 'Icônes du football', icon: '👑', hue: 42, cost: 400, size: 5, rates: { commune: 0, rare: 0, epique: 0, legendaire: 0, icone: 100 }, guarantee: 'icone', filter: p => p.league === 'LEG', tag: 'epoque' },
  { id: 'elite', name: 'Élite', sub: '1 Légendaire garanti', icon: '💎', hue: 300, cost: 300, size: 5, rates: { commune: 12, rare: 43, epique: 31, legendaire: 12.5, icone: 1.5 }, guarantee: 'legendaire', filter: p => p.league !== 'LEG' || true, tag: 'style' },
];
const packById = id => PACKS.find(p => p.id === id);
const todayKey = () => new Date().toISOString().slice(0, 10);
function dailyPlayer() { const pool = PLAYERS.filter(p => p.rarity === 'epique' || p.rarity === 'legendaire'); let h = 0; for (const c of todayKey()) h = (h * 31 + c.charCodeAt(0)) >>> 0; return pool[h % pool.length]; }

/* ---------- état local ---------- */
const LEGACY_KEY = 'kp-state-v1';
let accountId = null;
let KEY = 'kp-state-guest-v25';
const rnd = n => Math.floor(Math.random() * n);
const pseudoDefault = () => 'Joueur' + (1000 + rnd(9000));
function fresh() {
  const pseudo = pseudoDefault();
  return { v: 1, pseudo, gems: CFG.START_GEMS, coins: CFG.START_COINS, free: { count: 3, next: 0 }, cards: [], serials: {}, wish: [], sound: true, theme: 'normal',
    listings: [], sold: [], bought: [], day: todayKey(), stats: { opened: 0, recycled: 0, listed: 0 }, claimed: {}, streak: 0, lastLogin: '', loginClaimed: '', refBy: '', refCode: slug(pseudo) + rnd(99), invited: 0, nid: 1 };
}
let S;
function load() { try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); } if (!S.v) S = fresh(); tick(); save(); }
function switchAccount(id) {
  const next = id ? String(id) : null;
  if (accountId === next) return;
  accountId = next;
  KEY = next ? 'kp-state-user-v25-' + next : 'kp-state-guest-v25';
  // Jamais de transfert automatique des anciennes cartes partagées entre comptes.
  // Les collections connectées sont rechargées depuis Supabase.
  if (!next) localStorage.removeItem(KEY);
  load();
  window.dispatchEvent(new Event('kp:account-switched'));
}
function switchAccount(id) {
  const next = id ? String(id) : null;
  if (accountId === next) return;
  accountId = next;
  KEY = next ? 'kp-state-user-v25-' + next : 'kp-state-guest-v25';
  // Jamais de transfert automatique des anciennes cartes partagées entre comptes.
  // Les collections connectées sont rechargées depuis Supabase.
  if (!next) localStorage.removeItem(KEY);
  load();
  window.dispatchEvent(new Event('kp:account-switched'));
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} window.dispatchEvent(new Event('kp:state')); }
function tick() {
  const now = Date.now(), ev = CFG.FREE_EVERY_MIN * 60000;
  if (S.free.count >= CFG.FREE_MAX) S.free.next = 0;
  else { if (!S.free.next) S.free.next = now + ev; while (S.free.count < CFG.FREE_MAX && now >= S.free.next) { S.free.count++; S.free.next += ev; } if (S.free.count >= CFG.FREE_MAX) S.free.next = 0; }
  if (S.day !== todayKey()) { S.day = todayKey(); S.stats = { opened: 0, recycled: 0, listed: 0 }; S.claimed = {}; }
  settleListings();
}
const uid = () => 'c' + (S.nid++) + '-' + Date.now().toString(36);
function giveCard(pid) { S.serials[pid] = (S.serials[pid] || 0) + 1 + rnd(40); const c = { id: uid(), pid, serial: S.serials[pid], at: Date.now() }; S.cards.push(c); return c; }
const owned = () => new Set(S.cards.map(c => c.pid));

/* ---------- tirage ---------- */
function rollRarity(rates, min) {
  const tot = RARITIES.reduce((a, r) => a + (rates[r] || 0), 0); let x = Math.random() * tot, out = 'commune';
  for (const r of RARITIES) { x -= rates[r] || 0; if (x < 0) { out = r; break; } }
  if (min && RARITIES.indexOf(out) < RARITIES.indexOf(min)) out = min;
  return out;
}
function pickPlayer(pack, rarity) {
  let pool = PLAYERS.filter(p => p.rarity === rarity && pack.filter(p));
  if (!pool.length) { const idx = RARITIES.indexOf(rarity); for (let d = 1; d < 5 && !pool.length; d++) for (const j of [idx - d, idx + d]) { const r = RARITIES[j]; if (r && !pool.length) pool = PLAYERS.filter(p => p.rarity === r && pack.filter(p)); } }
  if (!pool.length) pool = PLAYERS.filter(pack.filter);
  if (!pool.length) pool = PLAYERS;
  return pool[rnd(pool.length)];
}
function canAfford(pack, n, useFree) { tick(); if (useFree) return n === 1 && S.free.count > 0; return (S.giftPacks?.[pack.id]||0)>=n || S.gems >= pack.cost * n; }
function openPack(packId, n = 1, useFree = false) {
  if (window.KP_isRestricted?.('packs')) throw new Error('Ouverture de boosters interdite : une sanction est active sur ce compte.');
  const pack = packById(packId); tick();
  if (!canAfford(pack, n, useFree)) throw new Error(useFree ? 'Plus de boosters gratuits' : 'Pas assez de gemmes');
  if (useFree) { if (S.free.count >= CFG.FREE_MAX) S.free.next = Date.now() + CFG.FREE_EVERY_MIN * 60000; S.free.count--; } else if((S.giftPacks?.[pack.id]||0)>=n) S.giftPacks[pack.id]-=n; else S.gems -= pack.cost * n;
  const known = owned(), daily = dailyPlayer(), out = [];
  for (let k = 0; k < n; k++) for (let i = 0; i < pack.size; i++) {
    const min = i === pack.size - 1 ? pack.guarantee : null;
    let p;
    if (pack.tag === 'daily' && Math.random() < 0.14) p = daily; else p = pickPlayer(pack, rollRarity(pack.rates, min));
    const c = giveCard(p.id); out.push({ card: c, player: p, isNew: !known.has(p.id) }); known.add(p.id);
  }
  S.stats.opened += n; save(); return out;
}

/* ---------- classeur : recyclage / fusion ---------- */
function duplicates() { const seen = new Set(), d = []; for (const c of [...S.cards].sort((a, b) => a.at - b.at)) { if (seen.has(c.pid) && !S.wish.includes('lock:' + c.id)) d.push(c); else seen.add(c.pid); } return d; }
const recycleValue = p => Math.max(5, Math.round(p.value * 0.25));
function recycleCards(ids) {
  const set = new Set(ids); let gain = 0, n = 0;
  S.cards = S.cards.filter(c => { if (!set.has(c.id)) return true; gain += recycleValue(BYID[c.pid]); n++; return false; });
  S.coins += gain; S.stats.recycled += n; save(); return { gain, n };
}
function fuse(ids) {
  if (ids.length !== 5) throw new Error('Sélectionne exactement 5 cartes');
  const cs = ids.map(id => S.cards.find(c => c.id === id)); if (cs.some(c => !c)) throw new Error('Carte introuvable');
  const r = BYID[cs[0].pid].rarity; if (cs.some(c => BYID[c.pid].rarity !== r)) throw new Error('Les 5 cartes doivent avoir la même rareté');
  const next = RARITIES[RARITIES.indexOf(r) + 1]; if (!next || next === 'icone') throw new Error('Cette rareté ne peut pas être fusionnée');
  const known = owned(); S.cards = S.cards.filter(c => !ids.includes(c.id)); S.stats.recycled += 5;
  const p = pickPlayer({ filter: () => true }, next); const c = giveCard(p.id); save(); return { card: c, player: p, isNew: !known.has(p.id) };
}
function toggleWish(pid) { const i = S.wish.indexOf(pid); if (i >= 0) S.wish.splice(i, 1); else S.wish.push(pid); save(); }

/* ---------- marché (simulé en local) ---------- */
let MARKET = [];
function seedMarket() { MARKET = []; }
function market() { return []; } // Aucun vendeur fictif : marché public désactivé jusqu'au marché Supabase.
function listCard(cardId, price) {
  throw new Error('Marché désactivé : aucun acheteur fictif. Les échanges entre vrais comptes seront activés après sécurisation.');
  const c = S.cards.find(x => x.id === cardId); if (!c) throw new Error('Carte introuvable'); price = Math.round(price); if (!(price >= 1)) throw new Error('Prix invalide');
  S.cards = S.cards.filter(x => x.id !== cardId); S.listings.push({ id: 'my' + uid(), card: c, pid: c.pid, price, seller: S.pseudo, at: Date.now() }); S.stats.listed++; save();
}
function cancelListing(id) { const l = S.listings.find(x => x.id === id); if (!l) return; S.listings = S.listings.filter(x => x !== l); S.cards.push(l.card); save(); }
function settleListings() { /* Pas d'acheteur automatique : les annonces locales ne se vendent pas. */ }
function buy() { throw new Error('Le marché entre joueurs nécessite le marché Supabase.'); }

/* ---------- missions & connexion quotidienne ---------- */
const LOGIN_REWARDS = [{ g: 30 }, { c: 50 }, { g: 40, f: 1 }, { c: 100 }, { g: 60 }, { c: 150 }, { g: 150, f: 2 }];
const MISSIONS = [
  { id: 'o1', label: 'Ouvrir 1 booster', stat: 'opened', goal: 1, g: 10 },
  { id: 'o3', label: 'Ouvrir 3 boosters', stat: 'opened', goal: 3, g: 20 },
  { id: 'o10', label: 'Ouvrir 10 boosters', stat: 'opened', goal: 10, g: 40 },
  { id: 'r5', label: 'Recycler ou fusionner 5 doublons', stat: 'recycled', goal: 5, c: 80 },
  { id: 'l1', label: 'Mettre une carte en vente au marché', stat: 'listed', goal: 1, c: 60 },
];
function loginState() {
  const t = todayKey(), y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const can = S.loginClaimed !== t; const streak = S.loginClaimed === t || S.loginClaimed === y ? S.streak : 0;
  return { can, streak, day: can ? (streak % 7) : ((S.streak - 1 + 7) % 7) };
}
function claimLogin() {
  const st = loginState(); if (!st.can) throw new Error('Déjà récupéré aujourd’hui');
  const r = LOGIN_REWARDS[st.streak % 7]; S.streak = st.streak + 1; S.loginClaimed = todayKey();
  S.gems += r.g || 0; S.coins += r.c || 0; if (r.f) S.free.count = Math.min(CFG.FREE_MAX, S.free.count + r.f); save(); return r;
}
function claimMission(id) { const m = MISSIONS.find(x => x.id === id); if (!m || S.claimed[id] || S.stats[m.stat] < m.goal) return false; S.claimed[id] = 1; S.gems += m.g || 0; S.coins += m.c || 0; save(); return true; }
function claimAll() { let g = 0, c = 0; for (const m of MISSIONS) if (!S.claimed[m.id] && S.stats[m.stat] >= m.goal) { claimMission(m.id); g += m.g || 0; c += m.c || 0; } return { g, c }; }

/* ---------- classement ---------- */
const collectionValue = () => { const seen = new Set(); let v = 0; for (const c of S.cards) if (!seen.has(c.pid)) { seen.add(c.pid); v += BYID[c.pid].value; } return v; };
function leaderboard(mode) {
 const mine={name:window.KP_AUTH?.pseudo||S.pseudo,cards:S.cards.length,score:mode==='week'?Math.round(collectionValue()*0.4):collectionValue(),me:true,rank:1};
 return [mine]; // Pas de classement fictif ; affichage des comptes réels à venir.
}
/* ---------- parrainage ---------- */
const TIERS = [{ n: 1, name: 'Remplaçant', gems: 0 }, { n: 3, name: 'Titulaire', gems: 600 }, { n: 5, name: 'Capitaine', gems: 1000 }, { n: 10, name: 'Ballon d’Or', gems: 2000 }, { n: 25, name: 'Légende', gems: 0 }];
function applyReferral(code) {
  return false; // V58 : jamais de crédit local pour un parrainage
}
function simulateInvite() { return false; } // V58 : simulation désactivée

/* ---------- divers ---------- */
function setPseudo(p) { p = (p || '').trim().slice(0, 24); if (p.length < 3) throw new Error('3 caractères minimum'); S.pseudo = p; S.refCode = slug(p) + (S.refCode.match(/\d+$/) || ['1'])[0]; save(); }
function reset() { localStorage.removeItem(KEY); load(); }
function replaceCards(cards) { S.cards = Array.isArray(cards) ? cards.filter(c=>c && BYID[c.pid] && typeof c.id === "string") : []; S.nid = Math.max(S.nid, S.cards.length+1); save(); }
function grant(g, c) { S.gems += g; S.coins += c; save(); }

loadPlayers(); load(); seedMarket();
window.KP = { CFG, RARITIES, RLABEL, LEAGUES, POS, PACKS, packById, get PLAYERS() { return PLAYERS; }, get BYID() { return BYID; }, get S() { return S; }, tick, save, owned, openPack, canAfford, duplicates, recycleValue, recycleCards, fuse, toggleWish, market, seedMarket, listCard, cancelListing, buy, LOGIN_REWARDS, MISSIONS, loginState, claimLogin, claimMission, claimAll, collectionValue, leaderboard, TIERS, applyReferral, simulateInvite, setPseudo, reset, switchAccount, grant, importPlayers, resetPlayers, replaceCards, dailyPlayer, rarityOf, slug };
})();

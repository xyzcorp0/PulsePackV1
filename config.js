// PULSEPACK — configuration.
// Mode LOCAL (par défaut) : tout fonctionne dans le navigateur, sans serveur.
// Mode SUPABASE (comptes + économie sécurisée + marché partagé) : renseigne les 2 valeurs PUBLIQUES ci-dessous
// après avoir exécuté sql/schema.sql dans un NOUVEAU projet Supabase. Ne mets JAMAIS la clé service_role ici.
window.KICKPACK_SUPABASE_URL = 'https://gdwcmrybdstirkxqerss.supabase.co';
window.KICKPACK_SUPABASE_ANON_KEY = 'sb_publishable_QyGkW7iQgA-Iaidjg34CJQ_3_qN49Jh';

// Réglages de l'économie (mode local ; en mode Supabase ils sont dans le SQL)
window.KICKPACK_CONFIG = {
  FREE_MAX: 10,          // boosters gratuits stockables
  FREE_EVERY_MIN: 5,    // +1 booster gratuit toutes les X minutes
  START_GEMS: 300,
  START_COINS: 500,
  MARKET_FEE: 0.05       // commission du marché
};

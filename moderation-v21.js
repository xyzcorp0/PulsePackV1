/* Affichage des sanctions de l’utilisateur connecté. */
(()=>{'use strict';let last='';let checking=false;
const css=document.createElement('style');css.textContent=`#kpBanNotice{position:fixed;right:16px;bottom:16px;z-index:99999;max-width:min(380px,calc(100vw - 32px));background:#430f19;border:1px solid #f04458;color:#fff;border-radius:14px;padding:15px 18px;box-shadow:0 12px 40px #0009;font:600 13px/1.5 Inter,Manrope,sans-serif}#kpBanNotice strong{display:block;font-size:15px;margin-bottom:5px}#kpBanNotice small{display:block;opacity:.85;margin-top:6px}`;document.head.append(css);
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function check(){if(checking)return;checking=true;try{const auth=window.KP_AUTH;if(!auth?.userId){document.querySelector('#kpBanNotice')?.remove();window.KP_BANS=[];return;}
const c=window.__kpBanDB||(window.__kpBanDB=window.supabase?.createClient(window.KICKPACK_SUPABASE_URL,window.KICKPACK_SUPABASE_ANON_KEY));if(!c)return;
const {data:{session}}=await c.auth.getSession();if(!session)return;
const {data,error}=await c.rpc('kp_my_sanctions');if(error)return;window.KP_BANS=Array.isArray(data)?data:[];
const key=JSON.stringify(window.KP_BANS);if(key===last)return;last=key;
let box=document.querySelector('#kpBanNotice');if(!window.KP_BANS.length){box?.remove();return;}
if(!box){box=document.createElement('div');box.id='kpBanNotice';box.setAttribute('role','alert');document.body.append(box);}
box.innerHTML='<strong>⛔ Restriction de compte</strong>'+window.KP_BANS.map(x=>`<div><b>${esc(({all:'Compte entier',trades:'Échanges',transfers:'Transferts',packs:'Ouverture de packs',market:'Marché'})[x.scope]||x.scope)}</b> : ${esc(x.reason)}<small>Staff : ${esc(x.staff_pseudo)} · ${x.expires_at?'Jusqu’au '+esc(new Date(x.expires_at).toLocaleString('fr-FR')):'Permanent'}</small></div>`).join('<hr style="border-color:#9f3445">');}finally{checking=false;}}
window.KP_isRestricted=scope=>(window.KP_BANS||[]).some(x=>(x.scope==='all'||x.scope===scope)&&(!x.expires_at||new Date(x.expires_at).getTime()>Date.now()));
const labels={packs:'Ouverture des packs',trades:'Échanges',transfers:'Transferts et cadeaux',market:'Marché'};
function showPersistentAlert(html){
 let box=document.getElementById('kpBanFlash');
 if(!box){box=document.createElement('div');box.id='kpBanFlash';box.setAttribute('role','alert');box.setAttribute('aria-live','assertive');document.body.append(box);}
 box.innerHTML='<button type="button" class="kp-ban-close" aria-label="Fermer le message" title="Fermer">×</button>'+html;
 box.querySelector('.kp-ban-close').addEventListener('click',()=>box.remove(),{once:true});
 box.classList.remove('kp-ban-flash-on');void box.offsetWidth;box.classList.add('kp-ban-flash-on');
 return box;
}
function durationLabel(x){
 if(!x?.expires_at)return 'Permanent';
 const remaining=new Date(x.expires_at).getTime()-Date.now();
 if(remaining<=0)return 'Expirée';
 const d=Math.ceil(remaining/86400000),h=Math.ceil(remaining/3600000),m=Math.ceil(remaining/60000);
 return d>=2?d+' jours restants':h>=2?h+' heures restantes':m+' minutes restantes';
}
function blocked(scope){
 if(!window.KP_isRestricted(scope))return false;
 const reason=(window.KP_BANS||[]).find(x=>(x.scope===scope||x.scope==='all')&&(!x.expires_at||new Date(x.expires_at).getTime()>Date.now()));
 const action=labels[scope]||'Cette action';
 showPersistentAlert('<div class="kp-ban-warning-icon" aria-hidden="true">⚠</div><strong>'+esc(action)+' interdit'+(scope==='trades'?'s':'')+'</strong><span>Une sanction active empêche cette action.</span><div class="kp-ban-details"><div><b>Motif :</b> '+esc(reason?.reason||'Non communiqué')+'</div><div><b>Durée :</b> '+esc(durationLabel(reason))+'</div><div><b>Sanction appliquée par :</b> '+esc(reason?.staff_pseudo||'Staff')+'</div></div>');
 return true;
}
window.KP_showBanWarning=blocked;
let gateBusy=false;
window.KP_authorizeAction=async function(scope){
 if(gateBusy)return false;
 gateBusy=true;
 try{
  const auth=window.KP_AUTH;
  if(!auth?.userId){
   // Tant que l'authentification n'est pas initialisée, ne pas autoriser les actions.
   const c=window.__kpBanDB||(window.__kpBanDB=window.supabase?.createClient(window.KICKPACK_SUPABASE_URL,window.KICKPACK_SUPABASE_ANON_KEY));
   if(!c)return false;
   const {data,error}=await c.auth.getSession();
   if(error||!data?.session)return false;
  }
  const c=window.__kpBanDB||(window.__kpBanDB=window.supabase?.createClient(window.KICKPACK_SUPABASE_URL,window.KICKPACK_SUPABASE_ANON_KEY));
  if(!c)return false;
  const {data,error}=await c.rpc('kp_v38_action_allowed',{p_scope:scope});
  if(error){console.warn('PULSEPACK contrôle sanction:',error.message);window.KP_showSecurityError?.('Vérification de la sanction impossible. Réessaie.');return false;}
  if(data!==true){await check();if(!blocked(scope))window.KP_showSecurityError?.('Action interdite : sanction active.');return false;}
  return true;
 }catch(err){console.warn('PULSEPACK contrôle sanction:',err);window.KP_showSecurityError?.('Connexion à Supabase indisponible. Action refusée.');return false;}
 finally{gateBusy=false;}
};
window.KP_showSecurityError=function(message){showPersistentAlert('<strong>⛔ Action bloquée</strong><span>'+esc(message)+'</span>');};

// Bloque les actions identifiées, sans alert() natif ni rafraîchissement de page.
document.addEventListener('click',e=>{
 const t=e.target.closest('button,a,[data-action],[data-trade-action]');if(!t)return;
 const act=(t.dataset.action||t.dataset.tradeAction||'').toLowerCase();
 const txt=(t.textContent||'').toLowerCase();
 const scope=act==='open'||/ouvrir|open|booster/.test(txt)?'packs':
 /trade|exchange|échange|proposition/.test(act+' '+txt)?'trades':
 /transfer|gift|cadeau|transfert/.test(act+' '+txt)?'transfers':
 /^(sell|buy|unlist|mt|lb)$/.test(act)||/acheter|vendre|mettre en vente/.test(txt)?'market':null;
 if(scope&&blocked(scope)){e.preventDefault();e.stopImmediatePropagation();}
},true);
const style=document.createElement('style');style.textContent=`
#kpBanFlash{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;width:min(770px,calc(100vw - 34px));box-sizing:border-box;text-align:center;background:#310b17;color:#fff;border:2px solid #ff405b;border-radius:17px;padding:43px 20px 20px;box-shadow:0 0 40px #ff274455,0 18px 70px #000b;font:500 14px/1.6 Inter,Manrope,sans-serif;pointer-events:auto;opacity:1}
#kpBanFlash strong{display:block;color:#ff7287;font-size:17px;margin:8px 0 9px;font-weight:800}#kpBanFlash span{display:block}#kpBanFlash .kp-ban-warning-icon{color:#ff6379;font-size:25px;line-height:1.2}#kpBanFlash .kp-ban-details{border-top:1px solid #863245;margin-top:17px;padding-top:14px;font-size:13px;line-height:2.1}#kpBanFlash .kp-ban-details b{font-weight:800}
#kpBanFlash.kp-ban-flash-on{animation:none;opacity:1}
#kpBanFlash .kp-ban-close{position:absolute;top:10px;right:12px;border:0;background:transparent;color:#ff8393;font-size:22px;line-height:1;width:28px;height:28px;cursor:pointer;display:grid;place-items:center}
#kpBanFlash .kp-ban-close:hover,#kpBanFlash .kp-ban-close:focus-visible{background:#671728;border-radius:7px;outline:2px solid #ff8393;outline-offset:2px}
@keyframes kp-ban-blink{0%,100%{opacity:1;box-shadow:0 0 18px #ff304477,0 18px 70px #000b}50%{opacity:.55;box-shadow:0 0 45px #ff3044cc,0 18px 70px #000b}}
@media(prefers-reduced-motion:reduce){#kpBanFlash.kp-ban-flash-on{animation:none;opacity:1}}
`;document.head.append(style);
setInterval(check,5000);setTimeout(check,0);})();

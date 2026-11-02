/* PulsePack V59 : codes personnels, accueil filleul, statistiques Supabase. */
(()=>{'use strict';
const url=window.KICKPACK_SUPABASE_URL,key=window.KICKPACK_SUPABASE_ANON_KEY;
if(!url||!key||!window.supabase)return;
// Client Supabase partagé par session via localStorage.
const db=window.supabase.createClient(url,key);
const $=s=>document.querySelector(s);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let code='',stats={invited:0},pending='',inviter='';
const api={get code(){return code},get stats(){return stats},showInvite,clearInvite};window.KP_REFERRAL=api;
function clearInvite(){pending='';inviter='';sessionStorage.removeItem('kp-referral-pending');}
function showInvite(){if(!pending||!inviter)return;const root=$('#kpAuthBody');if(!root)return;let el=$('#kpReferralNotice');if(!el){el=document.createElement('div');el.id='kpReferralNotice';el.style.cssText='padding:14px;margin:10px 0;border:1px solid #ff9a26;border-radius:12px;background:#271b16;color:#fff';root.prepend(el);}el.textContent='🎁 Vous avez été parrainé par '+inviter+' ! Créez un compte pour recevoir 240 💎.';}
async function initInvite(){const fromUrl=new URLSearchParams(location.search).get('ref');pending=(fromUrl||sessionStorage.getItem('kp-referral-pending')||'').trim();if(!pending)return;
if(fromUrl)sessionStorage.setItem('kp-referral-pending',pending);
const {data,error}=await db.rpc('kp_v59_lookup_referrer',{p_code:pending});
if(error||!data){console.warn('Lien de parrainage invalide ou migration V59 manquante',error);return;}
inviter=data;const {data:{session}}=await db.auth.getSession();if(session?.user)return;
// Ouvrir le panneau de connexion dès l'arrivée depuis un lien de parrainage.
const button=$('#kpAccountOpen');if(button)button.click();else {const modal=$('#kpAuthModal');if(modal)modal.hidden=false;}
setTimeout(showInvite,150);
}
async function refresh(){const {data:{session}}=await db.auth.getSession();if(!session?.user){code='';stats={invited:0};}else{
code=session.user.id;const r=await db.rpc('kp_v59_my_referral_stats');if(!r.error&&r.data)stats={invited:Number(r.data.invited)||0};}
window.dispatchEvent(new Event('kp:referral-loaded'));
}
window.addEventListener('load',()=>{initInvite().catch(console.warn);refresh().catch(console.warn)});
db.auth.onAuthStateChange(()=>setTimeout(()=>refresh().catch(console.warn),150));
})();

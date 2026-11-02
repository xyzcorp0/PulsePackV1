/* PULSEPACK — comptes par pseudo + mot de passe, rôles et thème partagé Supabase. */
(() => {
'use strict';
const url=window.KICKPACK_SUPABASE_URL, key=window.KICKPACK_SUPABASE_ANON_KEY;
const client=url&&key&&window.supabase?window.supabase.createClient(url,key):null;
const THEMES=['normal','halloween','christmas','newyear','birthday','easter'];
const NAMES={normal:'Normal',halloween:'Halloween',christmas:'Noël',newyear:'Nouvel An',birthday:'Anniversaire',easter:'Pâques'};
const $=s=>document.querySelector(s);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user=null,role='guest',theme='normal',pseudo='',pseudoChangedAt=null,birthdayName='',birthdayMessage='';
// Auth Supabase requiert un identifiant email : pseudo canonique -> email technique déterministe.
// Le domaine est réservé à l'application. Confirmation email doit être désactivée pour ces comptes.
const username=s=>String(s||'').trim().toLowerCase();
const valid=s=>/^[a-z0-9_]{3,24}$/.test(username(s));
const technicalEmail=s=>`${username(s)}@users.kickpack.app`;
function apply(t){theme=THEMES.includes(t)?t:'normal';document.body.classList.remove(...THEMES.filter(x=>x!=='normal'));if(theme!=='normal')document.body.classList.add(theme);document.documentElement.dataset.theme=theme;renderBirthday();}
function renderBirthday(){const box=$('#bdayBanner');if(!box)return;const k=birthdayName+'|'+birthdayMessage;let closed=false;try{closed=sessionStorage.getItem('kp-bday-closed')===k;}catch(e){}box.hidden=theme!=='birthday'||!(birthdayName||birthdayMessage)||closed;if(!box.hidden){$('#bdayTitle').textContent=birthdayName?'Joyeux anniversaire '+birthdayName+' !':birthdayMessage;$('#bdayMsg').textContent=birthdayName?birthdayMessage:'';}}

async function loadTheme(){
 if(!client)return;
 const {data,error}=await client.from('kp_site_settings').select('theme,birthday_name,birthday_message').eq('id',1).single();
 if(error){console.warn('PULSEPACK: lecture du thème public impossible (vérifier la migration SQL V57)',error);return;}
 if(data){birthdayName=data.birthday_name||'';birthdayMessage=data.birthday_message||'';apply(data.theme);}
}
function render(){const el=$('#kpAccount');if(!el)return;el.innerHTML=!client?'<span class="kp-role">Démo locale · configurer Supabase</span>':user?`<span class="kp-role">${safe(pseudo||'Joueur')} · ${safe(role)}</span><button id="kpLogout" class="btn-o">Déconnexion</button><button id="kpAccountOpen" class="btn-o">${role==='owner'?'Owner':role==='admin'?'Admin':'Compte'}</button>`:'<div class="kp-welcome-promo"><button id="kpAccountOpen" class="btn-p">Connexion / inscription</button><span class="kp-welcome-text">🎁 Nouveau ? <b>1 000 💎 + 10 packs offerts</b> à ta première connexion !</span></div>';}
// V34: aucune requête momentanément échouée ne doit transformer un compte connecté en invité.
let refreshSequence=0;
async function refresh(forceSignOut=false){
 if(!client){render();return;}
 const seq=++refreshSequence;
 let result;
 try { result=await client.auth.getSession(); }
 catch(err){ console.warn('PULSEPACK: session temporairement indisponible',err);return; }
 if(seq!==refreshSequence)return;
 const sessionUser=result?.data?.session?.user||null;
 if(result.error){console.warn('PULSEPACK: lecture session',result.error);return;}
 if(!sessionUser && !forceSignOut && user){
   // Une session absente doit être confirmée : ne pas effacer le profil sur une anomalie transitoire.
   const check=await client.auth.getSession();
   if(seq!==refreshSequence || check.error)return;
   if(check.data?.session?.user)return refresh();
 }
 if(!sessionUser){
   user=null;role='guest';pseudo='';pseudoChangedAt=null;
   window.KP?.switchAccount(null);render();return;
 }
 const changed=user?.id!==sessionUser.id;
 // Garder le rôle et le pseudo déjà affichés pendant les requêtes asynchrones.
 if(changed){user=sessionUser;role='member';pseudo=sessionUser.user_metadata?.pseudo||'Joueur';pseudoChangedAt=null;window.KP?.switchAccount(sessionUser.id);render();}
 let roleResult,profileResult;
 try{
   [roleResult,profileResult]=await Promise.all([
     client.rpc('kp_my_role'),
     client.from('kp_profiles').select('pseudo,pseudo_changed_at').eq('user_id',sessionUser.id).maybeSingle()
   ]);
 }catch(err){console.warn('PULSEPACK: profil temporairement indisponible',err);return;}
 if(seq!==refreshSequence)return;
 if(roleResult.error||profileResult.error){console.warn('PULSEPACK: profil/rôle',roleResult.error,profileResult.error);return;}
 user=sessionUser;
 role=roleResult.data||role||'member';
 pseudo=profileResult.data?.pseudo||pseudo||sessionUser.user_metadata?.pseudo||'Joueur';
 pseudoChangedAt=profileResult.data?.pseudo_changed_at||null;
 render();
 // Le thème global est indépendant de l'état d'authentification.
 loadTheme().catch(err=>console.warn('PULSEPACK: thème',err));
}
const notice=msg=>{const n=$('#kpAuthNotice');if(n)n.textContent=msg;};
async function panel(){if(!client)return;const admin=role==='admin'||role==='owner';const members=[];const membersError=null; // V46: chargement des comptes sur demande, sans bloquer l'ouverture du panneau
const nextPseudoDate=pseudoChangedAt?new Date(new Date(pseudoChangedAt).getTime()+14*86400000):null;
const canRename=!nextPseudoDate||Date.now()>=nextPseudoDate.getTime();
const profileHTML=user?`<h3>Mon profil</h3><p>Pseudo public actuel : <b>${safe(pseudo)}</b>. Ton pseudo actuel sert aussi à te connecter.</p><label>Nouveau pseudo public<input id="kpNewPseudo" maxlength="24" minlength="3" pattern="[a-zA-Z0-9_]{3,24}" value="${safe(pseudo)}" ${canRename?'':'disabled'}></label><p class="kp-role">${canRename?'Tu peux changer ton pseudo maintenant.':'Prochain changement possible le '+nextPseudoDate.toLocaleDateString('fr-FR')+'.'}</p><button id="kpSavePseudo" class="btn-o" ${canRename?'':'disabled'}>Enregistrer le pseudo</button>`:'';
const adminTools=admin?`<h3>Administration · Outils de test</h3><p>Ces outils agissent sur les données locales du navigateur. Ils ne modifient pas les collections des autres utilisateurs.</p><div class="row"><button type="button" id="kpGrant" class="btn-o">+1000 💎 +1000 🪙</button><button type="button" id="kpReset" class="btn-o">Réinitialiser ma progression locale</button></div><h3>Base de joueurs</h3><p>Importer un CSV/JSON de joueurs (données locales).</p><div class="row"><input id="kpImportPlayers" type="file" accept=".csv,.txt,.json"><button id="kpResetPlayers" class="btn-o">Remettre la démo</button></div>`:'';
const collectionTools=admin?`<section class="kp-collection-admin"><h3>🗂 Administration des collections</h3><p>Gérer les cartes d’un compte par son pseudo. Les modifications sont enregistrées sur Supabase et visibles sur ses appareils connectés.</p><label>Pseudo du joueur<input id="kpTargetPseudo" placeholder="Pseudo exact" maxlength="30" autocomplete="off"></label><label>Carte à gérer<input id="kpPlayerSearch" placeholder="Rechercher Mbappé, Messi…" autocomplete="off"><select id="kpPlayerSelect" size="5" aria-label="Choisir un joueur">${window.KP.PLAYERS.slice(0,80).map(p=>`<option value="${safe(p.id)}">${safe(p.name)} · ${safe(p.pos)} · ${safe(p.club)}</option>`).join('')}</select></label><label>Quantité<input id="kpCardQuantity" type="number" min="1" max="100" value="1"></label><div class="kp-admin-actions"><button class="btn-o" data-kpcoll="inspect">Voir la collection</button><button class="btn-p" data-kpcoll="give">Donner la carte</button><button class="btn-o" data-kpcoll="remove">Retirer la quantité</button><button class="btn-o" data-kpcoll="remove_all">Retirer toutes les copies</button><button class="btn-p" data-kpcoll="unlock">Unlock all (140 cartes)</button><button class="btn-o kp-danger" data-kpcoll="clear">Vider toute la collection</button></div><div id="kpCollectionResult" role="status"></div></section>`:'';
const rewardTools=admin?`<section class="kp-collection-admin"><h3>💎 Administration des récompenses</h3><p>Donner des gemmes 💎, des boosters classiques ou des boosters gratuits ⏳ (maximum 10 boosters par opération).</p><label>Pseudo destinataire<input id="kpRewardPseudo" placeholder="Pseudo exact" maxlength="24"></label><label>Gemmes 💎 (quantité libre, entière et positive)<input id="kpRewardGems" type="number" min="0" max="9007199254740991" value="0"></label><label>Type de booster<select id="kpRewardPack"><option value="free">⏳ Boosters gratuits (compteur 3/10)</option>${window.KP.PACKS.map(p=>`<option value="${safe(p.id)}">${safe(p.name)}</option>`).join('')}</select></label><label>Nombre de boosters (0 à 10)<input id="kpRewardPacks" type="number" min="0" max="10" value="0"></label><button type="button" class="btn-p" id="kpSendReward">Envoyer les récompenses</button><p id="kpRewardResult" role="status"></p></section>`:'';
const moderationTools=role==='owner'?`<section class="kp-collection-admin"><h3>🛡️ Modération des comptes · Owner</h3><p>Sanction temporaire ou permanente, globale ou limitée à une fonctionnalité. La raison et le pseudo du staff sont affichés au joueur.</p><label>Pseudo exact<input id="kpModPseudo" maxlength="24" placeholder="johndoe"></label><label>Restriction<select id="kpModScope"><option value="all">Compte entier</option><option value="trades">Échanges</option><option value="transfers">Transferts / cadeaux</option><option value="packs">Ouverture des packs</option><option value="market">Marché</option></select></label><label>Durée<select id="kpModDuration"><option value="permanent">Permanent</option><option value="1">1 heure</option><option value="24">24 heures</option><option value="168">7 jours</option><option value="720">30 jours</option></select></label><label>Raison obligatoire<textarea id="kpModReason" maxlength="500" placeholder="Motif précis de la sanction"></textarea></label><div class="kp-admin-actions"><button type="button" id="kpModBan" class="btn-p">Bannir / restreindre</button><button type="button" id="kpModUnban" class="btn-o">Débannir (restriction choisie)</button><button type="button" id="kpModInspect" class="btn-o">Voir les sanctions</button></div><p id="kpModResult" role="status"></p><h3>Suppression définitive</h3><p>Supprime définitivement ce compte. Cette action est irréversible.</p><button type="button" id="kpModDelete" class="btn-o kp-danger">Supprimer définitivement ce compte</button></section>`:'';
const list=(members||[]).map(m=>`<div class="kp-member"><span>${safe(m.pseudo)} · ${safe(m.role)}</span>${m.role!=='owner'?`<button class="btn-o" data-kprole="${m.role==='admin'?'member':'admin'}" data-kpuid="${safe(m.user_id)}">${m.role==='admin'?'Rétrograder':'Promouvoir admin'}</button>`:''}</div>`).join('');
$('#kpAuthBody').innerHTML=`<h2>${user?'Mon compte':'Bienvenue sur PULSEPACK'}</h2><p>${user?`${safe(pseudo)} · ${safe(role)}`:'Connecte-toi avec ton pseudo et ton mot de passe.'}</p><p id="kpAuthNotice" role="status"></p>${!user?`<form id="kpLoginForm"><label>Pseudo<input name="pseudo" autocomplete="username" placeholder="ex : johndoe" minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]{3,24}" required></label><label>Mot de passe<input type="password" name="password" autocomplete="current-password" placeholder="8 caractères minimum" minlength="8" required></label><div class="row"><button type="submit" class="btn-p" name="action" value="login">Se connecter</button><button type="submit" class="btn-o" name="action" value="signup">Créer mon compte</button></div><small>Le pseudo contient 3 à 24 lettres non accentuées, chiffres ou _.</small><p class="kp-password-warning"><strong>La récupération d'un mot de passe perdu n'est pas disponible.</strong></p></form>`:''}${profileHTML}${adminTools}${collectionTools}${rewardTools}${moderationTools}${admin?`<h3>Thème du site (pour tout le monde)</h3><div class="kp-theme-controls"><label>Thème global<select id="kpGlobalTheme" aria-label="Thème global">${THEMES.map(t=>`<option value="${t}" ${t===theme?'selected':''}>${NAMES[t]}</option>`).join('')}</select></label><div class="kp-bday-fields" id="kpBirthdayFields" ${theme==='birthday'?'':'hidden'}><label>Prénom de la personne<input id="kpBirthdayName" maxlength="40" placeholder="Ex. : johndoe" value="${safe(birthdayName)}"></label><label>Petit mot / message<textarea id="kpBirthdayMessage" maxlength="140" placeholder="Joyeux anniversaire !">${safe(birthdayMessage)}</textarea></label></div><button type="button" id="kpThemeApply" class="btn-p">Appliquer à tout le monde</button></div>`:''}${role==='owner'?`<h3>Gestion des administrateurs</h3><p>Seuls les comptes inscrits peuvent devenir admins.</p><button type="button" class="btn-o" id="kpLoadMembers">Charger les comptes</button><div id="kpMembersList"></div>`:''}`;
$('#kpAuthModal').hidden=false;window.KP_REFERRAL?.showInvite?.();}
document.addEventListener('click',async e=>{
 if(e.target.id==='kpSavePseudo'&&user){const name=username($('#kpNewPseudo').value);if(!valid(name)){notice('Pseudo : 3 à 24 caractères (lettres, chiffres, _).');return;}e.target.disabled=true;const {error}=await client.rpc('kp_change_pseudo',{new_pseudo:name});if(error){notice('Erreur : '+error.message);e.target.disabled=false;return;}await refresh();await panel();notice('Pseudo et identifiant de connexion modifiés. Utilise désormais '+name+' pour te connecter. Prochain changement dans 14 jours.');}
 if(!['admin','owner'].includes(role))return;
 if(e.target.id==='kpGrant'){window.KP.grant(1000,1000);notice('Crédits de test ajoutés à ta session locale.');}
 if(e.target.id==='kpReset'&&confirm('Effacer ta progression locale ?')){window.KP.reset();notice('Progression locale réinitialisée.');}
 if(e.target.id==='kpResetPlayers'){window.KP.resetPlayers();notice('Base de démonstration restaurée.');}
});
document.addEventListener('input',e=>{
 if(e.target.id!=='kpPlayerSearch')return;
 const term=e.target.value.trim().toLocaleLowerCase('fr');const sel=$('#kpPlayerSelect');if(!sel)return;
 const found=window.KP.PLAYERS.filter(p=>(p.name+' '+p.pos+' '+p.club).toLocaleLowerCase('fr').includes(term)).slice(0,80);
 sel.innerHTML=found.map(p=>`<option value="${safe(p.id)}">${safe(p.name)} · ${safe(p.pos)} · ${safe(p.club)}</option>`).join('');
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-kpcoll]');if(!b||!['admin','owner'].includes(role)||!client)return;
 const op=b.dataset.kpcoll,target=$('#kpTargetPseudo')?.value.trim(),pid=$('#kpPlayerSelect')?.value,qty=Number($('#kpCardQuantity')?.value),out=$('#kpCollectionResult');
 if(!target){notice('Indique le pseudo du compte à modifier.');return;}
 if(['give','remove','remove_all'].includes(op)&&!pid){notice('Sélectionne une carte.');return;}
 if(['give','remove'].includes(op)&&(!Number.isInteger(qty)||qty<1||qty>100)){notice('Quantité : de 1 à 100.');return;}
 const player=window.KP.BYID[pid];
 const descriptions={clear:'VIDER toute la collection',unlock:'DÉBLOQUER toutes les cartes',give:`DONNER ${qty} × ${player?.name}`,remove:`RETIRER ${qty} × ${player?.name}`,remove_all:`RETIRER toutes les copies de ${player?.name}`};
 if(op!=='inspect'&&!confirm(`${descriptions[op]} pour ${target} ?`))return;
 b.disabled=true;if(out)out.textContent='Opération en cours…';
 try{const {data,error}=await client.rpc('kp_admin_collection',{target_pseudo:target,operation:op,player_id:pid||null,quantity:qty||1,all_ids:op==='unlock'?window.KP.PLAYERS.map(p=>p.id):[]});
 if(error)throw error;
 if(out)out.textContent=`${target} : ${data.count} cartes au total. ${op==='inspect'?'Collection consultée.':'Modification enregistrée.'}`;
 if(window.KP_AUTH.pseudo.toLowerCase()===target.toLowerCase())window.KP_COLLECTION_SYNC?.pull();
 }catch(err){if(out)out.textContent='Erreur : '+err.message+' — Vérifie que la migration SQL V13 est installée.';}finally{b.disabled=false;}
});
document.addEventListener('click',async e=>{
 if(e.target.id!=='kpSendReward'||!client||!['admin','owner'].includes(role))return;
 const target=$('#kpRewardPseudo')?.value.trim(),gems=Number($('#kpRewardGems')?.value),packs=Number($('#kpRewardPacks')?.value),pack=$('#kpRewardPack')?.value,out=$('#kpRewardResult');
 if(!target||!Number.isSafeInteger(gems)||gems<0||!Number.isInteger(packs)||packs<0||packs>10||(!gems&&!packs)){out.textContent='Vérifie le pseudo, les gemmes et les boosters (maximum 10).';return;}
 if(!confirm(`Envoyer ${gems} gemmes et ${packs} booster(s) ${pack} à ${target} ?`))return;
 e.target.disabled=true;out.textContent='Envoi…';
 try{const {error}=await client.rpc('kp_admin_reward',{target_pseudo:target,gem_amount:gems,pack_id:pack,pack_count:packs});if(error)throw error;out.textContent='Récompenses enregistrées pour '+target+'.';window.KP_REWARDS?.pull();}
 catch(err){out.textContent='Erreur : '+err.message+' (migration SQL V14 requise).';}finally{e.target.disabled=false;}
});
document.addEventListener('change',e=>{if(e.target.id==='kpImportPlayers' &&['admin','owner'].includes(role)&&e.target.files?.[0]){const reader=new FileReader();reader.onload=()=>{try{const n=window.KP.importPlayers(reader.result);notice(n+' joueurs importés localement.');}catch(err){notice(err.message);}};reader.readAsText(e.target.files[0]);}});
document.addEventListener('click',async e=>{if(e.target.closest('#kpAccountOpen')){const modal=$('#kpAuthModal');if(modal)modal.hidden=false;try{await panel();}catch(err){console.error('KICKPACK panneau',err);const body=$('#kpAuthBody');if(body)body.textContent='Impossible de charger le panneau. Réessaie.';}return;}if(e.target.id==='kpLoadMembers'&&role==='owner'){const b=e.target;b.disabled=true;b.textContent='Chargement…';try{const {data,error}=await client.from('kp_profiles').select('user_id,pseudo,role').order('created_at',{ascending:false}).limit(100);if(error)throw error;const out=$('#kpMembersList');if(out)out.innerHTML=(data||[]).map(m=>`<div class="kp-member"><span>${safe(m.pseudo)} · ${safe(m.role)}</span>${m.role!=='owner'?`<button class="btn-o" data-kprole="${m.role==='admin'?'member':'admin'}" data-kpuid="${safe(m.user_id)}">${m.role==='admin'?'Rétrograder':'Promouvoir admin'}</button>`:''}</div>`).join('')||'Aucun compte.';b.textContent='Actualiser les comptes';}catch(err){b.textContent='Erreur : réessayer';console.warn(err);}finally{b.disabled=false;}return;}if(e.target.closest('#kpAuthClose')||e.target.id==='kpAuthModal'){$('#kpAuthModal').hidden=true;return;}if(e.target.closest('#kpLogout')){const {error}=await client.auth.signOut();if(error){alert(error.message);return;}await refresh(true);return;}const b=e.target.closest('[data-kprole]');if(b&&role==='owner'){b.disabled=true;const {error}=await client.rpc('kp_manage_role',{target:b.dataset.kpuid,new_role:b.dataset.kprole});if(error){b.disabled=false;notice(error.message);}else await panel();}});
document.addEventListener('submit',async e=>{if(e.target.id!=='kpLoginForm')return;e.preventDefault();const f=e.target,action=e.submitter?.value||'login',name=username(f.elements.namedItem('pseudo').value),password=f.elements.namedItem('password').value;if(!valid(name)){notice('Pseudo : 3 à 24 caractères, lettres, chiffres ou _.');return;}if(password.length<8){notice('Le mot de passe doit contenir au moins 8 caractères.');return;}const buttons=f.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);notice('Connexion en cours…');try{let email=technicalEmail(name);if(action==='login'){const lookup=await client.rpc('kp_login_email',{p_pseudo:name});if(lookup.error){notice('Connexion impossible : installe la migration SQL V33. '+lookup.error.message);return;}if(!lookup.data){notice('Pseudo ou mot de passe incorrect.');return;}email=lookup.data;}const {data,error}=action==='signup'?await client.auth.signUp({email,password,options:{data:{pseudo:name,referral_code:(new URLSearchParams(location.search).get('ref')||sessionStorage.getItem('kp-referral-pending')||'').trim().slice(0,80)}}}):await client.auth.signInWithPassword({email,password});if(error){notice(error.message);return;}if(action==='signup'&&!data.session){notice('Compte créé mais non connecté. Désactive la confirmation email dans Supabase (Authentication → Providers → Email), puis réessaie.');return;}await refresh();if(action==='signup'){sessionStorage.removeItem('kp-referral-pending');window.KP_REFERRAL?.clearInvite?.();}$('#kpAuthModal').hidden=true;}catch(err){notice(err.message||'Erreur de connexion');}finally{buttons.forEach(b=>b.disabled=false);}});
document.addEventListener('change',e=>{if(e.target.id==='kpGlobalTheme'){const fields=$('#kpBirthdayFields');if(fields)fields.hidden=e.target.value!=='birthday';}});
document.addEventListener('click',async e=>{
 if(e.target.id==='bdayClose'){try{sessionStorage.setItem('kp-bday-closed',birthdayName+'|'+birthdayMessage);}catch(x){}renderBirthday();return;}
 if(e.target.id!=='kpThemeApply'||!client||!['admin','owner'].includes(role))return;
 const sel=$('#kpGlobalTheme'),btn=e.target,t=sel.value;
 const name=t==='birthday'?$('#kpBirthdayName').value.trim().slice(0,40):null;
 const msg=t==='birthday'?$('#kpBirthdayMessage').value.trim().slice(0,140):null;
 btn.disabled=true;notice('Enregistrement du thème…');
 try{const {error}=await client.rpc('kp_set_theme',{new_theme:t,bday_name:name,bday_message:msg});if(error){notice('Erreur : '+error.message);return;}await loadTheme();notice('Thème appliqué à tous les visiteurs.');}catch(err){notice(err.message||'Erreur Supabase');}finally{btn.disabled=false;}
});

// V21 : la modération doit être autorisée par les RPC SQL, jamais par ce seul panneau.
async function modAction(action){
 if(role!=='owner'||!client)return;
 const target=($('#kpModPseudo')?.value||'').trim(),scope=$('#kpModScope')?.value||'all',reason=($('#kpModReason')?.value||'').trim(),hours=$('#kpModDuration')?.value;
 const out=$('#kpModResult');if(!valid(target)){out.textContent='Pseudo invalide.';return;}
 if(action==='ban'&&!reason){out.textContent='Une raison est obligatoire.';return;}
 if(action==='delete'){
  if(!await kpConfirmDelete(target))return;
  try{
   out.textContent='Suppression en cours…';
   const {data,error}=await client.rpc('kp_owner_delete_account',{p_pseudo:target});
   if(error)throw error;
   out.textContent=data||'Compte supprimé définitivement.';
   const field=$('#kpModPseudo');if(field)field.value='';
  }catch(err){out.textContent='Échec : '+(err.message||'Erreur Supabase');}
  return;
 }
 try{const {data,error}=await client.rpc('kp_owner_moderate',{p_pseudo:target,p_action:action,p_scope:scope,p_reason:reason,p_hours:hours==='permanent'?null:Number(hours)});if(error)throw error;out.textContent=typeof data==='string'?data:JSON.stringify(data);}
 catch(err){out.textContent='Erreur : '+err.message;}
}
document.addEventListener('click',e=>{const map={kpModBan:'ban',kpModUnban:'unban',kpModInspect:'inspect',kpModDelete:'delete'};if(map[e.target.id])modAction(map[e.target.id]);});
if(client){
// V57 : le thème global doit être chargé pour les visiteurs anonymes,
// indépendamment de la session et des appels au profil utilisateur.
loadTheme().catch(err=>console.warn('PULSEPACK: thème public',err));
client.auth.onAuthStateChange((event)=>{if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED','INITIAL_SESSION'].includes(event))setTimeout(()=>refresh(event==='SIGNED_OUT'),0);});refresh();setInterval(()=>loadTheme().catch(()=>{}),15000);}else render();
window.KP_AUTH={get userId(){return user?.id||null},get role(){return role},get pseudo(){return pseudo},get theme(){return theme},apply,refresh};
})();

// V26 — confirmation explicite, accessible, et irréversible seulement après validation.
function kpConfirmDelete(pseudo){
 return new Promise(resolve=>{
  const overlay=document.createElement('div');overlay.className='kp-delete-overlay';
  overlay.innerHTML='<div class="kp-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="kpDeleteTitle"><div class="kp-delete-icon" aria-hidden="true">⚠</div><h2 id="kpDeleteTitle">Suppression définitive</h2><p>Voulez-vous vraiment supprimer le compte <strong id="kpDeleteName"></strong> ?</p><p class="kp-delete-warning">Cette action est irréversible. Ce compte ne pourra plus se connecter.</p><p>Pour confirmer, écrivez <strong>SUPPRIMER</strong> :</p><input id="kpDeleteType" autocomplete="off" placeholder="SUPPRIMER" aria-label="Confirmation de suppression"><div class="kp-delete-actions"><button type="button" id="kpDeleteNo">Non, annuler</button><button type="button" id="kpDeleteYes" disabled>Oui, supprimer</button></div></div>';
  document.body.appendChild(overlay);overlay.querySelector('#kpDeleteName').textContent=pseudo;
  const inp=overlay.querySelector('#kpDeleteType'),yes=overlay.querySelector('#kpDeleteYes');
  const finish=v=>{document.removeEventListener('keydown',onKey);overlay.remove();resolve(v)};
  const onKey=e=>{if(e.key==='Escape')finish(false)};document.addEventListener('keydown',onKey);
  inp.addEventListener('input',()=>{yes.disabled=inp.value!=='SUPPRIMER'});
  overlay.querySelector('#kpDeleteNo').onclick=()=>finish(false);
  yes.onclick=()=>{if(inp.value==='SUPPRIMER')finish(true)};
  overlay.addEventListener('click',e=>{if(e.target===overlay)finish(false)});inp.focus();
 });
}

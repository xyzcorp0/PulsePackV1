/* V14 : amis réels et récompenses. Les échanges ne sont pas activés sans transfert atomique serveur. */
(()=>{'use strict';
if(!window.supabase||!window.KICKPACK_SUPABASE_URL||!window.KICKPACK_SUPABASE_ANON_KEY)return;
const db=window.supabase.createClient(window.KICKPACK_SUPABASE_URL,window.KICKPACK_SUPABASE_ANON_KEY);
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lastUid=null;
async function pull(){const {data:{user}}=await db.auth.getUser();if(!user)return;const {data,error}=await db.rpc('kp_claim_rewards');if(error)return;
const gems=Number(data?.gems||0),packs=data?.packs||{};
if(gems>0&&Number.isSafeInteger(gems)){window.KP.S.gems+=gems;}
for(const entry of packs){const id=entry.id,qty=Number(entry.count);if(qty>0&&id==='free'){window.KP.tick();window.KP.S.free.count=Math.min(window.KP.CFG.FREE_MAX,window.KP.S.free.count+qty);if(window.KP.S.free.count>=window.KP.CFG.FREE_MAX)window.KP.S.free.next=0;}else if(qty>0&&window.KP.packById(id)){window.KP.S.giftPacks=window.KP.S.giftPacks||{};window.KP.S.giftPacks[id]=(window.KP.S.giftPacks[id]||0)+qty;}}
if(gems||(Array.isArray(packs)&&packs.length)){window.KP.save();}
}
async function friends(){const el=$('#kpSocialSettings');if(!el)return;const {data:{user}}=await db.auth.getUser();if(!user){el.innerHTML='<h3>Amis et échanges</h3><p>Connecte-toi pour ajouter des amis.</p>';return;}
const {data,error}=await db.rpc('kp_friends_list');if(error){el.innerHTML='<h3>Amis et échanges</h3><p>Exécute la migration SQL V14.</p>';return;}
el.innerHTML=`<h3>Amis</h3><p>Ajoute un compte réel par son pseudo. Les demandes doivent être acceptées.</p><div class="row"><input id="kpFriendPseudo" placeholder="Pseudo exact" maxlength="24"><button class="btn-p" data-friend="request">Ajouter</button></div><div class="kp-friends-list">${(data||[]).map(f=>`<div class="row" style="margin-top:9px"><b>${esc(f.pseudo)}</b><small>${f.status==='accepted'?'Ami':f.incoming?'Demande reçue':'Demande envoyée'}</small>${f.status==='pending'&&f.incoming?`<button class="btn-p" data-friend="accept" data-pseudo="${esc(f.pseudo)}">Accepter</button><button class="btn-o" data-friend="decline" data-pseudo="${esc(f.pseudo)}">Refuser</button>`:''}${f.status==='accepted'?`<button class="btn-o" data-friend="remove" data-pseudo="${esc(f.pseudo)}">Retirer</button>`:''}</div>`).join('')||'<p>Aucun ami pour le moment.</p>'}</div><p id="kpFriendResult" role="status"></p><h3>Échanges de cartes</h3><p>Les échanges sécurisés entre comptes nécessitent une transaction Supabase atomique. Ils ne sont pas encore activés dans cette version.</p>`;
}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-friend]');if(!b)return;const name=b.dataset.pseudo||$('#kpFriendPseudo')?.value.trim();if(!name)return;b.disabled=true;const {data,error}=await db.rpc('kp_friend_action',{target_pseudo:name,action:b.dataset.friend});const out=$('#kpFriendResult');if(error){if(out)out.textContent=error.message;b.disabled=false;}else await friends();});

db.auth.onAuthStateChange(()=>setTimeout(async()=>{const {data:{user}}=await db.auth.getUser();if(user&&user.id!==lastUid){lastUid=user.id;await pull();}else if(!user)lastUid=null;},400));
setTimeout(pull,1000);setInterval(pull,30000);window.KP_REWARDS={pull};
})();

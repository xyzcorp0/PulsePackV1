/* V13: collection Supabase par compte. Les RPC imposent les permissions côté serveur. */
(() => {
'use strict';
const cfg=window.KICKPACK_SUPABASE_URL, key=window.KICKPACK_SUPABASE_ANON_KEY;
if(!cfg||!key||!window.supabase||!window.KP)return;
const db=window.supabase.createClient(cfg,key);
let uid=null,revision=null,ready=false,busy=false,dirty=false,loading=false,timer=null;
const emit=()=>window.dispatchEvent(new Event('kp:collection-loaded'));
async function identity(){const {data}=await db.auth.getUser();return data?.user?.id||null;}
function setCards(cards){loading=true;try{window.KP.replaceCards(cards);emit();}finally{loading=false;}}
async function start(){const id=await identity();if(id===uid&&ready)return;if(!id){uid=null;ready=false;revision=null;dirty=false;clearTimeout(timer);window.KP.switchAccount(null);return;}
 window.KP.switchAccount(id);
 uid=id;ready=false;revision=null;dirty=false;
 const {data,error}=await db.rpc('kp_collection_get');if(id!==uid)return;
 if(error){console.warn('PULSEPACK: appliquer MIGRATION-V13-ADMIN-COLLECTIONS.sql',error.message);return;}
 revision=Number(data.revision);ready=true;
 const remote=Array.isArray(data.cards)?data.cards:[];
 const migrated=localStorage.getItem('kp-cloud-migrated-'+id);
 if(!migrated&&remote.length===0&&window.KP.S.cards.length){dirty=true;await flush();}
 else setCards(remote);
 localStorage.setItem('kp-cloud-migrated-'+id,'1');
}
async function flush(){if(!ready||busy||!dirty)return;busy=true;dirty=false;
 const payload=JSON.parse(JSON.stringify(window.KP.S.cards));
 try{const {data,error}=await db.rpc('kp_collection_save',{new_cards:payload,expected_revision:revision});
 if(error){if(error.message.includes('REVISION_CONFLICT')){await pull(true);}else{dirty=true;console.warn('PULSEPACK: synchronisation',error.message);}}else revision=Number(data.revision);
 }finally{busy=false;if(dirty)queue();}
}
function queue(){clearTimeout(timer);timer=setTimeout(flush,350);}
async function pull(force=false){if(!ready||busy&&!force||dirty&&!force)return;
 const id=uid;const {data,error}=await db.rpc('kp_collection_get');if(error||id!==uid)return;
 const rev=Number(data.revision);if(rev!==revision){revision=rev;dirty=false;setCards(data.cards||[]);}
}
window.addEventListener('kp:account-switched',()=>{ready=false;dirty=false;clearTimeout(timer);});
window.addEventListener('kp:state',()=>{if(ready&&!loading){dirty=true;queue();}});
db.auth.onAuthStateChange(()=>{ready=false;dirty=false;clearTimeout(timer);setTimeout(start,100);});
setTimeout(start,450);setInterval(async()=>{const id=await identity();if(id!==uid){await start();return;}if(!ready){await start();return;}if(dirty)await flush();else await pull();},4500);
window.KP_COLLECTION_SYNC={pull,start};
})();

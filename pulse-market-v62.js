/* PulsePack V62 — marché Supabase, pas de fausses annonces. */
(() => {
'use strict';
const api={ready:false,loading:false,feed:{listings:[],mine:[],purchases:[],coins:null},uid:null};
let db=null;
function client(){if(db)return db;const u=window.KICKPACK_SUPABASE_URL,k=window.KICKPACK_SUPABASE_ANON_KEY;if(u&&k&&window.supabase)db=window.supabase.createClient(u,k);return db;}
async function current(){const c=client();if(!c)throw Error('Supabase non configuré');const {data,error}=await c.auth.getUser();if(error)throw error;if(!data?.user)throw Error('Connecte-toi pour utiliser le marché');return data.user.id;}
async function rpc(name,args){const {data,error}=await client().rpc(name,args||{});if(error)throw Error(error.message);return data;}
async function refresh(){const id=await current();if(api.loading)return;api.loading=true;try{
 if(api.uid!==id){api.uid=id;api.ready=false;const local=Number(window.KP?.S?.coins||0);await rpc('kp_market_init_wallet',{p_coins:Math.max(0,Math.min(1000000000,Math.floor(local)))});}
 api.feed=await rpc('kp_market_feed');api.ready=true;
 if(Number.isFinite(Number(api.feed.coins))&&window.KP?.S){window.KP.S.coins=Number(api.feed.coins);/* ne pas déclencher de sauvegarde collection ici */}
 window.dispatchEvent(new Event('kp:market-loaded'));
}finally{api.loading=false;}}
async function transact(fn){await current();const result=await fn();await window.KP_COLLECTION_SYNC?.pull(true);await refresh();return result;}
api.refresh=refresh;
api.sell=(id,price)=>transact(()=>rpc('kp_market_sell',{p_card_id:id,p_price:Math.floor(price)}));
api.cancel=id=>transact(()=>rpc('kp_market_cancel',{p_listing:id}));
api.buy=id=>transact(()=>rpc('kp_market_buy',{p_listing:id}));
window.KP_MARKET=api;
window.addEventListener('kp:collection-loaded',()=>{if(api.ready)refresh().catch(console.warn);});
setTimeout(()=>refresh().catch(()=>{}),1800);
setInterval(()=>{if(location.hash==='#marche')refresh().catch(()=>{});},12000);
})();

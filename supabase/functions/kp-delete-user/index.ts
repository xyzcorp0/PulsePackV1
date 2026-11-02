import { createClient } from 'npm:@supabase/supabase-js@2';
Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json' };
  try {
    if (req.method !== 'POST') return new Response(JSON.stringify({error:'POST requis'}),{status:405,headers});
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jwt = req.headers.get('Authorization')?.replace(/^Bearer /i,'');
    if (!jwt) return new Response(JSON.stringify({error:'Non connecté'}),{status:401,headers});
    const caller = createClient(url,anon,{global:{headers:{Authorization:`Bearer ${jwt}`}}});
    const {data:{user},error:authError} = await caller.auth.getUser(jwt);
    if(authError || !user) return new Response(JSON.stringify({error:'Session invalide'}),{status:401,headers});
    const admin = createClient(url,secret);
    const {data:owner,error:ownerError}=await admin.from('kp_profiles').select('role').eq('user_id',user.id).single();
    if(ownerError||owner?.role!=='owner') return new Response(JSON.stringify({error:'Owner uniquement'}),{status:403,headers});
    const body=await req.json();const pseudo=String(body.pseudo||'').trim();
    if(!/^[a-z0-9_]{3,24}$/i.test(pseudo)) return new Response(JSON.stringify({error:'Pseudo invalide'}),{status:400,headers});
    const {data:profile,error:findError}=await admin.from('kp_profiles').select('user_id,role,pseudo').ilike('pseudo',pseudo).maybeSingle();
    if(findError||!profile||profile.pseudo.toLowerCase()!==pseudo.toLowerCase()) return new Response(JSON.stringify({error:'Compte introuvable'}),{status:404,headers});
    if(profile.role==='owner'||profile.user_id===user.id) return new Response(JSON.stringify({error:'Owner protégé'}),{status:403,headers});
    const {error:deleteError}=await admin.auth.admin.deleteUser(profile.user_id);
    if(deleteError) throw deleteError;
    return new Response(JSON.stringify({ok:true}),{status:200,headers});
  } catch(err) {return new Response(JSON.stringify({error:String(err?.message||err)}),{status:500,headers});}
});

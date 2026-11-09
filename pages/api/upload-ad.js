import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const config = { api: { bodyParser: false } };

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try{
    const { title, link_url, target_roles, target_phones, image_url, description } = JSON.parse(req.body || '{}');
    // Direct image_url already uploaded case
    const { data, error } = await supabase.from('ads_campaign').insert([{ title, image_url, link_url, description, target_roles: target_roles||['All Roles'], target_phones, is_active:true }]).select().single();
    if(error) throw error;
    return res.json({success:true, ad:data});
  }catch(e){ return res.status(500).json({error:e.message}); }
}
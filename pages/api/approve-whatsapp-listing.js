import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).send('Not allowed');
  const { listing_id } = req.body;
  const { data: lot } = await supabase.from('listings').update({ status:'active', active_at: new Date().toISOString() }).eq('listing_id', listing_id).select().single();
  const { data: buyers } = await supabase.from('buyer_requirements').select('phone').limit(100);
  const notifs = (buyers||[]).map(b=>({ to_phone: b.phone, title:`New ${lot.species} Near You`, message:`${lot.quantity_value} ${lot.quantity_type} at ${lot.location_village.split('|')[0]} - ₹${lot.price_value} - ${lot.listing_id}`, listing_id: lot.listing_id, species: lot.species }));
  if(notifs.length>0) await supabase.from('notifications').insert(notifs);
  return res.status(200).json({ success:true, notified: notifs.length });
}
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function parseMessage(text){
  const t = text.toLowerCase();
  let species = 'Teak Wood';
  if(t.includes('rose')) species='Rosewood';
  if(t.includes('neem')) species='Neem Wood';
  if(t.includes('mango')) species='Mango Wood';
  if(t.includes('sal')) species='Sal Wood';
  let qty = text.match(/(\d+)\s*(cft|cmt|ton|trees|pieces)/i);
  let price = text.match(/₹?\s*(\d{2,5})/);
  let loc = text.match(/(?:at|in)\s+([a-zA-Z\s]{3,20})/i);
  return {
    listing_id: 'TM-'+Math.floor(100000+Math.random()*899999),
    species: species,
    quantity_value: qty ? parseInt(qty[1]) : 100,
    quantity_type: qty ? qty[2].toUpperCase() : 'CFT',
    price_value: price ? parseInt(price[1]) : 700,
    price_type: 'PER_CFT',
    location_village: `${loc?loc[1]:'Anakapalle'} | DIGIPIN: TMP-${Math.random().toString(36).substring(2,5).toUpperCase()}-${Math.random().toString(36).substring(2,5).toUpperCase()} | GPS: 17.69,83.02`,
    location_district: 'Anakapalle',
    location_state: 'Andhra Pradesh',
    status: 'pending_approval',
    days_left: 10,
    ai_summary: `WhatsApp Auto Listing: ${text.slice(0,100)}`,
    created_at: new Date().toISOString()
  };
}

export default async function handler(req,res){
  if(req.method==='GET'){
    if(req.query['hub.mode']==='subscribe' && req.query['hub.verify_token']===process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(req.query['hub.challenge']);
    return res.status(403).send('Forbidden');
  }
  if(req.method==='POST'){
    try{
      const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if(!message) return res.status(200).send('OK');
      const from = message.from;
      const text = message.text?.body || '';
      let data = parseMessage(text);
      data.contact_phone = from.slice(-10);
      if(message.location) data.location_village += ` | GPS: ${message.location.latitude},${message.location.longitude}`;
      await supabase.from('listings').insert([data]);
      return res.status(200).json({ success:true, id: data.listing_id });
    }catch(e){ return res.status(500).json({ error:e.message }); }
  }
}
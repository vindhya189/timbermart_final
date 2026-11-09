import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// WhatsApp Cloud API - Meta
async function sendWhatsApp(toPhone, message) {
  const token = process.env.WHATSAPP_TOKEN; // Vercel lo add cheyali
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.log('WhatsApp not configured, mock log:', toPhone, message);
    return { success: true, mock: true }; // Testing kosam
  }

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: `91${toPhone.slice(-10)}`,
      type: 'text',
      text: { body: message }
    })
  });
  return await res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { buyId } = req.body;

  // 1. Buy requirement details techukovadam
  const { data: buyReq } = await supabase.from('buyer_requirements').select('*').eq('id', buyId).single();
  if (!buyReq || !buyReq.latitude) return res.status(400).json({ error: 'Buy req not found or no location' });

  // 2. 40km lo suppliers ni vetakadam
  const { data: suppliers } = await supabase.rpc('nearby_suppliers', {
    buy_lat: buyReq.latitude,
    buy_lng: buyReq.longitude,
    radius_km: 40
  });

  if (!suppliers || suppliers.length === 0) return res.status(200).json({ message: 'No suppliers in 40km', count: 0 });

  // 3. Prathi supplier ki WhatsApp notification
  let sent = 0;
  for (let sup of suppliers.slice(0, 10)) { // First 10 ki pampistham
    const dist = sup.distance_km.toFixed(1);
    const msg = `🌳 TimberMart - New BUY Requirement Near You!\n\n🔴 Buyer wants: ${buyReq.wood_species} - ${buyReq.title}\n📍 Distance: ${dist} km from you\n📌 Location: ${buyReq.location}\n📦 Qty: ${buyReq.quantity} ${buyReq.price_type}\n💰 Buyer Location DigiPin: ${buyReq.digipin_code}\n\nBuyer Phone: ${buyReq.phone}\n\nReply fast - Buyer is waiting! Check: https://timbermart-final1.vercel.app`;

    await sendWhatsApp(sup.phone, msg);
    sent++;
    await new Promise(r => setTimeout(r, 1000)); // 1 sec gap - WhatsApp limit kosam
  }

  return res.status(200).json({ message: `Notified ${sent} suppliers`, suppliersNotified: sent, suppliers });
}
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// === MSG91 WHATSAPP AUTO-PARSE ENGINE ===
const STATE_KEYWORDS = {
  'MP': ['rewa', 'mp', 'madhya pradesh', 'satna'],
  'UP': ['bareilly', 'up', 'uttar pradesh'],
  'AP': ['vijayawada', 'ap', 'andhra', 'rajahmundry', 'vizag', 'kakinada', 'guntur', 'vijayawada'],
  'TELANGANA': ['hyderabad', 'telangana', 'warangal'],
  'MAHARASHTRA': ['maharashtra', 'nagpur', 'pune'],
  'KARNATAKA': ['karnataka', 'bangalore'],
  'GUJARAT': ['gujarat', 'ahmedabad'],
};

function detectState(text) {
  const lower = text.toLowerCase();
  for (const [state, kws] of Object.entries(STATE_KEYWORDS)) {
    for (const kw of kws) {
      if (lower.includes(kw)) return { state, village: kw, confidence: 0.9 };
    }
  }
  const firstWord = lower.split(' ')[0];
  return { state: 'AP', village: firstWord || 'Rewa', confidence: 0.6 };
}
function detectSpecies(text) {
  const lower = text.toLowerCase();
  if (lower.includes('teak')) return 'Teak Wood';
  if (lower.includes('rosewood')) return 'Rosewood';
  if (lower.includes('patta')) return 'Patta Teak';
  return 'Teak Wood';
}
function detectListingType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('buy') || lower.includes('need') || lower.includes('require')) return 'buy';
  return 'sell';
}
function detectQuantity(text) {
  const nos = text.match(/(\d+)\s*(nos|numbers|pcs|pieces|logs)/i);
  if (nos) return { value: parseInt(nos[1]), type: 'nos', confidence: 0.95 };
  const cft = text.match(/(\d+)\s*(cft|sawn|cbm)/i);
  if (cft) return { value: parseInt(cft[1]), type: 'cft', confidence: 0.95 };
  const num = text.match(/\b(\d{1,3})\b/);
  if (num && parseInt(num[1]) > 5) return { value: parseInt(num[1]), type: 'nos', confidence: 0.6 };
  return { value: 10, type: 'nos', confidence: 0.4 };
}
function detectGirth(text) {
  const g = text.match(/(\d+)\s*(cm|ft|inch|girth)/i) || text.match(/(\d+)\s*\+/);
  if (g) return `${g[1]}cm`;
  return '80cm+';
}
function detectPrice(text) {
  const p = text.match(/@\s*(\d+)|(\d{3,5})\s*\/\s*cft/i) || text.match(/(\d{3,5})/);
  if (p) {
    const val = parseInt(p[1] || p[2] || p[3]);
    if (val >= 500 && val <= 5000) return { value: val, type: 'cft', confidence: 0.9 };
  }
  return { value: 2500, type: 'cft', confidence: 0.3 };
}
function calculateCMT(qty, type, girth) {
  if (type === 'cft') return qty;
  const girthNum = parseInt(girth) || 80;
  return Math.round(qty * girthNum * 0.0075 * 10) / 10;
}
function generateListingId() {
  return 'TM' + Math.random().toString(36).substr(2,6).toUpperCase() + Date.now().toString().slice(-4);
}
function generateSummary(p) {
  return `${p.location_village} ${p.quantity_value} ${p.quantity_type} ${p.girth} - ${p.total_cmt_estimate} CMT - ₹${p.price_value}/${p.price_type}`;
}
function parseWhatsAppMessage(rawMessage, fromPhone) {
  const text = rawMessage.trim();
  const stateDetect = detectState(text);
  const quantity = detectQuantity(text);
  const girth = detectGirth(text);
  const price = detectPrice(text);
  const totalCMT = calculateCMT(quantity.value, quantity.type, girth);
  const listingId = generateListingId();
  const parsed = {
    listing_id: listingId,
    listing_type: detectListingType(text),
    species: detectSpecies(text),
    quantity_type: quantity.type,
    quantity_value: quantity.value,
    girth: girth,
    location_village: stateDetect.village.charAt(0).toUpperCase() + stateDetect.village.slice(1),
    location_state: stateDetect.state,
    price_type: price.type,
    price_value: price.value,
    total_cmt_estimate: totalCMT,
    contact_phone: fromPhone?.replace(/\D/g, '').slice(-10) || '9XXXXXXXXX',
    from_phone_full: fromPhone,
    description: text,
    raw_message: text,
    created_via: 'whatsapp_msg91',
    status: 'draft',
    parse_confidence: 0.85,
    parse_method: 'msg91_regex_ai',
    columns_display: {}
  };
  parsed.ai_summary = generateSummary(parsed);
  parsed.columns_display = {
    listing_id: listingId,
    listing_type: parsed.listing_type,
    species: parsed.species,
    quantity_type: quantity.type,
    quantity_value: quantity.value,
    girth: girth,
    location_village: stateDetect.village,
    location_state: stateDetect.state,
    price_type: price.type,
    price_value: price.value,
    total_cmt_estimate: totalCMT,
    contact_phone: parsed.contact_phone,
    description: text,
    ai_summary: parsed.ai_summary,
    status: 'draft',
    created_via: 'whatsapp_msg91'
  };
  return parsed;
}

async function sendMSG91WhatsApp(toPhone, message, templateId = null) {
  const authKey = process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY;
  const integratedNumber = process.env.MSG91_WHATSAPP_NUMBER || '918985364488';
  if (!authKey) {
    console.log('MSG91 AuthKey missing - Skipping send');
    return { success: false, error: 'AuthKey missing' };
  }
  try {
    const payload = {
      integrated_number: integratedNumber,
      content_type: "text",
      payload: {
        messaging_product: "whatsapp",
        to: toPhone,
        type: "text",
        text: { body: message }
      }
    };
    if (templateId) {
      payload.payload.type = "template";
      payload.payload.template = { name: templateId, language: { code: "en" }, components: [{ type: "body", parameters: [{ type: "text", text: message }] }] };
    }
    const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'authkey': authKey },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('MSG91 Send Response:', data);
    return { success: true, data };
  } catch (e) {
    console.error('MSG91 Send Error:', e);
    return { success: false, error: e.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, authkey');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let rawMessage, fromPhone, profileName, fullPayload;

    if (req.body && (req.body.from || req.body.payload)) {
      fullPayload = req.body;
      if (req.body.from && req.body.text?.body) {
        rawMessage = req.body.text.body;
        fromPhone = req.body.from;
        profileName = req.body.profile?.name || 'WhatsApp User';
      } else if (req.body.payload?.from) {
        rawMessage = req.body.payload.text?.body || req.body.payload.text || '';
        fromPhone = req.body.payload.from;
        profileName = req.body.payload.profile?.name || 'WhatsApp User';
      } else if (req.body.message || req.body.text) {
        rawMessage = req.body.message || req.body.text || req.body.text?.body;
        fromPhone = req.body.mobile || req.body.from || req.body.phone;
        profileName = req.body.name || 'User';
      }
    }
    if (!rawMessage) {
      rawMessage = req.query.message || req.body?.message || req.query.text || '';
      fromPhone = req.query.mobile || req.body?.mobile || req.query.from || req.body?.from || req.query.phone || '';
      profileName = req.query.name || req.body?.name || 'MSG91 User';
    }
    if (!rawMessage && req.body?.raw_message) {
      rawMessage = req.body.raw_message;
      fromPhone = req.body.from_phone || req.body.phone;
      profileName = req.body.profile_name || 'Test User';
    }
    if (!rawMessage) {
      console.log('MSG91 Webhook hit - No message content, maybe status callback:', JSON.stringify(req.body || req.query).slice(0, 500));
      return res.status(200).json({ success: true, message: 'Status callback received - ignored' });
    }
    if (rawMessage.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Message too short' });
    }

    console.log(`📩 MSG91 WhatsApp Message from ${fromPhone}: ${rawMessage}`);
    const lowerText = rawMessage.toLowerCase();

    // =======================================================
    //  1. WHATSAPP DIRECT REGISTER - CARPENTER
    //  Ex: Carpenter Register Ramesh Kukatpally Hyderabad 10
    // =======================================================
    if ((lowerText.includes('carpenter register') || lowerText.includes('register carpenter')) && !lowerText.includes('kavali')) {
      try {
        const parts = rawMessage.replace(/carpenter register|register carpenter/gi, '').trim().split(' ');
        const name = parts[0] || profileName || 'Carpenter';
        const village = parts[1] || detectState(rawMessage).village;
        const district = parts[2] || detectState(rawMessage).state;
        const exp = parts[3] ? parseInt(parts[3]) : 5;
        const speciality = parts.slice(4).join(' ') || 'Teak Furniture';
        const carpPayload = {
          phone: fromPhone.replace(/\D/g,'').slice(-10),
          name: name.charAt(0).toUpperCase() + name.slice(1),
          location_village: village.charAt(0).toUpperCase() + village.slice(1),
          location_district: district.charAt(0).toUpperCase() + district.slice(1),
          speciality: speciality,
          experience_years: exp || 5,
          whatsapp_number: fromPhone.replace(/\D/g,'').slice(-10),
          is_verified: false
        };
        await supabase.from('carpenters').upsert(carpPayload, { onConflict: 'phone' });
        const okMsg = `✅ TimberMart: Hi ${carpPayload.name} garu, Carpenter ga register ayyaru!\n\n👷 ${carpPayload.name} - ${carpPayload.location_village}, ${carpPayload.location_district}\n⭐ ${carpPayload.experience_years} yrs - ${carpPayload.speciality}\n\n✅ Customers mimmalni chustharu:\n🔗 https://timbermart-final1.vercel.app/carpenters?location=${carpPayload.location_district}\n\n"Carpenter kavali ${carpPayload.location_district}" ante me number vastundi!`;
        await sendMSG91WhatsApp(fromPhone, okMsg);
        return res.status(200).json({ success: true, type: 'carpenter_register', data: carpPayload });
      } catch (e) {
        await sendMSG91WhatsApp(fromPhone, `❌ Register fail. Use format:\nCarpenter Register Name Village District Exp\nEx: Carpenter Register Ramesh Kukatpally Hyderabad 10`);
        return res.status(200).json({ success: false, error: e.message });
      }
    }

    // =======================================================
    //  2. WHATSAPP DIRECT REGISTER - WORKER
    //  Ex: Worker Register Suresh Medchal Hyderabad Cutter 15000
    // =======================================================
    if ((lowerText.includes('worker register') || lowerText.includes('register worker') || lowerText.includes('job register') || lowerText.includes('register as worker')) && !lowerText.includes('kavali')) {
      try {
        const parts = rawMessage.replace(/worker register|register worker|job register|register as worker/gi, '').trim().split(' ');
        const name = parts[0] || profileName || 'Worker';
        const village = parts[1] || detectState(rawMessage).village;
        const district = parts[2] || detectState(rawMessage).state;
        const role = parts[3] || 'Helper';
        const salary = parts[4] ? `${parts[4]}/month` : 'Discuss';
        const workerPayload = {
          phone: fromPhone.replace(/\D/g,'').slice(-10),
          name: name.charAt(0).toUpperCase() + name.slice(1),
          location_village: village.charAt(0).toUpperCase() + village.slice(1),
          location_district: district.charAt(0).toUpperCase() + district.slice(1),
          speciality: `Worker - ${role}`,
          experience_years: 3,
          daily_charge: salary,
          whatsapp_number: fromPhone.replace(/\D/g,'').slice(-10),
          is_verified: false
        };
        await supabase.from('carpenters').upsert(workerPayload, { onConflict: 'phone' });
        const okMsg = `✅ TimberMart: Hi ${workerPayload.name} garu, Worker ga register ayyaru!\n\n💼 ${role} - ${village}, ${district}\n💰 Expected: ${salary}\n\n✅ Owners mimmalni contact chestharu:\n🔗 https://timbermart-final1.vercel.app/carpenters?location=${district}\n\nAll the best! - TimberMart 8985364488`;
        await sendMSG91WhatsApp(fromPhone, okMsg);
        return res.status(200).json({ success: true, type: 'worker_register', data: workerPayload });
      } catch (e) {
        await sendMSG91WhatsApp(fromPhone, `❌ Register fail. Format:\nWorker Register Name Village District Role\nEx: Worker Register Suresh Medchal Hyderabad Cutter`);
        return res.status(200).json({ success: false, error: e.message });
      }
    }

    // =======================================================
    //  3. WHATSAPP POST JOB - SAWMILL OWNER DIRECT
    //  Ex: Post Job Sawmill Operator Medchal Hyderabad 18000
    // =======================================================
    if ((lowerText.includes('post job') || lowerText.startsWith('job post')) && !lowerText.includes('kavali')) {
      try {
        const txt = rawMessage.replace(/post job|job post/gi, '').trim();
        const parts = txt.split(' ');
        const jobRole = parts.slice(0,2).join(' ') || 'Sawmill Operator';
        const village = parts[2] || detectState(rawMessage).village;
        const district = parts[3] || detectState(rawMessage).state;
        const salary = parts[4] ? `${parts[4]}/month` : 'Discuss';

        const jobPayload = {
          phone: fromPhone.replace(/\D/g,'').slice(-10),
          owner_name: profileName,
          job_role: jobRole.charAt(0).toUpperCase() + jobRole.slice(1),
          location_village: village,
          location_district: district,
          salary: salary,
          work_type: 'Full Time',
          whatsapp_number: fromPhone.replace(/\D/g,'').slice(-10),
          description: rawMessage,
          status: 'active'
        };
        const { data } = await supabase.from('sawmill_jobs').insert([jobPayload]).select().single();
        const okMsg = `✅ TimberMart: Job Posted!\n\n💼 ${jobPayload.job_role} - ${village}, ${district}\n💰 ${salary}\n\n✅ Workers can contact you now:\n🔗 https://timbermart-final1.vercel.app/jobs?location=${district}\n\nWorkers WhatsApp lo "Job kavali ${district}" ante me job vastundi!`;
        await sendMSG91WhatsApp(fromPhone, okMsg);
        return res.status(200).json({ success: true, type: 'job_post', data });
      } catch (e) {
        await sendMSG91WhatsApp(fromPhone, `❌ Job post fail. Use:\nPost Job Role Village District Salary\nEx: Post Job Sawmill Operator Medchal Hyderabad 18000`);
        return res.status(200).json({ success: false, error: e.message });
      }
    }

    // =======================================================
    //  4. CARPENTER KAVALI - AUTO NEARBY LINK
    // =======================================================
    if (lowerText.includes('carpenter') && (lowerText.includes('kavali') || lowerText.includes('kaavali') || lowerText.includes('need') || lowerText.includes('chahiye'))) {
      let location = lowerText.replace(/carpenter|mistri|kavali|kaavali|need|chahiye|please|hi|hello/g, '').trim() || 'Hyderabad';
      try {
        const { data: carpenters } = await supabase.from('carpenters').select('*').ilike('location_district', `%${location}%`).limit(5);
        let reply = `👷 *TimberMart - Nearby Carpenters in ${location.toUpperCase()}*\n\n`;
        if (carpenters && carpenters.length > 0) {
          carpenters.forEach((c, i) => {
            reply += `${i + 1}. *${c.name}* - ${c.speciality || 'Teak Work'} (${c.experience_years || 5}yrs)\n📍 ${c.location_village || ''}, ${c.location_district}\n💬 Chat: https://wa.me/91${c.whatsapp_number || c.phone}\n\n`;
          });
        } else {
          reply += `Sorry, ${location} lo carpenters ippudu leru. Meere first register avvandi!\n\n`;
        }
        reply += `🔗 *Full List:* https://timbermart-final1.vercel.app/carpenters?location=${location}\n📝 *Register:* Carpenter Register Name Village District`;
        await sendMSG91WhatsApp(fromPhone, reply);
      } catch (e) { console.log('Carpenter query error', e); }
      return res.status(200).json({ success: true, type: 'carpenter_kavali', location });
    }

    // =======================================================
    //  5. SAWMILL JOB KAVALI - AUTO NEARBY JOBS LINK
    // =======================================================
    if ((lowerText.includes('job') || lowerText.includes('work') || lowerText.includes('panii') || lowerText.includes('kaam')) && (lowerText.includes('kavali') || lowerText.includes('kaavali') || lowerText.includes('need') || lowerText.includes('chahiye'))) {
      let location = lowerText.replace(/job|work|kavali|kaavali|panii|kaam|sawmill|need|chahiye|please|hi|hello/g, '').trim() || 'Hyderabad';
      try {
        const { data: jobs } = await supabase.from('sawmill_jobs').select('*').eq('status', 'active').ilike('location_district', `%${location}%`).order('created_at', { ascending: false }).limit(5);
        let reply = `💼 *Nearby Sawmill Jobs - ${location.toUpperCase()}*\n\n`;
        if (jobs && jobs.length > 0) {
          jobs.forEach((j, i) => {
            reply += `${i + 1}. *${j.job_role}* - ${j.location_village || ''}\n💰 ${j.salary || 'Contact'} | ${j.work_type || 'Full Time'}\n👤 ${j.owner_name || 'Owner'} - https://wa.me/91${j.whatsapp_number || j.phone}\n\n`;
          });
        } else {
          reply += `No jobs in ${location} now. Try other location.\n\n`;
        }
        reply += `🔗 *All Jobs:* https://timbermart-final1.vercel.app/jobs?location=${location}\n🔗 *Post a Job:* Post Job Role Village District Salary`;
        await sendMSG91WhatsApp(fromPhone, reply);
      } catch (e) { console.log('Job query error', e); }
      return res.status(200).json({ success: true, type: 'job_kavali', location });
    }

    // =======================================================
    //  6. EXISTING FLOW: TIMBER LISTING AUTO-PARSE
    // =======================================================
    const parsed = parseWhatsAppMessage(rawMessage, fromPhone);
    console.log('✅ Parsed:', parsed.columns_display);

    const draftData = {
      listing_id: parsed.listing_id,
      listing_type: parsed.listing_type,
      species: parsed.species,
      quantity_type: parsed.quantity_type,
      quantity_value: parsed.quantity_value,
      girth: parsed.girth,
      location_village: parsed.location_village,
      location_state: parsed.location_state,
      price_type: parsed.price_type,
      price_value: parsed.price_value,
      total_cmt_estimate: parsed.total_cmt_estimate,
      contact_phone: parsed.contact_phone,
      from_phone_full: parsed.from_phone_full,
      description: parsed.description,
      ai_summary: parsed.ai_summary,
      status: 'draft',
      created_via: 'whatsapp_msg91',
      raw_message: parsed.raw_message,
      parse_confidence: parsed.parse_confidence,
      parse_method: parsed.parse_method,
      created_at: new Date().toISOString(),
      profile_name: profileName,
      msg91_payload: fullPayload || req.query
    };

    let inserted;
    try {
      const { data, error } = await supabase.from('listings').insert([{ ...draftData, columns_display: parsed.columns_display }]).select().single();
      if (error) throw error;
      inserted = data;
    } catch (e) {
      const { data, error } = await supabase.from('listings').insert([draftData]).select().single();
      if (error) throw error;
      inserted = data;
    }

    await supabase.from('listings').update({ status: 'pending_approval', pending_at: new Date().toISOString() }).eq('listing_id', parsed.listing_id);
    console.log(`✅ Listing ${parsed.listing_id} - MSG91 - Pending approval`);

    const confirmationMsg = `✅ TimberMart: Your listing ${parsed.listing_id} parsed!\n\n📍 ${parsed.ai_summary}\n\n⏳ Admin approval pending - Will be LIVE in 5 mins!\n\n🔍 Track: https://timbermart-final1.vercel.app/p/${parsed.listing_id}\n\nThanks! - TimberMart Team`;
    sendMSG91WhatsApp(fromPhone, confirmationMsg).then(r => console.log('Confirmation sent:', r)).catch(e => console.log('Confirmation failed:', e));

    return res.status(200).json({
      success: true,
      message: 'MSG91 WhatsApp auto-parsed - Pending approval',
      listing_id: parsed.listing_id,
      status: 'pending_approval',
      parsed_columns: parsed.columns_display,
      ai_summary: parsed.ai_summary,
      msg91_confirmation_sent: true
    });

  } catch (error) {
    console.error('MSG91 Webhook error:', error);
    return res.status(200).json({ success: false, error: error.message, note: 'Returned 200 to avoid MSG91 retries' });
  }
}
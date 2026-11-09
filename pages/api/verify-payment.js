import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, phone, plan, amount, listing_id } = req.body;
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  if (expected !== razorpay_signature) return res.status(400).json({ success: false, error: 'Invalid signature' });
  await supabase.from('payments').insert([{ phone, listing_id, order_id: razorpay_order_id, payment_id: razorpay_payment_id, amount, plan, status: 'success' }]);
  const endDate = new Date(); endDate.setDate(endDate.getDate() + 30);
  await supabase.from('subscriptions').insert([{ phone, plan_name: plan, amount, razorpay_order_id, razorpay_payment_id, status: 'active', end_date: endDate.toISOString() }]);
  if (plan && plan.includes('Premium Listing') && listing_id) await supabase.from('listings').update({ is_premium: true, premium_until: endDate.toISOString() }).eq('listing_id', listing_id);
  if (plan && plan.includes('Carpenter Pro')) await supabase.from('carpenters').update({ is_pro: true, pro_until: endDate.toISOString() }).eq('phone', phone);
  return res.status(200).json({ success: true });
}
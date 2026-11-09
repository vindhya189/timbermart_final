// pages/api/create-order.js - Razorpay Order Create
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { amount, plan, phone } = req.body; // amount in Rupees
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Paise lo
      currency: 'INR',
      receipt: `TM-${Date.now()}`,
      notes: { plan, phone },
    });
    res.status(200).json({ orderId: order.id, amount: order.amount, key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
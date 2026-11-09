import Razorpay from 'razorpay';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ error: 'Razorpay Keys missing in .env.local' });
  }
  const { amount, plan, phone } = req.body;
  try {
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: 'TM-' + Date.now(),
      notes: { plan: plan || '', phone: phone || '' },
    });
    return res.status(200).json({ orderId: order.id, amount: order.amount, key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
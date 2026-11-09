// pages/subscription.js - FIXED - Button Click Issue Fixed - Error Shows
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';

const PLANS = [
  { id: 'free', name: 'Free Listing', price: 0, days: '10 Days', features: ['1 Listing', 'Normal Position', '10 Days Validity', 'WhatsApp Contact'], color: 'bg-white', btn: 'Start Free' },
  { id: 'premium', name: 'Premium Listing', price: 99, days: '30 Days', features: ['Top of Home Page', 'Premium Badge', '30 Days Validity', '3x More Views', 'Priority Support'], color: 'bg-yellow-50 border-yellow-300', btn: 'Pay ₹99 - Go Premium', popular: true },
  { id: 'carpenter', name: 'Carpenter Pro', price: 149, days: '30 Days', features: ['Top in Carpenter List', 'Pro Badge', 'Unlimited Leads', '30 Days Validity'], color: 'bg-orange-50 border-orange-300', btn: 'Pay ₹149 - Carpenter Pro' },
  { id: 'business', name: 'Business - 10 Listings', price: 499, days: '30 Days', features: ['10 Premium Listings', 'All Premium Benefits', 'Dedicated Support'], color: 'bg-blue-50 border-blue-300', btn: 'Pay ₹499 - Business' },
];

export default function Subscription() {
  const [phone, setPhone] = useState('');
  const [listingId, setListingId] = useState('');
  const [paying, setPaying] = useState('');

  useEffect(() => {
    const p = localStorage.getItem('timber_phone');
    if (p) setPhone(p);
  }, []);

  const pay = async (plan) => {
    console.log('Button Clicked:', plan.name); // F12 Console lo kanipistundi

    if (plan.price === 0) { window.location.href = '/list-timber'; return; }

    if (!phone || phone.length < 10) {
      alert('Please enter your 10-digit phone number first - Top box lo number type cheyandi');
      return;
    }

    if (typeof window.Razorpay === 'undefined') {
      alert('Payment gateway is loading. Please wait 2 seconds and try again.');
      return;
    }

    setPaying(plan.id);

    try {
      // Step 1: Create Order
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: plan.price, plan: plan.name, phone })
      });

      const data = await res.json();
      console.log('Order Response:', data);

      if (!res.ok || !data.orderId) {
        alert('Order Failed: ' + (data.error || 'Razorpay Keys missing. Check .env.local'));
        setPaying('');
        return;
      }

      // Step 2: Open Razorpay Popup
      const options = {
        key: data.key,
        amount: data.amount,
        currency: 'INR',
        name: 'TimberMart.in',
        description: plan.name,
        order_id: data.orderId,
        handler: async (resp) => {
          try {
            const v = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...resp, phone, plan: plan.name, amount: plan.price, listing_id: listingId })
            });
            const r = await v.json();
            if (r.success) { alert('Payment Successful! Premium Activated.'); window.location.href = '/profile'; }
            else alert('Payment Verification Failed. Contact timbermartapp@gmail.com with Payment ID: ' + resp.razorpay_payment_id);
          } catch (e) { alert('Verify Error: ' + e.message); }
          setPaying('');
        },
        prefill: { contact: '91' + phone },
        theme: { color: '#000000' },
        modal: { ondismiss: () => setPaying('') }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (err) => { alert('Payment Failed: ' + err.error.description); setPaying(''); });
      rzp.open();

    } catch (e) {
      alert('Error: ' + e.message + ' - Check Internet / API Route');
      setPaying('');
    }
  };

  return (
    <div className="min-h-screen bg-white flex justify-center"><div className="w-full max-w-[480px] pb-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      <div className="bg-black text-white px-4 py-3 flex justify-between items-center"><Link href="/" className="text-[12px] font-bold">← HOME</Link><p className="font-black text-[14px]">SUBSCRIPTION PLANS</p><span className="w-10"></span></div>
      <div className="px-4 pt-4">
        <p className="font-black text-[18px] text-center">Grow Your Timber Business</p>
        <p className="text-[11px] text-gray-500 text-center mt-1">Premium listings get 3x more calls</p>

        {/* PHONE - MUST FILL - HIGHLIGHTED */}
        <p className="text-[11px] font-bold mt-4 mb-1">Step 1: Enter Phone Number *</p>
        <input value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="Enter 10-digit Phone Number" type="tel" className="w-full border-2 border-black rounded-full px-4 py-3 text-[13px] text-center font-bold outline-none bg-yellow-50" />
        {!phone && <p className="text-[11px] text-red-500 font-bold mt-1 text-center">↑ Phone number enter cheyandi - Lekapothe button work avvadu</p>}

        <input value={listingId} onChange={e => setListingId(e.target.value)} placeholder="Listing ID for Premium - Optional (Ex: TM-ABCD12)" className="w-full border rounded-full px-4 py-3 text-[12px] mt-2" />

        <div className="space-y-3 mt-4">
          {PLANS.map(p => (
            <div key={p.id} className={`border rounded-[18px] p-4 ${p.color}`}>
              {p.popular && <span className="bg-yellow-400 px-2 py-0.5 rounded-full text-[9px] font-black">MOST POPULAR</span>}
              <div className="flex justify-between mt-1"><p className="font-bold text-[14px]">{p.name}</p><p className="font-black text-[18px]">{p.price === 0 ? 'FREE' : `₹${p.price}`}</p></div>
              <p className="text-[11px] text-gray-500">{p.days}</p>
              <ul className="mt-2 space-y-1">{p.features.map(f => <li key={f} className="text-[12px]">✓ {f}</li>)}</ul>
              <button type="button" onClick={() => pay(p)} disabled={paying === p.id} className="w-full bg-black text-white rounded-full py-3 font-bold text-[12px] mt-3 active:scale-95 disabled:opacity-50">
                {paying === p.id ? 'Opening Payment...' : p.btn}
              </button>
            </div>
          ))}
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-4">Secure payment via Razorpay • UPI, Card, NetBanking accepted<br />Refund: Digital service, no refund except payment gateway failure. Contact timbermartapp@gmail.com</p>
      </div>
    </div></div>
  );
}
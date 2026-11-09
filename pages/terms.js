import Link from 'next/link';
export default function Terms() {
  return (
    <div className="min-h-screen bg-[#FCFCF9] flex justify-center"><div className="w-full max-w-[420px] bg-white min-h-screen border-x border-zinc-100">
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b px-5 h-[56px] flex items-center gap-3"><Link href="/" className="w-8 h-8 bg-zinc-50 border rounded-full flex items-center justify-center">←</Link><p className="font-semibold text-[13px]">Terms • 10/15D Rule</p></div>
      <div className="p-6 text-[11px] text-zinc-600 leading-[1.6]"><h1 className="text-[18px] font-semibold text-zinc-900">Terms & Conditions</h1><p className="mt-3 font-semibold text-zinc-900">1. Expiry:</p><p>Normal lots 10 days, Premium ₹299 = 15 days. Auto expiry after.</p><p className="mt-3 font-semibold text-zinc-900">2. Listing:</p><p>True information only. Fake listings delete chestam.</p><p className="mt-3 font-semibold text-zinc-900">3. Boost:</p><p>₹299 one time, 15 days live + Top ranking + 3 day alerts.</p><p className="mt-3 font-semibold text-zinc-900">4. Contact:</p><p>timbermartindia@gmail.com</p><Link href="/" className="mt-6 block w-full py-3 rounded-full bg-zinc-900 text-white text-center text-[12px]">Back</Link></div>
    </div></div>
  );
}
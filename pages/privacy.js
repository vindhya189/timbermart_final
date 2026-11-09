import Link from 'next/link';
export default function Privacy(){
  return (
    <div className="min-h-screen bg-[#fcfcf9] flex justify-center"><div className="w-full max-w-[420px] bg-white min-h-screen p-6">
      <Link href="/" className="text-[11px] font-black">← BACK</Link>
      <h1 className="text-[24px] font-black mt-6 leading-[0.9]">Privacy Policy<br/>DPDP Act 2023 Compliant</h1>
      <p className="text-[10px] text-gray-400 mt-2">Last Updated: 2 Nov 2026 | Data Fiduciary: TimberMandi</p>
      
      <div className="mt-6 space-y-4 text-[12px] leading-[1.6] text-gray-700">
        <div><p className="font-black text-[11px] tracking-widest">1. DATA FIDUCIARY DETAILS (Sec 6 DPDP)</p><p>TimberMandi, Vijayawada, AP. Contact: timbermandi@gmail.com, Phone: +91-8978987344. Grievance Officer: Same. DPO: dpo@timbermandi.com</p></div>
        <div><p className="font-black text-[11px] tracking-widest">2. WHAT DATA WE COLLECT & PURPOSE (Sec 5 & 6)</p><p>• Phone: Buyer-Seller contact • Location/Village/District/GPS: Timber location verification • Photos: Listing proof • Species/Quantity/Price: Business listing. Purpose: To provide timber marketplace services only.</p></div>
        <div><p className="font-black text-[11px] tracking-widest">3. CONSENT (Sec 7)</p><p>Consent is taken via banner on first visit. You can withdraw consent anytime via My Account → Delete Data or email timbermandi@gmail.com. Withdrawal will not affect legality of processing before withdrawal.</p></div>
        <div><p className="font-black text-[11px] tracking-widest">4. YOUR RIGHTS (Sec 12-14)</p><p>• Right to Access your data • Right to Correction • Right to Erasure • Right to Grievance Redressal • Right to Nominate. To exercise: Visit /data-rights or email us. We will respond within 30 days.</p></div>
        <div><p className="font-black text-[11px] tracking-widest">5. DATA RETENTION & STORAGE</p><p>Data stored in India (Supabase India Region). Retention: Active listings till 3 years or till you delete. Consent logs 7 years as per law. After that auto-deleted.</p></div>
        <div><p className="font-black text-[11px] tracking-widest">6. DATA PROTECTION & BREACH (Sec 8)</p><p>We use encryption, RLS, secure storage. In case of data breach, we will inform Data Protection Board and you within 72 hours.</p></div>
        <div><p className="font-black text-[11px] tracking-widest">7. CHILDREN DATA</p><p>We do not knowingly collect data of children below 18 years without parental consent.</p></div>
        <div><p className="font-black text-[11px] tracking-widest">8. GRIEVANCE</p><p>Email: timbermandi@gmail.com - We will resolve within 30 days. If not satisfied, you can complain to Data Protection Board of India: dpb.gov.in</p></div>
      </div>
      <Link href="/data-rights" className="mt-8 block w-full bg-black text-white py-4 rounded-full text-center text-[11px] font-black tracking-widest">EXERCISE YOUR DATA RIGHTS →</Link>
    </div></div>
  );
}
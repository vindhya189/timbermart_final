import { useState, useEffect } from 'react';

export default function DPDPConsentBanner(){
  const [show, setShow] = useState(false);

  useEffect(()=>{
    // Check if already accepted
    const consent = localStorage.getItem('timbermart_dpdp_consent');
    if(!consent){
      setShow(true);
    }
  },[]);

  const handleAccept = () => {
    localStorage.setItem('timbermart_dpdp_consent', 'accepted');
    localStorage.setItem('timbermart_consent_date', new Date().toISOString());
    setShow(false);
    // Force close
    document.body.style.overflow = 'auto';
  };

  const handleDecline = () => {
    localStorage.setItem('timbermart_dpdp_consent', 'declined');
    setShow(false);
  };

  if(!show) return null;

  return(
    <div className="fixed bottom-0 left-0 right-0 z-[99999] bg-[#0f0f0f] border-t border-zinc-800 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="max-w-[440px] mx-auto">
        <p className="text-[11px] font-bold text-white tracking-widest mb-2">DPDP ACT 2023 - YOUR DATA PROTECTION</p>
        <p className="text-[12px] text-zinc-300 leading-[18px]">
          We use your phone, location, and photos only to create timber listings. Data is stored securely in India. You have the right to access, correct, and delete your data. Grievance Officer: timbermartapp@gmail.com. Read <a href="/privacy" className="underline text-white font-semibold">Privacy Policy</a>.
        </p>
        <div className="flex gap-3 mt-4">
          <button 
            onClick={handleDecline} 
            type="button"
            className="flex-1 border border-zinc-700 text-white py-3 rounded-full text-[12px] font-bold tracking-widest cursor-pointer active:scale-95 transition-all hover:bg-zinc-800"
          >
            DECLINE
          </button>
          <button 
            onClick={handleAccept} 
            type="button"
            className="flex-1 bg-[#f5d6a0] text-black py-3 rounded-full text-[12px] font-bold tracking-widest cursor-pointer active:scale-95 transition-all hover:bg-[#f0c98a] shadow"
          >
            ACCEPT & CONTINUE ✓
          </button>
        </div>
        <p className="text-[9px] text-zinc-500 text-center mt-3">Data Fiduciary: TimberMandi, Vijayawada, AP. Retention: 3 Years or till deletion request.</p>
      </div>
    </div>
  );
}
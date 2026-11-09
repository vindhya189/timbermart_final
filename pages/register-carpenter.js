// pages/register-carpenter.js - Carpenter Registration - Location + DIGIPIN - Pure English
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const SKILLS = ["Door Frames","Door Shutters","Windows","Furniture - Cot / Table","Roof Work","Plywood Work","Cutting / Sizing","Polishing","Complete Wood Work"];

export default function RegisterCarpenter(){
  const [name,setName]=useState('');
  const [phone,setPhone]=useState('');
  const [village,setVillage]=useState('Anakapalle');
  const [district,setDistrict]=useState('');
  const [exp,setExp]=useState('');
  const [skills,setSkills]=useState([]);
  const [charge,setCharge]=useState('');
  const [lat,setLat]=useState(''); const [lng,setLng]=useState(''); const [digipin,setDigipin]=useState('');
  const [locLoading,setLocLoading]=useState(false);
  const [consent,setConsent]=useState(false);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{ const p=localStorage.getItem('timber_phone'); if(p) setPhone(p); const v=localStorage.getItem('timber_village'); if(v) setVillage(v); },[]);

  const generateDigipin=(la,lo)=>{ const chars='23456789CFGHJMPQRVWX'; let code=''; let v=Math.abs(la*100000+lo*1000); for(let i=0;i<10;i++){ code+=chars[Math.floor(v%chars.length)]; v=Math.floor(v/chars.length)+(la+lo)*100; if(i===2||i===5) code+='-'; } return code.slice(0,12).toUpperCase(); };

  const getLocation=()=>{
    if(!navigator.geolocation){ alert('Location is not supported'); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(async(pos)=>{
      const la=pos.coords.latitude, lo=pos.coords.longitude;
      setLat(la.toFixed(6)); setLng(lo.toFixed(6)); setDigipin(generateDigipin(la,lo));
      try{ const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}`); const d=await r.json(); if(d.address?.village||d.address?.town) setVillage(d.address.village||d.address.town); if(d.address?.state_district) setDistrict(d.address.state_district); }catch{}
      setLocLoading(false);
    },()=>{ setLocLoading(false); alert('Please allow location access'); },{enableHighAccuracy:true});
  };

  const toggleSkill=(s)=>{ setSkills(skills.includes(s)? skills.filter(x=>x!==s): [...skills,s]); };

  const submit=async()=>{
    if(!name||phone.length<10||!village){ alert('Please fill Name, Phone and Village'); return; }
    if(!lat){ alert('Please tap Get My Location - Customers see distance in KM'); return; }
    if(!consent){ alert('Please accept Privacy Policy'); return; }
    setLoading(true);
    const {error}=await supabase.from('carpenters').insert([{name,phone,village,district,experience_years:exp?Number(exp):null,skills:skills.join(', '),daily_charge:charge?Number(charge):null,latitude:Number(lat),longitude:Number(lng),digipin,consent_given:true}]);
    if(error) alert(error.message); else { alert('Registered as Carpenter! Customers can now find you nearby.'); window.location.href='/carpenters'; }
    setLoading(false);
  };

  return(
    <div className="min-h-screen bg-white flex justify-center"><div className="w-full max-w-[480px] pb-6">
      <div className="bg-black text-white px-4 py-3 flex justify-between items-center"><Link href="/" className="text-[12px] font-bold">← HOME</Link><p className="font-black text-[14px]">JOIN AS CARPENTER</p><span className="w-10"></span></div>
      <div className="px-4 pt-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3"><p className="text-[12px] font-bold">Get More Work Nearby</p><p className="text-[11px] text-gray-600 mt-0.5">Customers see your distance in KM and call you directly. No commission.</p></div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full Name" className="w-full border rounded-xl px-3 py-3 text-[13px] mt-4" />
        <div className="grid grid-cols-2 gap-2 mt-2"><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="WhatsApp Number" className="border rounded-xl px-3 py-3 text-[13px]" /><input value={village} onChange={e=>setVillage(e.target.value)} placeholder="Village / Town" className="border rounded-xl px-3 py-3 text-[13px]" /></div>
        <div className="grid grid-cols-2 gap-2 mt-2"><input value={exp} onChange={e=>setExp(e.target.value)} type="number" placeholder="Experience - Years" className="border rounded-xl px-3 py-3 text-[13px]" /><input value={charge} onChange={e=>setCharge(e.target.value)} type="number" placeholder="Daily Charge ₹" className="border rounded-xl px-3 py-3 text-[13px]" /></div>
        <p className="text-[11px] font-bold mt-4 mb-2">Your Skills - Select All That Apply</p>
        <div className="flex flex-wrap gap-1.5">{SKILLS.map(s=><button key={s} onClick={()=>toggleSkill(s)} className={`px-3 py-2 rounded-full text-[11px] font-bold ${skills.includes(s)?'bg-black text-white':'bg-[#f2f2f2]'}`}>{s}</button>)}</div>
        <button onClick={getLocation} className="w-full mt-4 bg-blue-50 border border-blue-200 rounded-xl py-3 text-[12px] font-bold text-blue-700">{locLoading?'Getting Location...':'Get My Location - Required for Distance'}</button>
        {digipin && <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-3"><p className="text-[11px] font-bold">DIGIPIN: {digipin}</p><p className="text-[10px] text-gray-500">{lat}, {lng} • {village} {district?`• ${district}`:''}</p></div>}
        <label className="flex gap-2 mt-4 cursor-pointer"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="w-4 h-4 mt-0.5" /><span className="text-[11px] text-gray-600">I agree to Privacy Policy and consent to processing of my data as per DPDP Act, 2023.</span></label>
        <button onClick={submit} disabled={loading} className="w-full bg-black text-white rounded-full py-4 font-bold text-[13px] mt-5">{loading?'Registering...':'Register as Carpenter'}</button>
      </div>
    </div></div>
  );
}
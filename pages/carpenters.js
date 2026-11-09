// pages/carpenters.js - Find Carpenter Nearby - Distance in KM - Pure English
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import TreeLoader from '../components/TreeLoader';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Haversine - Distance in KM
const getDistance = (lat1, lon1, lat2, lon2) => {
  if(!lat1||!lon1||!lat2||!lon2) return null;
  const R=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return (R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
};

export default function Carpenters(){
  const [list,setList]=useState([]); const [loading,setLoading]=useState(true);
  const [myLat,setMyLat]=useState(null); const [myLng,setMyLng]=useState(null);
  const [search,setSearch]=useState(''); const [sortBy,setSortBy]=useState('Nearest');

  useEffect(()=>{ load(); },[]);

  const load=async()=>{
    const {data}=await supabase.from('carpenters').select('*').eq('status','approved').order('created_at',{ascending:false});
    setList(data||[]); setLoading(false);
  };

  const getMyLocation=()=>{
    if(!navigator.geolocation){ alert('Location not supported'); return; }
    navigator.geolocation.getCurrentPosition((pos)=>{ setMyLat(pos.coords.latitude); setMyLng(pos.coords.longitude); },()=>alert('Please allow location access'));
  };

  const filtered=useMemo(()=>{
    let out=list.map(c=>({...c, distance: getDistance(myLat,myLng,c.latitude,c.longitude)}));
    if(search){ out=out.filter(c=>`${c.name} ${c.village} ${c.skills}`.toLowerCase().includes(search.toLowerCase())); }
    if(sortBy==='Nearest') out.sort((a,b)=>(a.distance??9999)-(b.distance??9999));
    if(sortBy==='Experience') out.sort((a,b)=>(b.experience_years||0)-(a.experience_years||0));
    if(sortBy==='Low Charge') out.sort((a,b)=>(a.daily_charge||9999)-(b.daily_charge||9999));
    return out;
  },[list,search,sortBy,myLat,myLng]);

  return(
    <div className="min-h-screen bg-white flex justify-center"><div className="w-full max-w-[480px] pb-24 min-h-screen">
      <div className="bg-black text-white px-4 py-3 flex justify-between items-center sticky top-0 z-20"><Link href="/" className="text-[12px] font-bold">← HOME</Link><p className="font-black text-[14px]">CARPENTERS NEARBY</p><Link href="/register-carpenter" className="bg-white text-black px-3 py-1.5 rounded-full text-[11px] font-bold">+ Join</Link></div>
      <div className="px-4 pt-3">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, village, skill..." className="w-full bg-[#f2f2f2] rounded-full px-4 py-3 text-[13px] outline-none" />
        <div className="flex gap-2 mt-3">
          <button onClick={getMyLocation} className="flex-1 bg-blue-600 text-white rounded-full py-2.5 text-[12px] font-bold">📍 {myLat?'Location Set - Showing Distance':'Use My Location to See Distance'}</button>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="border rounded-full px-3 py-2.5 text-[12px] bg-white"><option>Nearest</option><option>Experience</option><option>Low Charge</option></select>
        </div>
        {myLat && <p className="text-[11px] text-green-600 font-bold mt-2">✓ Distance calculated from your location</p>}
        {loading && (
  <TreeLoader
    message="Growing TimberMart..."
    fullScreen={false}
  />
)}
        <div className="space-y-3 mt-4">
          {filtered.map(c=>(
            <div key={c.id} className="border rounded-[16px] p-3">
              <div className="flex gap-3">
                <div className="w-[56px] h-[56px] bg-orange-100 rounded-full flex items-center justify-center text-[24px] shrink-0">🪚</div>
                <div className="flex-1">
                  <div className="flex justify-between"><p className="font-bold text-[13px]">{c.name}</p>{c.distance!=null && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-black">{c.distance<1?'Less than 1 KM':`${c.distance.toFixed(1)} KM`}</span>}</div>
                  <p className="text-[11px] text-gray-500">📍 {c.village}{c.district?`, ${c.district}`:''} • {c.experience_years?`${c.experience_years} yrs exp`:''}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">{c.skills}</p>
                  <p className="font-black text-[12px] mt-1">{c.daily_charge?`₹${c.daily_charge} / Day`:''} {c.distance==null && <span className="text-[10px] text-blue-600 font-bold">• Tap Use My Location to see distance</span>}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <a href={`tel:${c.phone}`} className="flex-1 bg-green-500 text-white rounded-full py-2.5 text-center text-[12px] font-bold">📞 Call</a>
                <a href={`https://wa.me/91${c.phone}?text=Hi, I need carpenter work in ${c.village}`} target="_blank" className="flex-1 bg-black text-white rounded-full py-2.5 text-center text-[12px] font-bold">WhatsApp</a>
              </div>
            </div>
          ))}
          {!loading && filtered.length===0 && <div className="text-center mt-10"><p className="text-[32px]">🪚</p><p className="text-gray-500 text-[13px] mt-2">No carpenters found</p><Link href="/register-carpenter" className="inline-block mt-3 bg-black text-white px-5 py-2.5 rounded-full text-[12px] font-bold">Be First Carpenter Here</Link></div>}
        </div>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t px-4 py-3 flex justify-between z-30"><Link href="/" className="text-[12px] font-bold">Home</Link><Link href="/carpenters" className="text-[12px] font-black">Carpenter</Link><Link href="/list-timber" className="bg-black text-white px-5 py-2 rounded-full text-[12px] font-bold">+ List Timber</Link><Link href="/profile" className="text-[12px] font-bold">Profile</Link></div>
    </div></div>
  );
}
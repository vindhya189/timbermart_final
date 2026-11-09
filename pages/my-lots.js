import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function MyLots() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMyLots(); }, []);

  const fetchMyLots = async () => {
    setLoading(true);
    const { data: listings } = await supabase.from('listings').select('*').order('created_at', {ascending:false});
    
    const withImages = await Promise.all((listings||[]).map(async (lot)=>{
      let images=[];
      // 1. From listing_images
      const {data: imgData} = await supabase.from('listing_images').select('image_url').eq('listing_id', lot.listing_id);
      if(imgData && imgData.length>0) images = imgData.map(r=>r.image_url);
      
      // 2. FALLBACK from storage - FIXES your VIEW issue
      if(images.length===0){
        for(let bucket of ['timber-images','listing-images']){
          const {data: files} = await supabase.storage.from(bucket).list(`${lot.listing_id}`);
          if(files && files.length>0){
            const imgs = files.filter(f=>/\.(jpg|jpeg|png|webp)/i.test(f.name));
            if(imgs.length>0){
              images = imgs.map(f=> supabase.storage.from(bucket).getPublicUrl(`${lot.listing_id}/${f.name}`).data.publicUrl);
              break;
            }
          }
        }
      }
      return {...lot, _images: [...new Set(images)], count: images.length};
    }));
    setLots(withImages);
    setLoading(false);
  };

  if(loading) return <div className="p-8">Loading lots...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-xl font-bold">MY LOTS - EXPIRY TRACKER</h1>
      <p className="text-sm text-gray-500 mb-4">Auto expiry in 10 days - Premium 15 days</p>
      
      {lots.map(lot=>(
        <div key={lot.listing_id} className="border rounded-lg p-4 mb-4 flex gap-4">
          <img src={lot._images[0] || '/no-image.png'} className="w-20 h-20 object-cover rounded bg-gray-100" />
          <div className="flex-1">
            <div className="flex justify-between">
              <h3 className="font-bold">{lot.species || 'Teak Wood - Sagwan'}</h3>
              <span className="text-xs bg-green-100 px-2 py-1 rounded">10D LEFT</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Expiry: 12/11/2026 • {lot.location_village} | GPS:{lot.gps || `${lot.latitude},${lot.longitude}`} | Qty:{lot.quantity} | Price:₹{lot.price} Per CFT | {lot.count}/3 Photos
            </p>
            <div className="mt-2 flex gap-2">
              <Link href={`/p/${lot.listing_id}`} className="text-xs font-bold px-4 py-2 border rounded-full">VIEW</Link>
              <button className="text-xs bg-black text-white px-4 py-2 rounded-full">RENEW ₹299</button>
            </div>
          </div>
        </div>
      ))}
      {lots.length===0 && <p>No lots found - Create in /sell</p>}
    </div>
  );
}
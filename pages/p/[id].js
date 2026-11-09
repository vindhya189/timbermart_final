// pages/p/[id].js - PRODUCT - MIXED GIRTHS + CUT SIZES FULL DISPLAY
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const [lot, setLot] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) loadLot(); }, [id]);

  const loadLot = async () => {
    setLoading(true);
    const { data } = await supabase.from('listings').select('*').eq('listing_id', id).single();
    setLot(data);
    const { data: imgData } = await supabase.from('listing_images').select('image_url').eq('listing_id', id);
    let imgs = imgData?.map(i => i.image_url) || [];
    if (imgs.length === 0) {
      const { data: files } = await supabase.storage.from('timber-images').list(id);
      if (files) imgs = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f.name)).map(f => supabase.storage.from('timber-images').getPublicUrl(`${id}/${f.name}`).data.publicUrl);
    }
    setImages(imgs);
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold">Loading...</div>;
  if (!lot) return <div className="min-h-screen flex items-center justify-center">Not Found</div>;

  const isCut = lot.product_type === 'cut_sizes' || lot.cut_type === 'cut_sizes';

  return (
    <div className="min-h-screen bg-[#f6f6f6] flex justify-center">
      <div className="w-full max-w-[480px] bg-white min-h-screen">
        <div className="sticky top-0 bg-white border-b px-3 py-3 flex justify-between items-center z-10">
          <Link href="/" className="text-[12px] font-bold">← Back</Link>
          <span className="font-black text-[11px]">{lot.listing_id} • {isCut ? 'CUT SIZE' : 'LOGS'}</span>
          <span className="text-[10px] bg-black text-white px-2.5 py-1 rounded-full">{images.length}/3</span>
        </div>

        <div className="bg-white">
          <div className="flex gap-1 overflow-x-auto p-1 snap-x">
            {images.map((img, i) => (
              <div key={i} className="min-w-[88%] h-[380px] flex-shrink-0 snap-center rounded-xl overflow-hidden bg-gray-50"><img src={img} alt={lot.listing_id} className="w-full h-full object-cover" /></div>
            ))}
          </div>
        </div>

        <div className="p-4">
          <h1 className="font-black text-[16px] leading-tight">{lot.title || lot.species}</h1>
          <p className="text-[12px] text-gray-600 mt-1">{lot.species} • {lot.location_village}</p>

          {/* LOGS DISPLAY */}
          {!isCut ? (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="border rounded-xl p-2.5 bg-amber-50">
                  <p className="text-[9px] font-bold text-gray-500">GIRTH {lot.girth_mode === 'mixed' ? '(MIXED)' : ''}</p>
                  <p className="text-[13px] font-black mt-1">
                    {lot.girth_mode === 'single' && `${lot.girth_inch || '-'} inch`}
                    {lot.girth_mode === 'range' && `${lot.girth_min || ''} - ${lot.girth_max || ''} inch`}
                    {lot.girth_mode === 'mixed' && (lot.mixed_girths_text || `${lot.girth_min}-${lot.girth_max} inch Mixed`)}
                  </p>
                </div>
                <div className="border rounded-xl p-2.5 bg-orange-50">
                  <p className="text-[9px] font-bold text-gray-500">LENGTH {lot.length_mode === 'mixed' ? '(MIXED)' : ''}</p>
                  <p className="text-[13px] font-black mt-1">
                    {lot.length_mode === 'single' && `${lot.length_ft || '-'} ft`}
                    {lot.length_mode === 'range' && `${lot.length_min || ''} - ${lot.length_max || ''} ft`}
                    {lot.length_mode === 'mixed' && (lot.mixed_lengths_text || `${lot.length_min}-${lot.length_max} ft Mixed`)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="border rounded-xl py-2"><p className="text-[8px]">LOGS</p><p className="font-black text-[12px]">{lot.logs_count || '-'}</p></div>
                <div className="border rounded-xl py-2"><p className="text-[8px]">CFT</p><p className="font-black text-[12px]">{lot.cft || '-'}</p></div>
                <div className="border rounded-xl py-2"><p className="text-[8px]">TONS</p><p className="font-black text-[12px]">{lot.tons || '-'}</p></div>
                <div className="border rounded-xl py-2"><p className="text-[8px]">PIECES</p><p className="font-black text-[12px]">{lot.pieces || '-'}</p></div>
              </div>
            </div>
          ) : (
            /* CUT SIZES DISPLAY */
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="border rounded-xl p-2.5 bg-blue-50">
                  <p className="text-[8px] font-bold">WIDTH {lot.width_mode === 'mixed' ? '(MIXED)' : ''}</p>
                  <p className="text-[12px] font-black mt-1">
                    {lot.width_mode === 'single' && `${lot.width || '-'} inch`}
                    {lot.width_mode === 'range' && `${lot.width_min}-${lot.width_max} inch`}
                    {lot.width_mode === 'mixed' && (lot.mixed_widths_text || 'Mixed')}
                  </p>
                </div>
                <div className="border rounded-xl p-2.5 bg-blue-50">
                  <p className="text-[8px] font-bold">THICKNESS {lot.thickness_mode === 'mixed' ? '(MIXED)' : ''}</p>
                  <p className="text-[12px] font-black mt-1">
                    {lot.thickness_mode === 'single' && `${lot.thickness || '-'} inch`}
                    {lot.thickness_mode === 'range' && `${lot.thickness_min}-${lot.thickness_max} inch`}
                    {lot.thickness_mode === 'mixed' && (lot.mixed_thickness_text || 'Mixed')}
                  </p>
                </div>
                <div className="border rounded-xl p-2.5 bg-blue-50">
                  <p className="text-[8px] font-bold">LENGTH {lot.cut_length_mode === 'mixed' ? '(MIXED)' : ''}</p>
                  <p className="text-[12px] font-black mt-1">
                    {lot.cut_length_mode === 'single' && `${lot.cut_length || lot.length_ft || '-'} ft`}
                    {lot.cut_length_mode === 'range' && `${lot.cut_length_min}-${lot.cut_length_max} ft`}
                    {lot.cut_length_mode === 'mixed' && (lot.mixed_cut_lengths_text || lot.mixed_lengths_text || 'Mixed')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 border-t pt-4 grid grid-cols-2 gap-3">
            <div><p className="text-[10px] text-gray-500">PRICE / {lot.unit_type}</p><p className="font-black text-[16px]">₹{lot.unit_price || lot.price}</p></div>
            <div><p className="text-[10px] text-gray-500">TOTAL {lot.user_role === 'buyer' ? 'BUDGET' : 'PRICE'}</p><p className="font-black text-[16px] text-green-700">{lot.user_role === 'buyer' ? `₹${lot.budget_min || ''}-${lot.budget_max || ''}` : `₹${lot.total_price || ''}`}</p></div>
          </div>

          {lot.user_role === 'buyer' && <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-2.5"><p className="text-[10px] font-bold text-blue-800">BUYER REQUIREMENT • {lot.urgency}</p><p className="text-[10px] text-blue-700 mt-1">Budget: ₹{lot.budget_min} - ₹{lot.budget_max} • Village: {lot.location_village}</p></div>}

          <a href={`https://wa.me/91${lot.whatsapp_number}?text=Hi, I'm interested in ${lot.listing_id} - ${lot.title} - https://timbermart.in/p/${lot.listing_id}`} target="_blank" className="mt-6 w-full bg-[#25D366] text-white rounded-full py-4 font-black text-[13px] flex items-center justify-center">WhatsApp Owner • {lot.whatsapp_number}</a>
          <Link href="/list-timber" className="mt-3 w-full border border-black rounded-full py-3.5 font-bold text-[12px] flex items-center justify-center">+ List Another Timber</Link>
        </div>
      </div>
    </div>
  );
}
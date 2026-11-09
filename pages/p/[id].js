
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [lot, setLot] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  useEffect(() => {
    if (!router.isReady || !id) return;

    let active = true;

    const loadLot = async () => {
      setLoading(true);
      setError('');

      try {
        const { data, error: lotError } = await supabase
          .from('listings')
          .select('*')
          .eq('listing_id', id)
          .single();

        if (lotError) throw lotError;

        if (!active) return;

        setLot(data);

        const { data: imgData, error: imgError } = await supabase
          .from('listing_images')
          .select('image_url')
          .eq('listing_id', id);

        let imgs = [];

        if (!imgError && imgData?.length) {
          imgs = imgData
            .map((item) => item.image_url)
            .filter(Boolean);
        }

        // Fallback: Supabase Storage
        if (imgs.length === 0) {
          const { data: files } = await supabase.storage
            .from('timber-images')
            .list(id);

          if (files) {
            imgs = files
              .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file.name))
              .map((file) => {
                return supabase.storage
                  .from('timber-images')
                  .getPublicUrl(`${id}/${file.name}`).data.publicUrl;
              });
          }
        }

        if (!active) return;

        setImages(imgs);
      } catch (err) {
        console.error('Listing loading error:', err);

        if (active) {
          setError('Unable to load this listing. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadLot();

    return () => {
      active = false;
    };
  }, [router.isReady, id]);

  // SHARE LISTING
  const shareListing = async () => {
    if (!lot) return;

    const url = `${window.location.origin}/p/${encodeURIComponent(lot.listing_id)}`;

    const title = lot.title || lot.species || 'Timber Listing';

    const text = `🌳 TimberMart Listing

${title}
Species: ${lot.species || '-'}
Price: ₹${lot.unit_price || lot.price || '-'}
Location: ${lot.location_village || '-'}
Listing ID: ${lot.listing_id}

View Listing: ${url}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${title} | TimberMart`,
          text,
          url
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert('Listing details copied successfully!');
      } else {
        window.prompt('Copy this listing link:', url);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url);
          alert('Listing link copied!');
        } catch {
          window.prompt('Copy this listing link:', url);
        }
      }
    }
  };

  const handleListAnotherTimber = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    setShowRegisterPrompt(true);
    return;
  }

  router.push('/dynamic-listing');
};

  // PRELOADER
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f6f6] flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 border-4 border-green-100 border-t-green-700 rounded-full animate-spin"></div>
          <span className="absolute text-3xl">🌳</span>
        </div>

        <h2 className="mt-5 text-lg font-black text-green-800">
          TimberMart
        </h2>

        <p className="mt-1 text-xs font-semibold text-gray-500 animate-pulse">
          Loading timber listing...
        </p>
      </div>
    );
  }

  if (error || !lot) {
    return (
      <div className="min-h-screen bg-[#f6f6f6] flex flex-col items-center justify-center px-5 text-center">
        <div className="text-5xl mb-4">🌳</div>

        <h2 className="text-xl font-black text-gray-800">
          {error ? 'Something went wrong' : 'Listing Not Found'}
        </h2>

        <p className="text-sm text-gray-500 mt-2">
          {error || 'This listing may have been removed or is unavailable.'}
        </p>

        <button
          onClick={() => router.reload()}
          className="mt-5 bg-green-700 text-white px-6 py-3 rounded-full text-sm font-bold"
        >
          Try Again
        </button>

        <Link href="/" className="mt-4 text-sm font-bold underline">
          ← Go Home
        </Link>
      </div>
    );
  }

  const isCut =
    lot.product_type === 'cut_sizes' ||
    lot.cut_type === 'cut_sizes';

  const whatsappMessage = `Hi, I'm interested in ${lot.listing_id} - ${lot.title || lot.species}. View listing: ${typeof window !== 'undefined' ? window.location.origin : 'https://timbermart.co.in'}/p/${encodeURIComponent(lot.listing_id)}`;

  const whatsappNumber = String(lot.whatsapp_number || '').replace(/\D/g, '');

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.startsWith('91') ? whatsappNumber : `91${whatsappNumber}`}?text=${encodeURIComponent(whatsappMessage)}`
    : '';

  return (
    <div className="min-h-screen bg-[#f6f6f6] flex justify-center">
      <div className="w-full max-w-[480px] bg-white min-h-screen">

        {/* HEADER */}
        <div className="sticky top-0 bg-white border-b px-3 py-3 flex justify-between items-center z-10">

          <Link href="/" className="text-[12px] font-bold">
            ← Back
          </Link>

          <span className="font-black text-[11px]">
            {lot.listing_id} • {isCut ? 'CUT SIZE' : 'LOGS'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={shareListing}
              className="text-[11px] font-bold bg-green-700 text-white px-3 py-2 rounded-full"
            >
              ↗ Share
            </button>

            <span className="text-[10px] bg-black text-white px-2.5 py-1 rounded-full">
              {images.length}/3
            </span>
          </div>
        </div>

        {/* IMAGE GALLERY */}
        <div className="bg-white">
          {images.length > 0 ? (
            <div className="flex gap-1 overflow-x-auto p-1 snap-x">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="min-w-[88%] h-[380px] flex-shrink-0 snap-center rounded-xl overflow-hidden bg-gray-50"
                >
                  <img
                    src={img}
                    alt={`${lot.listing_id} image ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center bg-gray-50 text-gray-400">
              <span className="text-5xl">🌳</span>
              <p className="text-xs mt-3 font-semibold">No Images Available</p>
            </div>
          )}
        </div>

        {/* PRODUCT DETAILS */}
        <div className="p-4">

          <h1 className="font-black text-[16px] leading-tight">
            {lot.title || lot.species}
          </h1>

          <p className="text-[12px] text-gray-600 mt-1">
            {lot.species} • {lot.location_village}
          </p>

          {/* LOGS DISPLAY */}
          {!isCut ? (
            <div className="mt-4 space-y-2">

              <div className="grid grid-cols-2 gap-2">

                <div className="border rounded-xl p-2.5 bg-amber-50">
                  <p className="text-[9px] font-bold text-gray-500">
                    GIRTH {lot.girth_mode === 'mixed' ? '(MIXED)' : ''}
                  </p>

                  <p className="text-[13px] font-black mt-1">
                    {lot.girth_mode === 'single' &&
                      `${lot.girth_inch || '-'} inch`}

                    {lot.girth_mode === 'range' &&
                      `${lot.girth_min || ''} - ${lot.girth_max || ''} inch`}

                    {lot.girth_mode === 'mixed' &&
                      (lot.mixed_girths_text ||
                        `${lot.girth_min || ''}-${lot.girth_max || ''} inch Mixed`)}

                    {!lot.girth_mode && '-'}
                  </p>
                </div>

                <div className="border rounded-xl p-2.5 bg-orange-50">
                  <p className="text-[9px] font-bold text-gray-500">
                    LENGTH {lot.length_mode === 'mixed' ? '(MIXED)' : ''}
                  </p>

                  <p className="text-[13px] font-black mt-1">
                    {lot.length_mode === 'single' &&
                      `${lot.length_ft || '-'} ft`}

                    {lot.length_mode === 'range' &&
                      `${lot.length_min || ''} - ${lot.length_max || ''} ft`}

                    {lot.length_mode === 'mixed' &&
                      (lot.mixed_lengths_text ||
                        `${lot.length_min || ''}-${lot.length_max || ''} ft Mixed`)}

                    {!lot.length_mode && '-'}
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-4 gap-2 text-center">

                <div className="border rounded-xl py-2">
                  <p className="text-[8px]">LOGS</p>
                  <p className="font-black text-[12px]">{lot.logs_count || '-'}</p>
                </div>

                <div className="border rounded-xl py-2">
                  <p className="text-[8px]">CFT</p>
                  <p className="font-black text-[12px]">{lot.cft || '-'}</p>
                </div>

                <div className="border rounded-xl py-2">
                  <p className="text-[8px]">TONS</p>
                  <p className="font-black text-[12px]">{lot.tons || '-'}</p>
                </div>

                <div className="border rounded-xl py-2">
                  <p className="text-[8px]">PIECES</p>
                  <p className="font-black text-[12px]">{lot.pieces || '-'}</p>
                </div>

              </div>
            </div>
          ) : (

            /* CUT SIZES DISPLAY */
            <div className="mt-4 space-y-2">

              <div className="grid grid-cols-3 gap-2">

                <div className="border rounded-xl p-2.5 bg-blue-50">
                  <p className="text-[8px] font-bold">
                    WIDTH {lot.width_mode === 'mixed' ? '(MIXED)' : ''}
                  </p>

                  <p className="text-[12px] font-black mt-1">
                    {lot.width_mode === 'single' && `${lot.width || '-'} inch`}
                    {lot.width_mode === 'range' && `${lot.width_min || ''}-${lot.width_max || ''} inch`}
                    {lot.width_mode === 'mixed' && (lot.mixed_widths_text || 'Mixed')}
                    {!lot.width_mode && '-'}
                  </p>
                </div>

                <div className="border rounded-xl p-2.5 bg-blue-50">
                  <p className="text-[8px] font-bold">
                    THICKNESS {lot.thickness_mode === 'mixed' ? '(MIXED)' : ''}
                  </p>

                  <p className="text-[12px] font-black mt-1">
                    {lot.thickness_mode === 'single' && `${lot.thickness || '-'} inch`}
                    {lot.thickness_mode === 'range' && `${lot.thickness_min || ''}-${lot.thickness_max || ''} inch`}
                    {lot.thickness_mode === 'mixed' && (lot.mixed_thickness_text || 'Mixed')}
                    {!lot.thickness_mode && '-'}
                  </p>
                </div>

                <div className="border rounded-xl p-2.5 bg-blue-50">
                  <p className="text-[8px] font-bold">
                    LENGTH {lot.cut_length_mode === 'mixed' ? '(MIXED)' : ''}
                  </p>

                  <p className="text-[12px] font-black mt-1">
                    {lot.cut_length_mode === 'single' &&
                      `${lot.cut_length || lot.length_ft || '-'} ft`}

                    {lot.cut_length_mode === 'range' &&
                      `${lot.cut_length_min || ''}-${lot.cut_length_max || ''} ft`}

                    {lot.cut_length_mode === 'mixed' &&
                      (lot.mixed_cut_lengths_text || lot.mixed_lengths_text || 'Mixed')}

                    {!lot.cut_length_mode && '-'}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* PRICE DETAILS */}
          <div className="mt-4 border-t pt-4 grid grid-cols-2 gap-3">

            <div>
              <p className="text-[10px] text-gray-500">
                PRICE / {lot.unit_type}
              </p>

              <p className="font-black text-[16px]">
                ₹{lot.unit_price || lot.price || '-'}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-gray-500">
                TOTAL {lot.user_role === 'buyer' ? 'BUDGET' : 'PRICE'}
              </p>

              <p className="font-black text-[16px] text-green-700">
                {lot.user_role === 'buyer'
                  ? `₹${lot.budget_min || ''}-${lot.budget_max || ''}`
                  : `₹${lot.total_price || ''}`}
              </p>
            </div>

          </div>

          {/* BUYER REQUIREMENT */}
          {lot.user_role === 'buyer' && (
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-blue-800">
                BUYER REQUIREMENT • {lot.urgency}
              </p>

              <p className="text-[10px] text-blue-700 mt-1">
                Budget: ₹{lot.budget_min} - ₹{lot.budget_max}
                {' • '}
                Village: {lot.location_village}
              </p>
            </div>
          )}

          {/* WHATSAPP OWNER */}
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full bg-[#25D366] text-white rounded-full py-4 font-black text-[13px] flex items-center justify-center"
            >
              WhatsApp Owner • {lot.whatsapp_number}
            </a>
          ) : (
            <div className="mt-6 w-full bg-gray-200 text-gray-500 rounded-full py-4 font-bold text-[13px] text-center">
              WhatsApp Number Not Available
            </div>
          )}

          {/* LIST ANOTHER TIMBER */}
<button
  type="button"
  onClick={handleListAnotherTimber}
  className="mt-3 w-full border border-black rounded-full py-3.5 font-bold text-[12px] flex items-center justify-center"
>
  + List Another Timber
</button>

{showRegisterPrompt && (
  <div className="mt-3 border border-green-200 bg-green-50 rounded-xl p-3 text-center">
    <p className="text-[11px] font-semibold text-gray-700">
      You have to register for adding listings.
    </p>

    <button
      type="button"
      onClick={() => router.push('/login')}
      className="mt-2 bg-green-700 text-white text-[11px] font-bold px-5 py-2 rounded-full"
    >
      Login
    </button>
  </div>
)}

        </div>
      </div>
    </div>
  );
}

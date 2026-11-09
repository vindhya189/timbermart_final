import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // CORS allow
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { 
        status = 'approved', 
        limit = '50', 
        village, 
        species, 
        search, 
        id,
        type = 'all' // sell, buy_wanted, jobs, all
      } = req.query;

      console.log('Posts API - Fetching:', { status, limit, village, species, search, id, type });

      let query = supabase.from('listings').select('*');

      // Filter by ID - single lot like TM-809352
      if (id) {
        query = query.eq('listing_id', id);
      } else {
        // Filter by status
        if (status !== 'all') {
          query = query.eq('status', status);
        }
        // Filter by village
        if (village) {
          query = query.ilike('location_village', `%${village}%`);
        }
        // Filter by species
        if (species) {
          query = query.ilike('species', `%${species}%`);
        }
        // Search in species, village, district
        if (search) {
          query = query.or(`species.ilike.%${search}%,location_village.ilike.%${search}%,location_district.ilike.%${search}%,full_address.ilike.%${search}%`);
        }
      }

      query = query.order('created_at', { ascending: false }).limit(parseInt(limit));

      const { data: listings, error } = await query;

      if (error) {
        console.error('Supabase listings error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      console.log(`Found ${listings?.length || 0} listings`);

      // Fetch images for each listing - FIXES 0/0 issue like TM-809352
      const listingsWithImages = await Promise.all(
        (listings || []).map(async (lot) => {
          let images = [];

          // 1. Try listing_images table - PRIMARY
          try {
            const { data: imgData } = await supabase
              .from('listing_images')
              .select('image_url')
              .eq('listing_id', lot.listing_id)
              .order('created_at', { ascending: true });

            if (imgData && imgData.length > 0) {
              images = imgData.map(r => r.image_url).filter(u => u && u.startsWith('http'));
              console.log(`Images from table for ${lot.listing_id}:`, images.length);
            }
          } catch (e) {
            console.log('listing_images fetch error:', e.message);
          }

          // 2. FALLBACK - Storage buckets - FIXES old TM-809352 0/0
          if (images.length === 0) {
            for (let bucket of ['timber-images', 'listing-images']) {
              try {
                const { data: files, error: listError } = await supabase.storage
                  .from(bucket)
                  .list(`${lot.listing_id}`);

                if (!listError && files && files.length > 0) {
                  const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp|JPG|JPEG|PNG|WEBP)$/i.test(f.name));
                  if (imageFiles.length > 0) {
                    images = imageFiles.map(f => {
                      const { data } = supabase.storage.from(bucket).getPublicUrl(`${lot.listing_id}/${f.name}`);
                      return data.publicUrl;
                    });
                    console.log(`Images from storage ${bucket} for ${lot.listing_id}:`, images.length);
                    break; // Found in this bucket, stop
                  }
                }
              } catch (e) {
                console.log(`Storage ${bucket} error for ${lot.listing_id}:`, e.message);
              }
            }
          }

          // 3. Deduplicate
          images = [...new Set(images.filter(Boolean))];

          return {
            ...lot,
            _images: images, // For frontend
            photos: images,  // For compatibility
            image_count: images.length,
            // Fix for frontend display
            total_photos_text: images.length > 0 ? `${images.length}/${images.length}` : '0/0 - No Photos - Upload in Admin',
          };
        })
      );

      return res.status(200).json({
        success: true,
        count: listingsWithImages.length,
        data: listingsWithImages,
        message: `Found ${listingsWithImages.length} lots - Fixed 0/0 like TM-809352`,
      });

    } catch (err) {
      console.error('Posts API error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST - Create listing via API (optional - sell.js uses direct supabase)
  if (req.method === 'POST') {
    try {
      const body = req.body;
      console.log('Posts API - Creating:', body.listing_id);

      const { data, error } = await supabase.from('listings').insert(body).select().single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed - Use GET' });
}
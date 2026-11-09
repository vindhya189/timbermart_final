
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function checkAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : '';

  if (!token) return { error: 'Login required', status: 401 };

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return { error: 'Invalid login session', status: 401 };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users_profile')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return { error: 'Admin access denied', status: 403 };
  }

  return { user: data.user };
}

export default async function handler(req, res) {
  try {
    const auth = await checkAdmin(req);

    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (req.method === 'GET') {
      const [listingResult, carpenterResult, paymentResult] =
        await Promise.all([
          supabaseAdmin
            .from('listings')
            .select('*, listing_images(image_url)')
            .order('created_at', { ascending: false })
            .limit(300),

          supabaseAdmin
            .from('carpenters')
            .select('*')
            .limit(300),

          supabaseAdmin
            .from('payments')
            .select('*')
            .eq('status', 'success')
            .order('created_at', { ascending: false })
            .limit(500),
        ]);

      const dbError =
        listingResult.error ||
        carpenterResult.error ||
        paymentResult.error;

      if (dbError) {
        return res.status(500).json({ error: dbError.message });
      }

      return res.status(200).json({
        success: true,
        listings: listingResult.data || [],
        carpenters: carpenterResult.data || [],
        payments: paymentResult.data || [],
      });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, id, updates = {} } = req.body || {};

    if (!action || id === undefined || id === null || id === '') {
      return res.status(400).json({ error: 'Action and record ID are required' });
    }

    if (action === 'update_listing') {
      const allowed = ['status', 'is_premium', 'is_verified'];
      const safeUpdates = {};

      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
          safeUpdates[key] = updates[key];
        }
      }

      if (!Object.keys(safeUpdates).length) {
        return res.status(400).json({ error: 'No valid listing updates supplied' });
      }

      const { data, error } = await supabaseAdmin
        .from('listings')
        .update(safeUpdates)
        .eq('listing_id', id)
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Listing not found. No record was updated.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Listing updated successfully',
        record: data,
      });
    }

    if (action === 'delete_listing') {
      const { error: imageError } = await supabaseAdmin
        .from('listing_images')
        .delete()
        .eq('listing_id', id);

      if (imageError) throw imageError;

      const { data, error } = await supabaseAdmin
        .from('listings')
        .delete()
        .eq('listing_id', id)
        .select('listing_id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Listing not found.' });
      }

      return res.status(200).json({ success: true, message: 'Listing deleted' });
    }

    if (action === 'update_carpenter') {
      const allowed = ['status', 'is_pro'];
      const safeUpdates = {};

      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
          safeUpdates[key] = updates[key];
        }
      }

      if (!Object.keys(safeUpdates).length) {
        return res.status(400).json({ error: 'No valid carpenter updates supplied' });
      }

      const { data, error } = await supabaseAdmin
        .from('carpenters')
        .update(safeUpdates)
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Carpenter not found. No record was updated.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Carpenter updated successfully',
        record: data,
      });
    }

    if (action === 'delete_carpenter') {
      const { data, error } = await supabaseAdmin
        .from('carpenters')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Carpenter not found.' });
      }

      return res.status(200).json({ success: true, message: 'Carpenter deleted' });
    }

    return res.status(400).json({ error: 'Unknown admin action' });

  } catch (error) {
    console.error('Admin API error:', error);

    return res.status(500).json({
      error: error.message || 'Admin API failed',
    });
  }
}

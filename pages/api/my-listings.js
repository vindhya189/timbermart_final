
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : '';

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Please login first'
      });
    }

    // Verify logged-in Supabase user
    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired login session'
      });
    }

    // Fetch only this seller's listings
    const { data: listings, error } = await supabaseAdmin
      .from('listings')
      .select(`
        id,
        listing_id,
        title,
        species,
        location_village,
        status,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('My listings fetch error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to fetch your listings'
      });
    }

    return res.status(200).json({
      success: true,
      listings: listings || []
    });

  } catch (error) {
    console.error('My listings API error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}

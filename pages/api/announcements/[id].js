
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid announcement ID'
      });
    }

    
const { data, error } = await supabase
  .from('announcements')
  .select(`
    id,
    title,
    description,
    image_url,
    contact_number,
    website_url,
    target_audience,
    announcement_type,
    is_admin_announcement,
    starts_at,
    expires_at,
    created_at
  `)
  .eq('id', id)
  .eq('status', 'active')
  .maybeSingle();


    if (error) {
      console.error('Announcement fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Unable to fetch announcement'
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found or unavailable'
      });
    }

    if (data.expires_at && new Date(data.expires_at) <= new Date()) {
      return res.status(404).json({
        success: false,
        message: 'This announcement has expired'
      });
    }

    return res.status(200).json({
      success: true,
      announcement: data
    });

  } catch (error) {
    console.error('Announcement API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

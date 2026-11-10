
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const token = req.headers.authorization?.replace(
      /^Bearer\s+/i,
      ''
    );

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Login required'
      });
    }

    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        announcement_payments (
          amount,
          payment_status,
          razorpay_payment_id,
          verified_at
        )
      `)
      .eq('created_by', authData.user.id)
      .eq('announcement_type', 'paid')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      promotions: data || []
    });
  } catch (error) {
    console.error('My promotions API error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to load promotions'
    });
  }
}

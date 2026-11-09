import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    let { phone, password } = req.body || {};

    phone = String(phone || '').replace(/\D/g, '');

    if (phone.startsWith('91') && phone.length === 12) {
      phone = phone.slice(2);
    }

    if (
      !/^[6-9]\d{9}$/.test(phone) ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter valid phone number and password.'
      });
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.error('Supabase environment variables missing');

      return res.status(500).json({
        success: false,
        message: 'Login server configuration missing.'
      });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const { data: profile, error: profileError } = await admin
      .from('users_profile')
      .select('email')
      .eq('phone', phone)
      .maybeSingle();

    if (profileError || !profile?.email) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect phone number or password.'
      });
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email: profile.email,
      password
    });

    if (error || !data.session) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect phone number or password.'
      });
    }

    return res.status(200).json({
      success: true,
      session: data.session,
      user: data.user
    });

  } catch (error) {
    console.error('Phone login error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Login server error.'
    });
  }
}
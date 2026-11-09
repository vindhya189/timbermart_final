import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function verifyRegistrationToken(token, phone) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return false;

    const [payload, signature] = parts;
    const secret = process.env.AUTH_REGISTRATION_SECRET;

    if (!secret) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest();

    const actual = Buffer.from(signature, 'base64url');

    if (
      actual.length !== expected.length ||
      !crypto.timingSafeEqual(actual, expected)
    ) {
      return false;
    }

    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString()
    );

    return (
      decoded.phone === phone &&
      decoded.purpose === 'timbermart-registration' &&
      decoded.expires > Date.now()
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed'
    });
  }

  let admin;
  let createdUserId = null;

  try {
    const {
      name,
      email,
      phone,
      password,
      registrationToken
    } = req.body || {};

    let clean = String(phone || '').replace(/\D/g, '');

    if (clean.startsWith('91') && clean.length === 12) {
      clean = clean.slice(2);
    }

    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    // Validate registration details
    if (
      !/^[6-9]\d{9}$/.test(clean) ||
      cleanName.length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid registration details'
      });
    }

    // Verify WhatsApp OTP registration token
    if (
      !process.env.AUTH_REGISTRATION_SECRET ||
      !verifyRegistrationToken(registrationToken, clean)
    ) {
      return res.status(401).json({
        success: false,
        message: 'OTP verification expired. Please verify again.'
      });
    }

    // Check server environment variables
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error('Supabase server configuration missing.');
    }

    admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // CHECK PHONE NUMBER BEFORE CREATING AUTH USER
    const { data: existingPhone, error: phoneCheckError } = await admin
      .from('users_profile')
      .select('id')
      .eq('phone', clean)
      .maybeSingle();

    if (phoneCheckError) {
      console.error('Phone check error:', phoneCheckError);
      throw phoneCheckError;
    }

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already exists. Please login.'
      });
    }

    // CREATE AUTH USER
    const { data, error } = await admin.auth.admin.createUser({
      email: cleanEmail,
      email_confirm: true,
      password,
      user_metadata: {
        full_name: cleanName,
        phone: clean,
        whatsapp_verified: true
      }
    });

    if (error) {
      if (
        error.message?.toLowerCase().includes('already') ||
        error.code === 'email_exists'
      ) {
        return res.status(409).json({
          success: false,
          message: 'This email already has an account. Please login.'
        });
      }

      throw error;
    }

    createdUserId = data.user.id;

    // CREATE USER PROFILE
    const { error: profileError } = await admin
      .from('users_profile')
      .insert({
        id: data.user.id,
        phone: clean,
        name: cleanName,
        email: cleanEmail,
        role: 'user'
      });

    if (profileError) {
      console.error('Profile save error:', profileError);

      await admin.auth.admin.deleteUser(data.user.id);
      createdUserId = null;

      if (profileError.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'Phone number or email already exists. Please login.'
        });
      }

      throw profileError;
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      userId: data.user.id
    });

  } catch (error) {
    console.error('Account creation error:', error);

    if (admin && createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId);
    }

    return res.status(500).json({
      success: false,
      message: 'Account creation failed. Please try again.'
    });
  }
}
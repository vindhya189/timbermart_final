
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // 1. CHECK ENVIRONMENT VARIABLES
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'AUTH_REGISTRATION_SECRET'
    ];

    const missing = required.filter(
      key => !process.env[key]
    );

    if (missing.length > 0) {
      console.error('Missing environment variables:', missing);

      return res.status(500).json({
        success: false,
        message: 'Server configuration missing.'
      });
    }

    // 2. NORMALIZE PHONE NUMBER
    const { phone, otp } = req.body || {};

    let clean = String(phone || '').replace(/\D/g, '');

    if (clean.startsWith('91') && clean.length === 12) {
      clean = clean.slice(2);
    }

    if (clean.startsWith('0') && clean.length === 11) {
      clean = clean.slice(1);
    }

    const code = String(otp || '').trim();

    if (!/^[6-9]\d{9}$/.test(clean) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number or OTP.'
      });
    }

    // 3. CREATE SUPABASE ADMIN CLIENT
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

    // 4. FETCH OTP RECORD
    const { data: record, error } = await admin
      .from('whatsapp_otps')
      .select('phone, otp_hash, expires_at, attempts')
      .eq('phone', clean)
      .maybeSingle();

    if (error) {
      console.error('Supabase fetch error:', error.message);
      throw new Error('Unable to fetch OTP record.');
    }

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found. Please request a new OTP.'
      });
    }

    // 5. CHECK EXPIRY
    if (new Date(record.expires_at).getTime() <= Date.now()) {
      const { error: deleteError } = await admin
        .from('whatsapp_otps')
        .delete()
        .eq('phone', clean);

      if (deleteError) {
        console.error('Expired OTP cleanup error:', deleteError.message);
      }

      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new OTP.'
      });
    }

    // 6. CHECK ATTEMPTS
    const attempts = Number(record.attempts || 0);

    if (attempts >= 5) {
      await admin
        .from('whatsapp_otps')
        .delete()
        .eq('phone', clean);

      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Request a new OTP.'
      });
    }

    // 7. HASH SUBMITTED OTP
    const submittedHash = crypto
      .createHash('sha256')
      .update(code)
      .digest();

    const storedHash = Buffer.from(record.otp_hash, 'hex');

    if (
      storedHash.length !== submittedHash.length ||
      !crypto.timingSafeEqual(storedHash, submittedHash)
    ) {
      const { error: updateError } = await admin
        .from('whatsapp_otps')
        .update({ attempts: attempts + 1 })
        .eq('phone', clean);

      if (updateError) {
        console.error('Attempt update error:', updateError.message);
        throw new Error('Unable to update OTP attempts.');
      }

      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Try again.'
      });
    }

    // 8. CREATE REGISTRATION TOKEN
    // Do this BEFORE consuming the OTP.
    const secret = process.env.AUTH_REGISTRATION_SECRET;

    const tokenPayload = Buffer.from(
      JSON.stringify({
        phone: clean,
        purpose: 'timbermart-registration',
        expires: Date.now() + 5 * 60 * 1000,
        nonce: crypto.randomBytes(16).toString('hex')
      })
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', secret)
      .update(tokenPayload)
      .digest('base64url');

    const registrationToken = tokenPayload + '.' + signature;

    // 9. CONSUME VERIFIED OTP
    const { error: deleteError } = await admin
      .from('whatsapp_otps')
      .delete()
      .eq('phone', clean);

    if (deleteError) {
      console.error('OTP delete error:', deleteError.message);
      throw new Error('Unable to consume verified OTP.');
    }

    // 10. SUCCESS
    return res.status(200).json({
      success: true,
      message: 'WhatsApp verified successfully.',
      registrationToken
    });

  } catch (error) {
    console.error('VERIFY OTP SERVER ERROR:', error.message);

    return res.status(500).json({
      success: false,
      message: 'OTP verification server error.'
    });
  }
}

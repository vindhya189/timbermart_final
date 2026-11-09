import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    if (required.some(key => !process.env[key])) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration missing.'
      });
    }

    let phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (phone.startsWith('91') && phone.length === 12) phone = phone.slice(2);
    if (phone.startsWith('0') && phone.length === 11) phone = phone.slice(1);

    const otp = String(req.body?.otp || '').trim();

    if (!/^[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number or OTP.'
      });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: record, error } = await admin
      .from('whatsapp_password_reset_otps')
      .select('otp_hash, expires_at, attempts')
      .eq('phone', phone)
      .maybeSingle();

    if (error) throw error;

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found. Please request a new OTP.'
      });
    }

    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await admin.from('whatsapp_password_reset_otps').delete().eq('phone', phone);

      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new OTP.'
      });
    }

    const attempts = Number(record.attempts || 0);

    if (attempts >= 5) {
      await admin.from('whatsapp_password_reset_otps').delete().eq('phone', phone);

      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Request a new OTP.'
      });
    }

    const submittedHash = crypto.createHash('sha256').update(otp).digest();
    const storedHash = Buffer.from(record.otp_hash, 'hex');

    if (
      storedHash.length !== submittedHash.length ||
      !crypto.timingSafeEqual(storedHash, submittedHash)
    ) {
      await admin
        .from('whatsapp_password_reset_otps')
        .update({ attempts: attempts + 1 })
        .eq('phone', phone);

      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Try again.'
      });
    }

    // Create a random one-time reset token.
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: tokenError } = await admin
      .from('whatsapp_password_reset_tokens')
      .upsert({
        phone,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      }, { onConflict: 'phone' });

    if (tokenError) throw tokenError;

    const { error: deleteError } = await admin
      .from('whatsapp_password_reset_otps')
      .delete()
      .eq('phone', phone);

    if (deleteError) throw deleteError;

    return res.status(200).json({
      success: true,
      message: 'OTP verified. Create your new password.',
      resetToken
    });

  } catch (error) {
    console.error('VERIFY RESET OTP ERROR:', error.message);

    return res.status(500).json({
      success: false,
      message: 'OTP verification failed.'
    });
  }
}
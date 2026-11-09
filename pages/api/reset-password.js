import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { phone: rawPhone, resetToken, newPassword } = req.body || {};

    let phone = String(rawPhone || '').replace(/\D/g, '');
    if (phone.startsWith('91') && phone.length === 12) phone = phone.slice(2);
    if (phone.startsWith('0') && phone.length === 11) phone = phone.slice(1);

    if (
      !/^[6-9]\d{9}$/.test(phone) ||
      typeof resetToken !== 'string' ||
      resetToken.length !== 64 ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset details. Password must have at least 8 characters.'
      });
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration missing.'
      });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const tokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const { data: tokenRecord, error: tokenError } = await admin
      .from('whatsapp_password_reset_tokens')
      .select('phone, token_hash, expires_at')
      .eq('phone', phone)
      .maybeSingle();

    if (tokenError) throw tokenError;

    if (
      !tokenRecord ||
      tokenRecord.token_hash !== tokenHash ||
      new Date(tokenRecord.expires_at).getTime() <= Date.now()
    ) {
      return res.status(401).json({
        success: false,
        message: 'Reset session expired. Please verify OTP again.'
      });
    }

    const { data: profile, error: profileError } = await admin
      .from('users_profile')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile?.id) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.'
      });
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    );

    if (updateError) throw updateError;

    // Consume the reset token after a successful password update.
    const { error: consumeError } = await admin
      .from('whatsapp_password_reset_tokens')
      .delete()
      .eq('phone', phone)
      .eq('token_hash', tokenHash);

    if (consumeError) {
      console.error('Reset token cleanup error:', consumeError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login.'
    });

  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to reset password. Please try again.'
    });
  }
}
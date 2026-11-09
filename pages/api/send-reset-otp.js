import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  let admin;
  let clean = '';

  try {
    const required = [
      'MSG91_AUTH_KEY',
      'MSG91_INTEGRATED_NUMBER',
      'MSG91_WA_TEMPLATE',
      'MSG91_WA_LANGUAGE',
      'MSG91_WA_NAMESPACE',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    if (required.some(key => !process.env[key])) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration missing.'
      });
    }

    clean = String(req.body?.phone || '').replace(/\D/g, '');

    if (clean.startsWith('91') && clean.length === 12) clean = clean.slice(2);
    if (clean.startsWith('0') && clean.length === 11) clean = clean.slice(1);

    if (!/^[6-9]\d{9}$/.test(clean)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid 10-digit mobile number.'
      });
    }

    admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Only send reset OTP to an existing account.
    const { data: profile, error: profileError } = await admin
      .from('users_profile')
      .select('id')
      .eq('phone', clean)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number.'
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: saveError } = await admin
      .from('whatsapp_password_reset_otps')
      .upsert({
        phone: clean,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        created_at: new Date().toISOString()
      }, { onConflict: 'phone' });

    if (saveError) throw saveError;

    const integratedNumber = process.env.MSG91_INTEGRATED_NUMBER.replace(/\D/g, '');

    const payload = {
      integrated_number: integratedNumber,
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: process.env.MSG91_WA_TEMPLATE,
          language: {
            code: process.env.MSG91_WA_LANGUAGE,
            policy: 'deterministic'
          },
          namespace: process.env.MSG91_WA_NAMESPACE,
          to_and_components: [{
            to: ['91' + clean],
            components: {
              body_1: { type: 'text', value: otp },
              button_1: { subtype: 'url', type: 'text', value: otp }
            }
          }]
        }
      }
    };

    const response = await fetch(
      'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authkey: process.env.MSG91_AUTH_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const raw = await response.text();
    let result;

    try {
      result = JSON.parse(raw);
    } catch {
      result = { message: raw };
    }

    const accepted =
      response.ok &&
      String(result.status || '').toLowerCase() === 'success' &&
      result.hasError !== true &&
      Boolean(result.request_id);

    if (!accepted) {
      await admin
        .from('whatsapp_password_reset_otps')
        .delete()
        .eq('phone', clean);

      console.error('MSG91 reset OTP rejected:', response.status, result);

      return res.status(502).json({
        success: false,
        message: 'WhatsApp OTP could not be sent. Please try again.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to WhatsApp.'
    });

  } catch (error) {
    console.error('SEND RESET OTP ERROR:', error.message);

    if (admin && clean) {
      await admin
        .from('whatsapp_password_reset_otps')
        .delete()
        .eq('phone', clean);
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to send reset OTP.'
    });
  }
}
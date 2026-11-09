
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed'
    });
  }

  let admin = null;
  let clean = '';

  try {
    // 1. CHECK ENVIRONMENT VARIABLES
    const required = [
      'MSG91_AUTH_KEY',
      'MSG91_INTEGRATED_NUMBER',
      'MSG91_WA_TEMPLATE',
      'MSG91_WA_LANGUAGE',
      'MSG91_WA_NAMESPACE',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missing = required.filter(
      key => !process.env[key]
    );

    if (missing.length > 0) {
      console.error('Missing environment variables:', missing);

      return res.status(500).json({
        success: false,
        message: 'Server configuration missing.',
        missing
      });
    }

    // 2. VALIDATE PHONE NUMBER
    const { phone } = req.body || {};

    clean = String(phone || '').replace(/\D/g, '');

    if (clean.startsWith('91') && clean.length === 12) {
      clean = clean.slice(2);
    }

    if (clean.startsWith('0') && clean.length === 11) {
      clean = clean.slice(1);
    }

    if (!/^[6-9]\d{9}$/.test(clean)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid 10-digit Indian mobile number.'
      });
    }

    const recipient = '91' + clean;

    // 3. NORMALIZE MSG91 SENDER NUMBER
    const integratedNumber =
      process.env.MSG91_INTEGRATED_NUMBER.replace(/\D/g, '');

    if (!/^\d{10,15}$/.test(integratedNumber)) {
      return res.status(500).json({
        success: false,
        message: 'Invalid MSG91 integrated number.'
      });
    }

    // 4. CREATE SUPABASE ADMIN CLIENT
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
    // CHECK IF PHONE NUMBER IS ALREADY REGISTERED
const { data: existingUser, error: existingUserError } = await admin
  .from('users_profile')
  .select('id')
  .eq('phone', clean)
  .maybeSingle();

if (existingUserError) {
  console.error('Existing user check error:', existingUserError.message);

  return res.status(500).json({
    success: false,
    message: 'Unable to check account. Please try again.'
  });
}

if (existingUser) {
  return res.status(409).json({
    success: false,
    alreadyExists: true,
    message: 'Account already exists with this number. Please login.'
  });
}

    // 5. GENERATE OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    const otpHash = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    ).toISOString();

    // 6. SAVE OTP HASH IN SUPABASE
    const { error: dbError } = await admin
      .from('whatsapp_otps')
      .upsert(
        {
          phone: clean,
          otp_hash: otpHash,
          expires_at: expiresAt,
          attempts: 0,
          created_at: new Date().toISOString()
        },
        {
          onConflict: 'phone'
        }
      );

    if (dbError) {
      console.error('OTP database error:', dbError.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to save OTP.'
      });
    }

    // 7. MSG91 WHATSAPP TEMPLATE PAYLOAD
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

          to_and_components: [
            {
              to: [recipient],

              components: {
                body_1: {
                  type: 'text',
                  value: otp
                },

                button_1: {
                  subtype: 'url',
                  type: 'text',
                  value: otp
                }
              }
            }
          ]
        }
      }
    };

    // 8. SEND OTP THROUGH MSG91
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

    // 9. READ MSG91 RESPONSE
    const rawResponse = await response.text();

    let result;

    try {
      result = JSON.parse(rawResponse);
    } catch {
      result = { message: rawResponse };
    }

    // Do not log OTP, auth key or recipient number.
    console.log('MSG91 HTTP STATUS:', response.status);
    console.log('MSG91 RESPONSE:', result);

    // 10. CHECK API RESPONSE
    const accepted =
      response.ok &&
      String(result.status || '').toLowerCase() === 'success' &&
      result.hasError !== true &&
      Boolean(result.request_id);

    if (!accepted) {
      const { error: deleteError } = await admin
        .from('whatsapp_otps')
        .delete()
        .eq('phone', clean);

      if (deleteError) {
        console.error('OTP cleanup error:', deleteError.message);
      }

      return res.status(502).json({
        success: false,
        message: 'MSG91 rejected the WhatsApp request.',
        httpStatus: response.status,
        details: result
      });
    }

    // 11. SUCCESS
    return res.status(200).json({
      success: true,
      message: 'WhatsApp OTP request accepted.',
      requestId: result.request_id
    });

  } catch (error) {
    console.error('SEND OTP ERROR:', error.message);

    if (admin && clean) {
      await admin
        .from('whatsapp_otps')
        .delete()
        .eq('phone', clean);
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to send OTP. Please try again.'
    });
  }
}

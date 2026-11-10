
import Razorpay from 'razorpay';
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

const PLANS = {
  // EXISTING SUBSCRIPTION PLANS
  'Premium Listing': {
    amount: 99,
    type: 'subscription'
  },
  premium: {
    amount: 99,
    type: 'subscription'
  },
  'Carpenter Pro': {
    amount: 149,
    type: 'subscription'
  },
  carpenter: {
    amount: 149,
    type: 'subscription'
  },
  'Business - 10 Listings': {
    amount: 499,
    type: 'subscription'
  },
  business: {
    amount: 499,
    type: 'subscription'
  },

  // EXISTING PREMIUM LISTING PROMOTION PLANS
  local_top: {
    amount: 199,
    type: 'listing_promotion',
    scope: 'local',
    radius: 10,
    validity: 14
  },
  city_top: {
    amount: 499,
    type: 'listing_promotion',
    scope: 'city',
    validity: 14
  },
  district_top: {
    amount: 1499,
    type: 'listing_promotion',
    scope: 'district',
    validity: 14
  },
  state_top: {
    amount: 2999,
    type: 'listing_promotion',
    scope: 'state',
    validity: 14
  },
  india_top: {
    amount: 4999,
    type: 'listing_promotion',
    scope: 'india',
    validity: 14
  },

  // NEW ANNOUNCEMENT PLANS
  announcement_7: {
    amount: 149,
    type: 'announcement',
    validity: 7
  },
  announcement_14: {
    amount: 249,
    type: 'announcement',
    validity: 14
  }
};

export default async function handler(req, res) {
  // METHOD CHECK
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  // RAZORPAY CONFIGURATION CHECK
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(500).json({
      success: false,
      error: 'Razorpay keys missing in server configuration'
    });
  }

  try {
    // GET REQUEST DETAILS
    const {
      plan,
      phone,
      listingId,
      listing_id,
      title,
      description,
      image_url,
      contact_number,
      website_url,
      target_audience
    } = req.body || {};

    const cleanPlan = String(plan || '').trim();
    const selectedPlan = PLANS[cleanPlan];

    // PLAN VALIDATION
    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected'
      });
    }

    // PHONE VALIDATION
    const cleanPhone = String(phone || '').replace(/\D/g, '');

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 10-digit phone number'
      });
    }

    // LISTING ID
    const cleanListingId = String(
      listingId || listing_id || ''
    ).trim();

    // EXISTING LISTING PROMOTION VALIDATION
    if (
      selectedPlan.type === 'listing_promotion' &&
      !cleanListingId
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your existing Listing ID before purchasing Premium promotion'
      });
    }

    // ANNOUNCEMENT DETAILS
    let announcement = null;

    if (selectedPlan.type === 'announcement') {
      const audiences = [
        'all',
        'farmers',
        'merchants',
        'sawmills',
        'carpenters'
      ];

      if (
        !title?.trim() ||
        !description?.trim() ||
        !image_url ||
        !contact_number?.trim() ||
        !audiences.includes(target_audience)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Please provide all required announcement details'
        });
      }

      if (
        website_url &&
        !/^https:\/\//i.test(website_url.trim())
      ) {
        return res.status(400).json({
          success: false,
          error: 'Website URL must start with https://'
        });
      }

      if (
        !/^https:\/\//i.test(image_url)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid announcement image URL'
        });
      }

      // FIND USER PROFILE
      const { data: seller, error: sellerError } = await supabase
        .from('users_profile')
        .select('id, phone')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (sellerError) throw sellerError;

      if (!seller) {
        return res.status(404).json({
          success: false,
          error: 'User profile not found'
        });
      }

      // CREATE PENDING ANNOUNCEMENT
      const { data: announcementData, error: announcementError } =
        await supabase
          .from('announcements')
          .insert({
            created_by: seller.id,
            title: title.trim(),
            description: description.trim(),
            image_url,
            contact_number: contact_number.trim(),
            website_url: website_url?.trim() || null,
            announcement_type: 'paid',
            is_admin_announcement: false,
            target_audience,
            package_days: selectedPlan.validity,
            amount: selectedPlan.amount,
            status: 'pending_payment'
          })
          .select()
          .single();

      if (announcementError) throw announcementError;

      announcement = announcementData;
    }

    // CREATE RAZORPAY INSTANCE
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    // CREATE RAZORPAY ORDER
    const order = await razorpay.orders.create({
      amount: selectedPlan.amount * 100,
      currency: 'INR',
      receipt: 'TM-' + Date.now(),

      notes: {
        plan: cleanPlan,
        phone: cleanPhone,
        listing_id: cleanListingId,
        plan_type: selectedPlan.type,
        scope: selectedPlan.scope || '',
        radius_km: String(selectedPlan.radius || ''),
        validity_days: String(selectedPlan.validity || ''),
        announcement_id: announcement?.id || ''
      }
    });

    // SAVE ANNOUNCEMENT PAYMENT RECORD
    if (announcement) {
      const { error: paymentError } = await supabase
        .from('announcement_payments')
        .insert({
          announcement_id: announcement.id,
          user_id: announcement.created_by,
          razorpay_order_id: order.id,
          amount: selectedPlan.amount,
          payment_status: 'created'
        });

      if (paymentError) {
        // Remove pending announcement if payment record creation fails
        await supabase
          .from('announcements')
          .delete()
          .eq('id', announcement.id)
          .eq('status', 'pending_payment');

        throw paymentError;
      }
    }

    // SUCCESS RESPONSE
    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: keyId,
      planType: selectedPlan.type,
      plan: cleanPlan,
      listingId: cleanListingId,
      validityDays: selectedPlan.validity || 30,

      // NEW ANNOUNCEMENT RESPONSE
      announcementId: announcement?.id || null
    });

  } catch (error) {
    console.error('Razorpay order creation error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Unable to create payment order'
    });
  }
}

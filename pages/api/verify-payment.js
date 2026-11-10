
import crypto from 'crypto';
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

  // EXISTING PREMIUM PROMOTION PLANS
  local_top: {
    amount: 199,
    type: 'listing_promotion',
    scope: 'local',
    radius: 10
  },
  city_top: {
    amount: 499,
    type: 'listing_promotion',
    scope: 'city'
  },
  district_top: {
    amount: 1499,
    type: 'listing_promotion',
    scope: 'district'
  },
  state_top: {
    amount: 2999,
    type: 'listing_promotion',
    scope: 'state'
  },
  india_top: {
    amount: 4999,
    type: 'listing_promotion',
    scope: 'india'
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
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // 1. GET PAYMENT DETAILS
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      phone,
      plan,
      listing_id,
      announcement_id
    } = req.body || {};

    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const cleanListingId = String(listing_id || '').trim();
    const cleanPlan = String(plan || '').trim();
    const cleanAnnouncementId = String(announcement_id || '').trim();

    const selectedPlan = PLANS[cleanPlan];

    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected'
      });
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number'
      });
    }

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        error: 'Payment details missing'
      });
    }

    if (
      selectedPlan.type === 'listing_promotion' &&
      !cleanListingId
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please select your listing first'
      });
    }

    if (
      selectedPlan.type === 'announcement' &&
      !cleanAnnouncementId
    ) {
      return res.status(400).json({
        success: false,
        error: 'Announcement ID missing'
      });
    }

    // 2. VERIFY RAZORPAY SIGNATURE
    const expectedSignature = crypto
      .createHmac(
        'sha256',
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const actualBuffer = Buffer.from(razorpay_signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature'
      });
    }

    // 3. VERIFY PAYMENT DIRECTLY WITH RAZORPAY
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const order = await razorpay.orders.fetch(razorpay_order_id);

    const payment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      order.status !== 'paid' ||
      payment.status !== 'captured' ||
      payment.order_id !== razorpay_order_id ||
      order.amount !== selectedPlan.amount * 100 ||
      payment.amount !== selectedPlan.amount * 100 ||
      order.currency !== 'INR' ||
      payment.currency !== 'INR' ||
      order.notes?.plan !== cleanPlan ||
      order.notes?.phone !== cleanPhone
    ) {
      return res.status(400).json({
        success: false,
        error: 'Payment details do not match'
      });
    }

    // 4. FIND SELLER PROFILE
    const { data: seller, error: sellerError } = await supabase
      .from('users_profile')
      .select('id, phone')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (sellerError) throw sellerError;

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }

    // 5. ANNOUNCEMENT PAYMENT VERIFICATION
    // Separate flow. Does not touch existing payments/subscriptions.

    if (selectedPlan.type === 'announcement') {

      // VERIFY ANNOUNCEMENT ID IN RAZORPAY ORDER
      if (
        order.notes?.announcement_id !== cleanAnnouncementId
      ) {
        return res.status(400).json({
          success: false,
          error: 'Announcement ID does not match payment order'
        });
      }

      // FIND ANNOUNCEMENT
      const { data: announcement, error: announcementError } =
        await supabase
          .from('announcements')
          .select('*')
          .eq('id', cleanAnnouncementId)
          .eq('created_by', seller.id)
          .maybeSingle();

      if (announcementError) throw announcementError;

      if (!announcement) {
        return res.status(404).json({
          success: false,
          error: 'Announcement not found or does not belong to this user'
        });
      }

      // VERIFY ANNOUNCEMENT DETAILS
      if (
        announcement.announcement_type !== 'paid' ||
        announcement.is_admin_announcement !== false ||
        Number(announcement.amount) !== selectedPlan.amount ||
        Number(announcement.package_days) !== selectedPlan.validity
      ) {
        return res.status(400).json({
          success: false,
          error: 'Announcement details do not match selected plan'
        });
      }

      // FIND PAYMENT RECORD
      const { data: announcementPayment, error: announcementPaymentError } =
        await supabase
          .from('announcement_payments')
          .select('*')
          .eq('announcement_id', cleanAnnouncementId)
          .eq('user_id', seller.id)
          .eq('razorpay_order_id', razorpay_order_id)
          .maybeSingle();

      if (announcementPaymentError) throw announcementPaymentError;

      if (!announcementPayment) {
        return res.status(404).json({
          success: false,
          error: 'Announcement payment record not found'
        });
      }

      if (
        Number(announcementPayment.amount) !== selectedPlan.amount
      ) {
        return res.status(400).json({
          success: false,
          error: 'Announcement payment amount mismatch'
        });
      }

      // DUPLICATE CALLBACK / RETRY HANDLING
      if (announcementPayment.payment_status === 'paid') {

        if (
          announcementPayment.razorpay_payment_id !== razorpay_payment_id
        ) {
          return res.status(409).json({
            success: false,
            error: 'A different payment is already recorded for this order'
          });
        }

        // Recover announcement status if previous update was interrupted
        if (announcement.status === 'pending_payment') {
          const { error: recoveryError } = await supabase
            .from('announcements')
            .update({
              status: 'pending_approval'
            })
            .eq('id', cleanAnnouncementId)
            .eq('created_by', seller.id);

          if (recoveryError) throw recoveryError;
        }

        return res.status(200).json({
          success: true,
          message: 'Announcement payment already verified. Waiting for admin approval.',
          announcement_id: cleanAnnouncementId
        });
      }

      if (
        announcementPayment.payment_status !== 'created' ||
        announcement.status !== 'pending_payment'
      ) {
        return res.status(400).json({
          success: false,
          error: 'Announcement payment cannot be processed in its current status'
        });
      }

      // SAVE VERIFIED ANNOUNCEMENT PAYMENT
      const { data: updatedPayment, error: savePaymentError } =
        await supabase
          .from('announcement_payments')
          .update({
            razorpay_payment_id,
            razorpay_signature,
            payment_status: 'paid',
            verified_at: new Date().toISOString()
          })
          .eq('id', announcementPayment.id)
          .eq('payment_status', 'created')
          .select('id')
          .maybeSingle();

      if (savePaymentError) throw savePaymentError;

      if (!updatedPayment) {
        return res.status(409).json({
          success: false,
          error: 'Payment is already being processed'
        });
      }

      // MARK ANNOUNCEMENT AS WAITING FOR ADMIN APPROVAL
      const { data: updatedAnnouncement, error: updateAnnouncementError } =
        await supabase
          .from('announcements')
          .update({
            status: 'pending_approval'
          })
          .eq('id', cleanAnnouncementId)
          .eq('created_by', seller.id)
          .eq('status', 'pending_payment')
          .select('id')
          .maybeSingle();

      if (updateAnnouncementError) throw updateAnnouncementError;

      if (!updatedAnnouncement) {
        throw new Error(
          'Payment verified but announcement status update failed. Retry verification.'
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Announcement payment verified. Waiting for admin approval.',
        announcement_id: cleanAnnouncementId
      });
    }

    // 6. VERIFY LISTING ID IN RAZORPAY ORDER
    if (
      selectedPlan.type === 'listing_promotion' &&
      order.notes?.listing_id !== cleanListingId
    ) {
      return res.status(400).json({
        success: false,
        error: 'Listing ID does not match payment order'
      });
    }

    // 7. CHECK DUPLICATE EXISTING PAYMENT
    const { data: existingPayment, error: duplicateError } =
      await supabase
        .from('payments')
        .select('id, status')
        .eq('payment_id', razorpay_payment_id)
        .maybeSingle();

    if (duplicateError) throw duplicateError;

    if (existingPayment) {
      return res.status(200).json({
        success: existingPayment.status === 'success',
        message: 'Payment already recorded'
      });
    }

    // 8. VERIFY LISTING OWNERSHIP FOR PROMOTION
    let listing = null;

    if (selectedPlan.type === 'listing_promotion') {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          listing_id,
          user_id,
          latitude,
          longitude,
          location_village,
          location_district,
          location_state
        `)
        .eq('listing_id', cleanListingId)
        .eq('user_id', seller.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(403).json({
          success: false,
          error: 'Listing not found or does not belong to this seller'
        });
      }

      listing = data;
    }

    // 9. PREPARE EXISTING PAYMENT RECORD
    const { error: paymentSaveError } = await supabase
      .from('payments')
      .insert({
        phone: cleanPhone,
        listing_id: selectedPlan.type === 'listing_promotion'
          ? cleanListingId
          : (cleanListingId || null),
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        amount: selectedPlan.amount,
        plan: cleanPlan,
        status: 'success'
      });

    if (paymentSaveError) throw paymentSaveError;

    // 10. ACTIVATE EXISTING 14-DAY PREMIUM PROMOTION
    if (selectedPlan.type === 'listing_promotion') {
      const startedAt = new Date();

      const expiresAt = new Date(
        startedAt.getTime() + 14 * 24 * 60 * 60 * 1000
      );

      const { error: promotionError } = await supabase
        .from('listing_promotions')
        .insert({
          listing_id: cleanListingId,
          seller_id: seller.id,
          plan_id: cleanPlan,
          amount: selectedPlan.amount,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          scope: selectedPlan.scope,
          radius_km: selectedPlan.radius || null,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active'
        });

      if (promotionError) throw promotionError;

      const { error: listingUpdateError } = await supabase
        .from('listings')
        .update({
          is_premium: true,
          premium_until: expiresAt.toISOString()
        })
        .eq('id', listing.id)
        .eq('user_id', seller.id);

      if (listingUpdateError) throw listingUpdateError;

      return res.status(200).json({
        success: true,
        message: 'Premium promotion activated for 14 days',
        expires_at: expiresAt.toISOString()
      });
    }

    // 11. EXISTING SUBSCRIPTION LOGIC - PRESERVED
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    if (cleanPlan === 'Premium Listing' || cleanPlan === 'premium') {
      if (cleanListingId) {
        const { error } = await supabase
          .from('listings')
          .update({
            is_premium: true,
            premium_until: endDate.toISOString()
          })
          .eq('listing_id', cleanListingId)
          .eq('user_id', seller.id);

        if (error) throw error;
      }
    }

    if (cleanPlan === 'Carpenter Pro' || cleanPlan === 'carpenter') {
      const { error } = await supabase
        .from('carpenters')
        .update({
          is_pro: true,
          pro_until: endDate.toISOString()
        })
        .eq('phone', cleanPhone);

      if (error) throw error;
    }

    // 12. SAVE EXISTING SUBSCRIPTION
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        phone: cleanPhone,
        plan_type: cleanPlan,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString()
      });

    if (subscriptionError) throw subscriptionError;

    return res.status(200).json({
      success: true,
      message: 'Subscription activated successfully'
    });

  } catch (error) {
    console.error('Payment verification error:', error);

    return res.status(500).json({
      success: false,
      error: 'Payment verification failed. Contact support with your Payment ID.'
    });
  }
}

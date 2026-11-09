
import Razorpay from 'razorpay';

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

  // NEW PREMIUM LISTING PROMOTION PLANS
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
      listing_id
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

    // PROMOTION REQUIRES EXISTING LISTING
    if (
      selectedPlan.type === 'listing_promotion' &&
      !cleanListingId
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your existing Listing ID before purchasing Premium promotion'
      });
    }

    // CREATE RAZORPAY INSTANCE
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    // CREATE ORDER
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
        validity_days: String(selectedPlan.validity || '')
      }
    });

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
      validityDays: selectedPlan.validity || 30
    });

  } catch (error) {
    console.error('Razorpay order creation error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Unable to create payment order'
    });
  }
}

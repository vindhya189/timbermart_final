
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const ALLOWED_ROLES = [
  'FARMER',
  'TIMBER_MERCHANT',
  'HOME_OWNER',
  'SAWMILL_OWNER',
  'CONSTRUCTION_BUILDER',
  'CARPENTER',
  'OLD_WOOD_DEALER',
  'PATTA_TEAK_WOOD_CONTRACTOR',
  'FURNITURE_MANUFACTURER',
  'SAWMILL_WORKER',
];

const ROLE_PERMISSIONS = {
  FARMER: ['PRODUCT', 'REQUIREMENT'],
  TIMBER_MERCHANT: ['PRODUCT', 'REQUIREMENT'],
  HOME_OWNER: ['REQUIREMENT'],
  SAWMILL_OWNER: ['PRODUCT', 'REQUIREMENT', 'SERVICE', 'JOB'],
  CONSTRUCTION_BUILDER: ['PRODUCT', 'REQUIREMENT'],
  CARPENTER: ['REQUIREMENT', 'SERVICE', 'JOB'],
  OLD_WOOD_DEALER: ['PRODUCT', 'REQUIREMENT'],
  PATTA_TEAK_WOOD_CONTRACTOR: ['PRODUCT', 'REQUIREMENT'],
  FURNITURE_MANUFACTURER: ['PRODUCT', 'REQUIREMENT', 'SERVICE'],
  SAWMILL_WORKER: ['SERVICE', 'JOB'],
};

const ALLOWED_TYPES = [
  'PRODUCT',
  'REQUIREMENT',
  'SERVICE',
  'JOB',
];

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const n = Number(value);

  return Number.isFinite(n) && n >= 0 ? n : null;
}

function validCoordinate(value, min, max) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const n = Number(value);

  if (!Number.isFinite(n) || n < min || n > max) {
    return null;
  }

  return n;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  let insertedListingId = null;

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Supabase server environment variables are missing.');
    }

    // 1. Verify login session
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : '';

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Please login first.',
      });
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid login session.',
      });
    }

    const user = authData.user;

    // 2. Get registered user profile
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from('users_profile')
        .select('id, phone, name, role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);

      return res.status(403).json({
        success: false,
        error: 'User profile not found.',
      });
    }

    // Use registered phone number only
    const phone = clean(profile.phone).replace(/\D/g, '');

    if (phone.length < 10 || phone.length > 15) {
      return res.status(400).json({
        success: false,
        error: 'Your registered mobile number is missing or invalid. Please update your profile.',
      });
    }

    const body = req.body || {};

    // 3. Verify selected business role and listing type
    const role = clean(body.role).toUpperCase();
    const listingType = clean(body.listingType).toUpperCase();

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid business role.',
      });
    }

    if (!ALLOWED_TYPES.includes(listingType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid listing type.',
      });
    }

    const allowedTypes = ROLE_PERMISSIONS[role] || [];

    if (!allowedTypes.includes(listingType)) {
      return res.status(403).json({
        success: false,
        error: `${role} is not allowed to create ${listingType} listings.`,
      });
    }

    // 4. Validate basic fields
    const title = clean(body.title);
    const description = clean(body.description);
    const category = clean(body.category);
    const location = clean(body.location);

    if (!title || !description || !category || !location) {
      return res.status(400).json({
        success: false,
        error: 'Please fill all required fields.',
      });
    }

    if (title.length > 150 || description.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Title or description is too long.',
      });
    }

    // 5. Validate photos
    const images = Array.isArray(body.images) ? body.images : [];

    if (images.length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Please upload at least one listing photo.',
      });
    }

    const publicBucketPrefix =
      `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/timber-images/`;

    for (const imageUrl of images) {
      if (
        typeof imageUrl !== 'string' ||
        !imageUrl.startsWith(publicBucketPrefix) ||
        !imageUrl.includes(`/${user.id}/`)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid photo URL. Please upload your photos again.',
        });
      }
    }

    // 6. Validate location coordinates
    const latitude = validCoordinate(body.latitude, -90, 90);
    const longitude = validCoordinate(body.longitude, -180, 180);

    // 7. Validate listing-specific fields
    const quantity = numberOrNull(body.quantity);
    const price = numberOrNull(body.price);
    const budgetMin = numberOrNull(body.budgetMin);
    const budgetMax = numberOrNull(body.budgetMax);

    if (
      ['PRODUCT', 'REQUIREMENT'].includes(listingType) &&
      (!clean(body.species) || quantity === null || quantity <= 0)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Species and valid quantity are required.',
      });
    }

    if (
      listingType === 'PRODUCT' &&
      clean(body.priceType) === 'FIXED' &&
      price === null
    ) {
      return res.status(400).json({
        success: false,
        error: 'Enter a valid selling price.',
      });
    }

    if (
      listingType === 'REQUIREMENT' &&
      clean(body.priceType) === 'FIXED' &&
      budgetMin === null &&
      budgetMax === null
    ) {
      return res.status(400).json({
        success: false,
        error: 'Enter a valid requirement budget.',
      });
    }

    if (
      listingType === 'SERVICE' &&
      !clean(body.experience)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Experience is required for services.',
      });
    }

    if (
      listingType === 'JOB' &&
      !clean(body.salary)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Salary/payment details are required.',
      });
    }

    // 8. Prepare listing row
    const listingId =
      'TM-' +
      Date.now() +
      '-' +
      Math.floor(1000 + Math.random() * 9000);

    const listing = {
      listing_id: listingId,
      title,
      species: clean(body.species) || null,
      quantity: quantity === null ? null : String(quantity),
      price: price === null ? null : String(price),
      unit_price: price,
      unit_type: clean(body.unit) || null,
      total_price: null,

      user_role:
        listingType === 'REQUIREMENT' ? 'buyer' : 'seller',

      product_type:
        category === 'Cut Sizes' ? 'cut_sizes' : 'logs',

      location_village: location,
      location_district: clean(body.district) || null,
      location_state: clean(body.state) || null,

      latitude,
      longitude,

      // Registered phone from users_profile, not browser input
      whatsapp_number: phone,

      user_id: user.id,
      profile_name:
        profile.name || user.email || 'TimberMart Member',

      // Existing admin approval flow remains unchanged
      status: 'pending',
      is_verified: false,
      is_premium: false,

      girth_inch: numberOrNull(body.girth),
      length_ft: numberOrNull(body.length),
      width: numberOrNull(body.width),
      thickness: numberOrNull(body.thickness),

      budget_min: budgetMin,
      budget_max: budgetMax,
      urgency: null,

      requirement_type:
        listingType === 'REQUIREMENT' ? category : null,

      listing_type: listingType,
      business_role: role,
      category,
      description,

      price_type:
        clean(body.priceType) || 'CONTACT_FOR_PRICE',

      quality_grade: clean(body.quality) || null,
      experience_years: numberOrNull(body.experience),
      job_type: clean(body.jobType) || null,
      salary_details: clean(body.salary) || null,
      delivery_location: clean(body.delivery) || null,
    };

    // 9. Insert listing
    const { data: inserted, error: insertError } =
      await supabaseAdmin
        .from('listings')
        .insert(listing)
        .select('*')
        .single();

    if (insertError) {
      console.error('Dynamic listing insert error:', insertError);

      return res.status(500).json({
        success: false,
        error: insertError.message,
        hint: 'Check listings table columns and data types.',
      });
    }

    insertedListingId = inserted.listing_id;

    // 10. Insert all photo URLs into listing_images
    const imageRows = images.map(imageUrl => ({
      listing_id: inserted.listing_id,
      image_url: imageUrl,
    }));

    const { error: imageError } = await supabaseAdmin
      .from('listing_images')
      .insert(imageRows);

    if (imageError) {
      console.error('Listing image insert error:', imageError);

      // Roll back listing if its photo records could not be saved
      await supabaseAdmin
        .from('listings')
        .delete()
        .eq('listing_id', inserted.listing_id)
        .eq('user_id', user.id);

      insertedListingId = null;

      return res.status(500).json({
        success: false,
        error: 'Photos could not be saved. Please try again.',
        hint: imageError.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Listing submitted for admin approval.',
      listing: inserted,
      photosUploaded: images.length,
    });

  } catch (error) {
    console.error('Dynamic listing API error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Server error while submitting listing.',
    });
  }
}

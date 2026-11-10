import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const ALLOWED_AUDIENCES = [
  'all',
  'farmers',
  'merchants',
  'sawmills',
  'carpenters',
];

// =========================
// ADMIN AUTHENTICATION
// =========================

async function checkAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : '';

  if (!token) {
    return { error: 'Login required', status: 401 };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return { error: 'Invalid login session', status: 401 };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from('users_profile')
      .select('role')
      .eq('id', data.user.id)
      .single();

  if (profileError || profile?.role !== 'admin') {
    return { error: 'Admin access denied', status: 403 };
  }

  return { user: data.user };
}

function validAudience(value) {
  return ALLOWED_AUDIENCES.includes(value);
}

function validText(value, maxLength) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

// =========================
// NOTIFY ALL REGISTERED USERS
// =========================

async function notifyAllUsers(announcement) {
  if (!announcement?.id) {
    throw new Error('Announcement ID is missing.');
  }

  const userIds = [];
  const pageSize = 1000;

  // Get all registered users
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('users_profile')
      .select('id')
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const page = data || [];

    userIds.push(
      ...page.map(user => user.id).filter(Boolean)
    );

    if (page.length < pageSize) break;
  }

  let insertedCount = 0;
  const batchSize = 400;

  // Insert notifications in batches
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);

    // Check existing notifications to prevent duplicates
    const { data: existing, error: existingError } =
      await supabaseAdmin
        .from('announcement_notifications')
        .select('user_id')
        .eq('announcement_id', announcement.id)
        .in('user_id', batch);

    if (existingError) throw existingError;

    const alreadySent = new Set(
      (existing || []).map(row => String(row.user_id))
    );

    const rows = batch
      .filter(userId => !alreadySent.has(String(userId)))
      .map(userId => ({
        announcement_id: announcement.id,
        user_id: userId,
        title: announcement.title,
        message: announcement.description,
        notification_type: 'announcement',
        is_read: false,
      }));

    if (!rows.length) continue;

    const { error: insertError } = await supabaseAdmin
      .from('announcement_notifications')
      .insert(rows);

    if (insertError) throw insertError;

    insertedCount += rows.length;
  }

  return {
    sent: insertedCount,
    total: userIds.length,
  };
}

// =========================
// ADMIN API HANDLER
// =========================

export default async function handler(req, res) {
  try {
    const auth = await checkAdmin(req);

    if (auth.error) {
      return res.status(auth.status).json({
        error: auth.error,
      });
    }

    // =========================
    // GET: ADMIN DASHBOARD DATA
    // =========================

    if (req.method === 'GET') {
      const [
        listingResult,
        carpenterResult,
        paymentResult,
        announcementResult,
      ] = await Promise.all([
        supabaseAdmin
          .from('listings')
          .select('*, listing_images(image_url)')
          .order('created_at', { ascending: false })
          .limit(300),

        supabaseAdmin
          .from('carpenters')
          .select('*')
          .limit(300),

        supabaseAdmin
          .from('payments')
          .select('*')
          .eq('status', 'success')
          .order('created_at', { ascending: false })
          .limit(500),

        supabaseAdmin
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300),
      ]);

      const dbError =
        listingResult.error ||
        carpenterResult.error ||
        paymentResult.error ||
        announcementResult.error;

      if (dbError) {
        return res.status(500).json({
          error: dbError.message,
        });
      }

      return res.status(200).json({
        success: true,
        listings: listingResult.data || [],
        carpenters: carpenterResult.data || [],
        payments: paymentResult.data || [],
        announcements: announcementResult.data || [],
      });
    }

    // =========================
    // METHOD VALIDATION
    // =========================

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['GET', 'POST']);

      return res.status(405).json({
        error: 'Method not allowed',
      });
    }

    const { action, id, updates = {} } = req.body || {};

    if (!action) {
      return res.status(400).json({
        error: 'Action is required',
      });
    }

    // =========================
    // UPDATE LISTING
    // =========================

    if (action === 'update_listing') {
      if (!id) {
        return res.status(400).json({
          error: 'Listing ID required',
        });
      }

      const allowed = [
        'status',
        'is_premium',
        'is_verified',
      ];

      const safeUpdates = {};

      for (const key of allowed) {
        if (
          Object.prototype.hasOwnProperty.call(updates, key)
        ) {
          safeUpdates[key] = updates[key];
        }
      }

      if (!Object.keys(safeUpdates).length) {
        return res.status(400).json({
          error: 'No valid listing updates supplied',
        });
      }

      const { data, error } = await supabaseAdmin
        .from('listings')
        .update(safeUpdates)
        .eq('listing_id', id)
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          error: 'Listing not found.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Listing updated successfully',
        record: data,
      });
    }

    // =========================
    // DELETE LISTING
    // =========================

    if (action === 'delete_listing') {
      if (!id) {
        return res.status(400).json({
          error: 'Listing ID required',
        });
      }

      const { error: imageError } = await supabaseAdmin
        .from('listing_images')
        .delete()
        .eq('listing_id', id);

      if (imageError) throw imageError;

      const { data, error } = await supabaseAdmin
        .from('listings')
        .delete()
        .eq('listing_id', id)
        .select('listing_id')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          error: 'Listing not found.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Listing deleted',
      });
    }

    // =========================
    // UPDATE CARPENTER
    // =========================

    if (action === 'update_carpenter') {
      if (!id) {
        return res.status(400).json({
          error: 'Carpenter ID required',
        });
      }

      const allowed = ['status', 'is_pro'];
      const safeUpdates = {};

      for (const key of allowed) {
        if (
          Object.prototype.hasOwnProperty.call(updates, key)
        ) {
          safeUpdates[key] = updates[key];
        }
      }

      if (!Object.keys(safeUpdates).length) {
        return res.status(400).json({
          error: 'No valid carpenter updates supplied',
        });
      }

      const { data, error } = await supabaseAdmin
        .from('carpenters')
        .update(safeUpdates)
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          error: 'Carpenter not found.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Carpenter updated successfully',
        record: data,
      });
    }

    // =========================
    // DELETE CARPENTER
    // =========================

    if (action === 'delete_carpenter') {
      if (!id) {
        return res.status(400).json({
          error: 'Carpenter ID required',
        });
      }

      const { data, error } = await supabaseAdmin
        .from('carpenters')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          error: 'Carpenter not found.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Carpenter deleted',
      });
    }

    // =========================
    // CREATE FREE OFFICIAL ANNOUNCEMENT
    // ADMIN ONLY
    // =========================

    if (action === 'create_admin_announcement') {
      const {
        title,
        description,
        image_url,
        contact_number,
        website_url,
        target_audience = 'all',
        expires_at,
      } = req.body || {};

      if (!validText(title, 150)) {
        return res.status(400).json({
          error: 'Title is required (maximum 150 characters)',
        });
      }

      if (!validText(description, 5000)) {
        return res.status(400).json({
          error: 'Description is required (maximum 5000 characters)',
        });
      }

      if (!validAudience(target_audience)) {
        return res.status(400).json({
          error: 'Invalid target audience',
        });
      }

      if (
        image_url &&
        !/^https:\/\/.+/i.test(image_url)
      ) {
        return res.status(400).json({
          error: 'Image URL must use HTTPS',
        });
      }

      if (
        website_url &&
        !/^https:\/\/.+/i.test(website_url)
      ) {
        return res.status(400).json({
          error: 'Website URL must use HTTPS',
        });
      }

      const now = new Date();
      let expiry = null;

      if (expires_at) {
        expiry = new Date(expires_at);

        if (
          Number.isNaN(expiry.getTime()) ||
          expiry <= now
        ) {
          return res.status(400).json({
            error: 'Expiry date must be in the future',
          });
        }
      }

      const announcementData = {
        created_by: auth.user.id,
        title: title.trim(),
        description: description.trim(),
        image_url: image_url || null,
        contact_number: contact_number || null,
        website_url: website_url || null,
        announcement_type: 'admin',
        is_admin_announcement: true,
        target_audience,
        package_days: null,
        amount: 0,
        status: 'active',
        starts_at: now.toISOString(),
        expires_at: expiry
          ? expiry.toISOString()
          : null,
      };

      const { data, error } = await supabaseAdmin
        .from('announcements')
        .insert(announcementData)
        .select('*')
        .single();

      if (error) throw error;

      // Notify ALL registered users after publishing
      const notificationResult = await notifyAllUsers(data);

      return res.status(201).json({
        success: true,
        message: `Official announcement published. Notifications sent to ${notificationResult.total} users.`,
        notifications_sent: notificationResult.sent,
        total_users: notificationResult.total,
        record: data,
      });
    }

    // =========================
    // APPROVE PAID ANNOUNCEMENT
    // =========================

    if (action === 'approve_announcement') {
      if (!id) {
        return res.status(400).json({
          error: 'Announcement ID required',
        });
      }

      const { data: announcement, error: fetchError } =
        await supabaseAdmin
          .from('announcements')
          .select('*')
          .eq('id', id)
          .maybeSingle();

      if (fetchError) throw fetchError;

      if (!announcement) {
        return res.status(404).json({
          error: 'Announcement not found',
        });
      }

      if (announcement.is_admin_announcement) {
        return res.status(400).json({
          error: 'Official announcements do not need approval',
        });
      }

      if (announcement.status !== 'pending_approval') {
        return res.status(400).json({
          error: 'Announcement is not awaiting approval',
        });
      }

      const expectedAmount =
        announcement.package_days === 7
          ? 149
          : announcement.package_days === 14
            ? 249
            : null;

      if (
        !expectedAmount ||
        Number(announcement.amount) !== expectedAmount
      ) {
        return res.status(400).json({
          error: 'Invalid promotion package or amount',
        });
      }

      const { data: payment, error: paymentError } =
        await supabaseAdmin
          .from('announcement_payments')
          .select('*')
          .eq('announcement_id', id)
          .eq('payment_status', 'paid')
          .not('verified_at', 'is', null)
          .maybeSingle();

      if (paymentError) throw paymentError;

      if (!payment) {
        return res.status(400).json({
          error: 'Verified paid payment not found. Cannot approve.',
        });
      }

      if (Number(payment.amount) !== expectedAmount) {
        return res.status(400).json({
          error: 'Payment amount does not match package amount.',
        });
      }

      const start = new Date();
      const expiry = new Date(start);

      expiry.setDate(
        expiry.getDate() + announcement.package_days
      );

      const { data, error } = await supabaseAdmin
        .from('announcements')
        .update({
          status: 'active',
          starts_at: start.toISOString(),
          expires_at: expiry.toISOString(),
          rejection_reason: null,
          updated_at: start.toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending_approval')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(409).json({
          error: 'Announcement status changed. Refresh and try again.',
        });
      }

      // Notify ALL registered users after approval
      const notificationResult = await notifyAllUsers(data);

      return res.status(200).json({
        success: true,
        message: `Paid announcement approved and published. Notifications sent to ${notificationResult.total} users.`,
        notifications_sent: notificationResult.sent,
        total_users: notificationResult.total,
        record: data,
      });
    }

    // =========================
    // REJECT PAID ANNOUNCEMENT
    // =========================

    if (action === 'reject_announcement') {
      if (!id) {
        return res.status(400).json({
          error: 'Announcement ID required',
        });
      }

      const reason = req.body.reason;

      if (!validText(reason, 1000)) {
        return res.status(400).json({
          error: 'Please provide a rejection reason',
        });
      }

      const { data: announcement, error: fetchError } =
        await supabaseAdmin
          .from('announcements')
          .select('id, is_admin_announcement, status')
          .eq('id', id)
          .maybeSingle();

      if (fetchError) throw fetchError;

      if (!announcement) {
        return res.status(404).json({
          error: 'Announcement not found',
        });
      }

      if (announcement.is_admin_announcement) {
        return res.status(400).json({
          error: 'Official announcement cannot be rejected here',
        });
      }

      if (announcement.status !== 'pending_approval') {
        return res.status(400).json({
          error: 'Only pending announcements can be rejected',
        });
      }

      const { data, error } = await supabaseAdmin
        .from('announcements')
        .update({
          status: 'rejected',
          rejection_reason: reason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending_approval')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(409).json({
          error: 'Announcement status changed. Refresh and try again.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Announcement rejected',
        record: data,
      });
    }

    // =========================
    // DELETE ANNOUNCEMENT
    // ADMIN ONLY
    // =========================

    if (action === 'delete_announcement') {
      if (!id) {
        return res.status(400).json({
          error: 'Announcement ID required',
        });
      }

      // First get announcement and image URL
      const { data: announcement, error: fetchError } =
        await supabaseAdmin
          .from('announcements')
          .select('id, image_url')
          .eq('id', id)
          .maybeSingle();

      if (fetchError) throw fetchError;

      if (!announcement) {
        return res.status(404).json({
          error: 'Announcement not found',
        });
      }

      // Delete linked delivery logs
      const { error: logError } = await supabaseAdmin
        .from('announcement_delivery_logs')
        .delete()
        .eq('announcement_id', id);

      if (logError) throw logError;

      // Delete linked notifications
      const { error: notificationError } = await supabaseAdmin
        .from('announcement_notifications')
        .delete()
        .eq('announcement_id', id);

      if (notificationError) throw notificationError;

      // Delete linked payment rows
      const { error: paymentError } = await supabaseAdmin
        .from('announcement_payments')
        .delete()
        .eq('announcement_id', id);

      if (paymentError) throw paymentError;

      // Delete announcement record
      const { data, error } = await supabaseAdmin
        .from('announcements')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          error: 'Announcement not found',
        });
      }

      // Delete associated image from Storage
      if (announcement.image_url) {
        const marker =
          '/storage/v1/object/public/announcements/';

        const markerIndex =
          announcement.image_url.indexOf(marker);

        if (markerIndex !== -1) {
          try {
            const encodedPath =
              announcement.image_url.slice(
                markerIndex + marker.length
              );

            const imagePath = decodeURIComponent(
              encodedPath.split('?')[0]
            );

            if (
              imagePath &&
              !imagePath.includes('..')
            ) {
              const { error: storageError } =
                await supabaseAdmin
                  .storage
                  .from('announcements')
                  .remove([imagePath]);

              if (storageError) {
                console.error(
                  'Announcement image cleanup failed:',
                  storageError.message
                );
              }
            }
          } catch (imageError) {
            console.error(
              'Announcement image cleanup error:',
              imageError
            );
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Announcement deleted successfully',
      });
    }

    // =========================
    // UNKNOWN ACTION
    // =========================

    return res.status(400).json({
      error: 'Unknown admin action',
    });

  } catch (error) {
    console.error('Admin API error:', error);

    return res.status(500).json({
      error: error.message || 'Admin API failed',
    });
  }
}
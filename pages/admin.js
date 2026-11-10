
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const tabs = [
  'Pending',
  'Approved',
  'Rejected',
  'All',
  'Carpenters',
  'Payments',
  'Announcements'
];

export default function Admin() {
  const router = useRouter();

  const [listings, setListings] = useState([]);
  const [carpenters, setCarpenters] = useState([]);
  const [payments, setPayments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

const [announcementForm, setAnnouncementForm] = useState({
  title: '',
  description: '',
  image_url: '',
  contact_number: '',
  website_url: '',
  target_audience: 'all',
  expires_at: ''
});

const [announcementSaving, setAnnouncementSaving] = useState(false);
const [rejectingId, setRejectingId] = useState('');
  const [tab, setTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [notice, setNotice] = useState(null);
  const [apiError, setApiError] = useState('');

  const apiRequest = useCallback(async (method = 'GET', body = null) => {
    const { data, error } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (error || !token) {
      throw new Error('Your login session expired. Please login again.');
    }

    const response = await fetch('/api/admin', {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const raw = await response.text();
    let result;

    try {
      result = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(`Admin API returned invalid response (${response.status}).`);
    }

    if (!response.ok) {
      throw new Error(result.error || `Request failed (${response.status})`);
    }

    return result;
  }, []);

  const loadAll = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setApiError('');

    try {
      const result = await apiRequest('GET');

      setListings(Array.isArray(result.listings) ? result.listings : []);
      setCarpenters(Array.isArray(result.carpenters) ? result.carpenters : []);
      setPayments(Array.isArray(result.payments) ? result.payments : []);
      setAnnouncements(
  Array.isArray(result.announcements) ? result.announcements : []
);
    } catch (error) {
      setApiError(error.message || 'Unable to load admin data.');

      if (
        error.message.includes('session expired') ||
        error.message.includes('Login required') ||
        error.message.includes('Invalid login session') ||
        error.message.includes('Admin access denied')
      ) {
        await supabase.auth.signOut();
        router.replace('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [apiRequest, router]);

  useEffect(() => {
    let active = true;

    async function start() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !data?.session) {
        router.replace('/login');
        return;
      }

      await loadAll(true);
    }

    start();

    return () => {
      active = false;
    };
  }, [loadAll, router]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const runAction = async (action, id, updates = {}, successText = 'Updated successfully') => {
    if (actionId) return;

    setActionId(String(id));
    setNotice(null);
    setApiError('');

    try {
      const result = await apiRequest('POST', { action, id, updates });

      if (action === 'update_listing' && result.record) {
        setListings(current =>
          current.map(item =>
            String(item.listing_id) === String(id)
              ? { ...item, ...result.record }
              : item
          )
        );
      }

      if (action === 'update_carpenter' && result.record) {
        setCarpenters(current =>
          current.map(item =>
            String(item.id) === String(id)
              ? { ...item, ...result.record }
              : item
          )
        );
      }

      if (action === 'delete_listing') {
        setListings(current =>
          current.filter(item => String(item.listing_id) !== String(id))
        );
      }

      if (action === 'delete_carpenter') {
        setCarpenters(current =>
          current.filter(item => String(item.id) !== String(id))
        );
      }

      setNotice({ type: 'success', text: result.message || successText });

      // Reload from database to confirm saved status and update counts.
      await loadAll(false);
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.message || 'Action failed',
      });
    } finally {
      setActionId('');
    }
  };
  
const [imageUploading, setImageUploading] = useState(false);

const uploadAnnouncementImage = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    setNotice({
      type: 'error',
      text: 'JPG, PNG or WEBP images only.'
    });
    e.target.value = '';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setNotice({
      type: 'error',
      text: 'Image must be smaller than 5 MB.'
    });
    e.target.value = '';
    return;
  }

  setImageUploading(true);

  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData?.session) {
      throw new Error('Please login again.');
    }

    const extension = file.name.split('.').pop().toLowerCase();
    const filePath = `official/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('announcements')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('announcements')
      .getPublicUrl(filePath);

    setAnnouncementForm(current => ({
      ...current,
      image_url: data.publicUrl
    }));

    setNotice({
      type: 'success',
      text: 'Announcement image uploaded successfully.'
    });
  } catch (error) {
    setNotice({
      type: 'error',
      text: error.message || 'Image upload failed.'
    });
  } finally {
    setImageUploading(false);
  }
};

  const createOfficialAnnouncement = async (e) => {
  e.preventDefault();

  if (announcementSaving) return;

  setAnnouncementSaving(true);
  setNotice(null);

  try {
    const result = await apiRequest('POST', {
      action: 'create_admin_announcement',
      ...announcementForm,
      expires_at: announcementForm.expires_at
        ? new Date(announcementForm.expires_at).toISOString()
        : null
    });

    setNotice({
      type: 'success',
      text: result.message || 'Official announcement published.'
    });

    setAnnouncementForm({
      title: '',
      description: '',
      image_url: '',
      contact_number: '',
      website_url: '',
      target_audience: 'all',
      expires_at: ''
    });

    await loadAll(false);
  } catch (error) {
    setNotice({
      type: 'error',
      text: error.message || 'Announcement creation failed.'
    });
  } finally {
    setAnnouncementSaving(false);
  }
};

const approveAnnouncement = async (id) => {
  if (!window.confirm('Approve and publish this paid promotion?')) return;

  await runAction(
    'approve_announcement',
    id,
    {},
    'Promotion approved and published.'
  );
};

const rejectAnnouncement = async (id) => {
  const reason = window.prompt('Enter rejection reason:');

  if (!reason || !reason.trim()) return;

  if (actionId) return;

  setActionId(String(id));
  setNotice(null);

  try {
    const result = await apiRequest('POST', {
      action: 'reject_announcement',
      id,
      reason: reason.trim()
    });

    setNotice({
      type: 'success',
      text: result.message || 'Promotion rejected.'
    });

    await loadAll(false);
  } catch (error) {
    setNotice({
      type: 'error',
      text: error.message || 'Rejection failed.'
    });
  } finally {
    setActionId('');
  }
};


  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const counts = useMemo(() => ({
    pending: listings.filter(x => x.status === 'pending').length,
    approved: listings.filter(x => x.status === 'approved').length,
    rejected: listings.filter(x => x.status === 'rejected').length,
    all: listings.length,
    carpenters: carpenters.length,
    payments: payments.length,
    revenue: payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
  }), [listings, carpenters, payments]);

  const filteredListings = useMemo(() => {
    let result = listings;

    if (['Pending', 'Approved', 'Rejected'].includes(tab)) {
      result = result.filter(
        item => item.status === tab.toLowerCase()
      );
    }

    const q = search.trim().toLowerCase();

    if (q) {
      result = result.filter(item =>
        [
          item.title,
          item.species,
          item.location_village,
          item.whatsapp_number,
          item.listing_id,
          item.digipin,
        ].join(' ').toLowerCase().includes(q)
      );
    }

    return result;
  }, [listings, tab, search]);

  const filteredCarpenters = useMemo(() => {
    const q = search.trim().toLowerCase();

    return carpenters.filter(item =>
      [
        item.name,
        item.village,
        item.district,
        item.phone,
        item.skills,
      ].join(' ').toLowerCase().includes(q)
    );
  }, [carpenters, search]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
        <h2 className="font-bold mt-4">Loading TimberMart Admin</h2>
        <p className="text-slate-400 text-sm mt-1">Verifying your admin session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              TimberMart <span className="text-emerald-400">Admin</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Marketplace control centre</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => loadAll(true)}
              disabled={loading || !!actionId}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              ↻ Refresh
            </button>
            <button
              onClick={logout}
              className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {apiError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>Loading error:</strong> {apiError}
          </div>
        )}

        {notice && (
          <div className={`mb-4 rounded-xl border p-4 text-sm font-semibold ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {notice.type === 'success' ? '✓ ' : '⚠ '}
            {notice.text}
          </div>
        )}

        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          <Stat title="Pending" value={counts.pending} color="amber" onClick={() => setTab('Pending')} />
          <Stat title="Approved" value={counts.approved} color="emerald" onClick={() => setTab('Approved')} />
          <Stat title="Rejected" value={counts.rejected} color="rose" onClick={() => setTab('Rejected')} />
          <Stat title="All Listings" value={counts.all} color="blue" onClick={() => setTab('All')} />
          <Stat title="Carpenters" value={counts.carpenters} color="violet" onClick={() => setTab('Carpenters')} />
          <Stat title="Revenue" value={`₹${counts.revenue.toLocaleString('en-IN')}`} color="cyan" onClick={() => router.push('/admin-revenue')} />
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 mb-5">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map(item => (
                <button
                  key={item}
                  onClick={() => {
                    setTab(item);
                    setSearch('');
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                    tab === item
                      ? 'bg-slate-950 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item}
                  {item === 'Pending' ? ` (${counts.pending})` :
                   item === 'Approved' ? ` (${counts.approved})` :
                   item === 'Rejected' ? ` (${counts.rejected})` :
                   item === 'All' ? ` (${counts.all})` :
                   item === 'Carpenters' ? ` (${counts.carpenters})` :
                   item === 'Payments' ? ` (${counts.payments})` :
                   ` (${announcements.length})`}
                </button>
              ))}
            </div>

            <Link
              href="/admin-revenue"
              className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
            >
              Revenue Report →
            </Link>
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${tab.toLowerCase()}...`}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </section>

        {['Pending', 'Approved', 'Rejected', 'All'].includes(tab) && (
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-black text-lg">{tab} Listings</h2>
              <span className="text-sm text-slate-500">{filteredListings.length} records</span>
            </div>

            {filteredListings.length === 0 ? (
              <Empty message={`No ${tab.toLowerCase()} listings found.`} />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredListings.map(item => (
                  <article key={item.listing_id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 flex gap-4">
                      <img
                        src={item.listing_images?.[0]?.image_url || '/placeholder.jpg'}
                        alt={item.title || 'Timber listing'}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover bg-slate-100 shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <Badge color={item.status === 'approved' ? 'green' : item.status === 'rejected' ? 'red' : 'amber'}>
                            {item.status || 'unknown'}
                          </Badge>
                          <Badge color="blue">{item.user_role === 'buyer' ? 'BUYING' : 'SELLING'}</Badge>
                          {item.is_premium && <Badge color="amber">PREMIUM</Badge>}
                          {item.is_verified && <Badge color="green">VERIFIED</Badge>}
                        </div>

                        <h3 className="font-extrabold text-base leading-snug break-words">
                          {item.title || 'Untitled listing'}
                        </h3>

                        <p className="text-sm text-slate-500 mt-1">
                          {item.species || 'Species not specified'}
                        </p>

                        <p className="text-sm text-slate-600 mt-1 break-words">
                          📍 {item.location_village || 'Location unavailable'}
                        </p>

                        <p className="text-sm text-slate-600 mt-1">
                          📞 {item.whatsapp_number || 'No phone number'}
                        </p>

                        <p className="font-bold mt-2">
                          ₹{item.unit_price ?? '-'} / {item.unit_type || 'unit'}
                          {item.cft ? ` • ${item.cft} CFT` : ''}
                        </p>

                        {item.total_price && (
                          <p className="text-sm text-slate-500">
                            Total: ₹{Number(item.total_price).toLocaleString('en-IN')}
                          </p>
                        )}

                        <p className="text-xs text-slate-400 mt-2 break-all">
                          ID: {item.listing_id}
                          {item.created_at ? ` • ${new Date(item.created_at).toLocaleDateString('en-IN')}` : ''}
                        </p>

                        {item.digipin && (
                          <p className="text-xs text-blue-600 mt-1">DIGIPIN: {item.digipin}</p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50 p-3 flex flex-wrap gap-2">
                      {item.status !== 'approved' && (
                        <ActionButton
                          disabled={!!actionId}
                          busy={actionId === String(item.listing_id)}
                          color="green"
                          onClick={() => runAction(
                            'update_listing',
                            item.listing_id,
                            { status: 'approved', is_verified: true },
                            'Listing approved and marked verified.'
                          )}
                        >
                          ✓ Approve
                        </ActionButton>
                      )}

                      {item.status !== 'rejected' && (
                        <ActionButton
                          disabled={!!actionId}
                          busy={actionId === String(item.listing_id)}
                          color="orange"
                          onClick={() => runAction(
                            'update_listing',
                            item.listing_id,
                            { status: 'rejected' },
                            'Listing rejected.'
                          )}
                        >
                          ✕ Reject
                        </ActionButton>
                      )}

                      <ActionButton
                        disabled={!!actionId}
                        color="amber"
                        onClick={() => runAction(
                          'update_listing',
                          item.listing_id,
                          { is_premium: !item.is_premium },
                          item.is_premium ? 'Premium removed.' : 'Listing marked premium.'
                        )}
                      >
                        {item.is_premium ? '★ Remove Premium' : '☆ Make Premium'}
                      </ActionButton>

                      <ActionButton
                        disabled={!!actionId}
                        color="blue"
                        onClick={() => runAction(
                          'update_listing',
                          item.listing_id,
                          { is_verified: !item.is_verified },
                          item.is_verified ? 'Verification removed.' : 'Listing verified.'
                        )}
                      >
                        {item.is_verified ? 'Unverify' : '✓ Verify'}
                      </ActionButton>

                      <Link
                        href={`/p/${item.listing_id}`}
                        target="_blank"
                        className="rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-bold"
                      >
                        View
                      </Link>

                      <ActionButton
                        disabled={!!actionId}
                        color="red"
                        onClick={() => {
                          if (window.confirm('Permanently delete this listing and its images?')) {
                            runAction('delete_listing', item.listing_id, {}, 'Listing deleted.');
                          }
                        }}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'Carpenters' && (
          <section>
            <h2 className="font-black text-lg mb-3">Carpenter Management</h2>

            {filteredCarpenters.length === 0 ? (
              <Empty message="No carpenters found." />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredCarpenters.map(item => (
                  <article key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center text-3xl">🪚</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex gap-2 flex-wrap">
                          <Badge color={item.status === 'approved' ? 'green' : 'amber'}>
                            {item.status || 'pending'}
                          </Badge>
                          {item.is_pro && <Badge color="amber">PRO</Badge>}
                        </div>
                        <h3 className="font-extrabold mt-2">{item.name || 'Carpenter'}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          📍 {item.village || '-'}{item.district ? `, ${item.district}` : ''}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">📞 {item.phone || '-'}</p>
                        <p className="text-sm text-slate-600 mt-1">
                          Skills: {Array.isArray(item.skills) ? item.skills.join(', ') : item.skills || '-'}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          Experience: {item.experience_years || 0} years
                          {item.daily_charge ? ` • ₹${item.daily_charge}/day` : ''}
                        </p>
                        {item.digipin && <p className="text-xs text-blue-600 mt-1">DIGIPIN: {item.digipin}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4 border-t pt-3">
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-xs font-bold"
                        >
                          Call
                        </a>
                      )}

                      <ActionButton
                        disabled={!!actionId}
                        color="green"
                        onClick={() => runAction(
                          'update_carpenter',
                          item.id,
                          { status: item.status === 'approved' ? 'pending' : 'approved' },
                          item.status === 'approved' ? 'Carpenter hidden.' : 'Carpenter approved.'
                        )}
                      >
                        {item.status === 'approved' ? 'Hide' : '✓ Approve'}
                      </ActionButton>

                      <ActionButton
                        disabled={!!actionId}
                        color="amber"
                        onClick={() => runAction(
                          'update_carpenter',
                          item.id,
                          { is_pro: !item.is_pro },
                          item.is_pro ? 'Pro status removed.' : 'Carpenter upgraded to Pro.'
                        )}
                      >
                        {item.is_pro ? '★ Remove Pro' : 'Make Pro'}
                      </ActionButton>

                      <ActionButton
                        disabled={!!actionId}
                        color="red"
                        onClick={() => {
                          if (window.confirm('Delete this carpenter permanently?')) {
                            runAction('delete_carpenter', item.id, {}, 'Carpenter deleted.');
                          }
                        }}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'Payments' && (
          <section>
            <h2 className="font-black text-lg mb-3">Successful Payments</h2>

            {payments.length === 0 ? (
              <Empty message="No successful payments found." />
            ) : (
              <div className="bg-white rounded-2xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-3 text-left">Payment</th>
                      <th className="p-3 text-left">Amount</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, index) => (
                      <tr key={payment.id || index} className="border-t">
                        <td className="p-3">{payment.id || `#${index + 1}`}</td>
                        <td className="p-3 font-bold">₹{payment.amount || 0}</td>
                        <td className="p-3"><Badge color="green">{payment.status}</Badge></td>
                        <td className="p-3">
                          {payment.created_at
                            ? new Date(payment.created_at).toLocaleDateString('en-IN')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        )}

{tab === 'Announcements' && (
  <section className="space-y-6">

    {/* ADMIN FREE ANNOUNCEMENT */}
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black">
          Create Official Announcement
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Admin-only free announcement. Users will not see a free package option.
        </p>
      </div>

      <form onSubmit={createOfficialAnnouncement} className="space-y-3">

        <input
          required
          maxLength={150}
          value={announcementForm.title}
          onChange={e => setAnnouncementForm({
            ...announcementForm,
            title: e.target.value
          })}
          placeholder="Announcement title"
          className="w-full border rounded-xl p-3"
        />

        <textarea
          required
          maxLength={5000}
          rows={4}
          value={announcementForm.description}
          onChange={e => setAnnouncementForm({
            ...announcementForm,
            description: e.target.value
          })}
          placeholder="Announcement description"
          className="w-full border rounded-xl p-3"
        />

        
<div>
  <label className="block text-sm font-bold mb-2">
    Upload Announcement Image
  </label>

  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={uploadAnnouncementImage}
    disabled={imageUploading || announcementSaving}
    className="w-full border rounded-xl p-3 bg-slate-50"
  />

  <p className="text-xs text-slate-500 mt-1">
    JPG, PNG, WEBP • Maximum 5 MB
  </p>

  {imageUploading && (
    <p className="text-sm text-blue-600 mt-2">
      Uploading image...
    </p>
  )}

  {announcementForm.image_url && (
    <div className="mt-3">
      <img
        src={announcementForm.image_url}
        alt="Announcement preview"
        className="w-full max-w-sm h-44 object-cover rounded-xl border"
      />

      <button
        type="button"
        onClick={() => setAnnouncementForm(current => ({
          ...current,
          image_url: ''
        }))}
        className="mt-2 text-sm text-red-600 font-bold"
      >
        Remove selected image
      </button>
    </div>
  )}
</div>


        <input
          value={announcementForm.contact_number}
          onChange={e => setAnnouncementForm({
            ...announcementForm,
            contact_number: e.target.value
          })}
          placeholder="Contact number (optional)"
          className="w-full border rounded-xl p-3"
        />

        <input
          type="url"
          value={announcementForm.website_url}
          onChange={e => setAnnouncementForm({
            ...announcementForm,
            website_url: e.target.value
          })}
          placeholder="Website URL (HTTPS, optional)"
          className="w-full border rounded-xl p-3"
        />

        <div>
          <label className="block text-sm font-bold mb-2">
            Target Audience
          </label>
          <select
            value={announcementForm.target_audience}
            onChange={e => setAnnouncementForm({
              ...announcementForm,
              target_audience: e.target.value
            })}
            className="w-full border rounded-xl p-3"
          >
            <option value="all">All Users</option>
            <option value="farmers">Farmers</option>
            <option value="merchants">Merchants</option>
            <option value="sawmills">Sawmills</option>
            <option value="carpenters">Carpenters</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">
            Expiry Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={announcementForm.expires_at}
            onChange={e => setAnnouncementForm({
              ...announcementForm,
              expires_at: e.target.value
            })}
            className="w-full border rounded-xl p-3"
          />
        </div>

        <button
          type="submit"
          disabled={announcementSaving || imageUploading}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-3 disabled:opacity-50"
        >
          {announcementSaving
            ? 'Publishing...'
            : 'Publish Official Announcement'}
        </button>
      </form>
    </div>

    {/* ANNOUNCEMENT LIST */}
    <div>
      <h2 className="text-xl font-black mb-3">
        Announcement Management
      </h2>

      {announcements.length === 0 ? (
        <Empty message="No announcements found." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {announcements.map(item => (
            <article
              key={item.id}
              className="bg-white border rounded-2xl p-4 shadow-sm"
            >
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge color={
                  item.status === 'active' ? 'green' :
                  item.status === 'rejected' ? 'red' : 'amber'
                }>
                  {item.status}
                </Badge>

                <Badge color="blue">
                  {item.is_admin_announcement
                    ? 'OFFICIAL'
                    : 'PAID PROMOTION'}
                </Badge>
              </div>

              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-44 object-cover rounded-xl mb-3"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}

              <h3 className="font-black text-lg">
                {item.title}
              </h3>

              <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                {item.description}
              </p>

              <div className="text-sm text-slate-500 mt-3 space-y-1">
                <p>Audience: {item.target_audience}</p>
                <p>Amount: ₹{item.amount}</p>
                {item.package_days && (
                  <p>Package: {item.package_days} days</p>
                )}
                {item.expires_at && (
                  <p>
                    Expires: {new Date(item.expires_at).toLocaleString('en-IN')}
                  </p>
                )}
                {item.rejection_reason && (
                  <p className="text-red-600">
                    Reason: {item.rejection_reason}
                  </p>
                )}
              </div>

{item.status === 'pending_approval' &&
  !item.is_admin_announcement && (
    <div className="flex flex-wrap gap-2 mt-4">
      <ActionButton
        color="green"
        disabled={!!actionId}
        busy={actionId === String(item.id)}
        onClick={() => approveAnnouncement(item.id)}
      >
        Approve & Publish
      </ActionButton>

      <ActionButton
        color="red"
        disabled={!!actionId}
        busy={actionId === String(item.id)}
        onClick={() => rejectAnnouncement(item.id)}
      >
        Reject
      </ActionButton>
    </div>
  )}

<div className="mt-4 border-t pt-3">
  <ActionButton
    color="red"
    disabled={!!actionId}
    busy={actionId === String(item.id)}
    onClick={() => {
      if (window.confirm(`Delete "${item.title}" permanently?`)) {
        runAction(
          'delete_announcement',
          item.id,
          {},
          'Announcement deleted successfully.'
        );
      }
    }}
  >
    🗑 Delete Announcement
  </ActionButton>
</div>


              
                
            </article>
          ))}
        </div>
      )}
    </div>
  </section>
)}


        <footer className="mt-8 flex flex-wrap gap-3 justify-between text-sm text-slate-500">
          <span>TimberMart Admin Dashboard</span>
          <Link href="/" className="font-bold text-emerald-700">Visit Marketplace →</Link>
        </footer>
      </div>
    </main>
  );
}

function Stat({ title, value, color, onClick }) {
  const colors = {
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    rose: 'bg-rose-50 border-rose-200 text-rose-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800',
  };

  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 hover:shadow-md transition ${colors[color]}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">{title}</p>
      <p className="text-2xl font-black mt-2 break-words">{value}</p>
    </button>
  );
}

function Badge({ children, color = 'blue' }) {
  const colors = {
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${colors[color]}`}>
      {children}
    </span>
  );
}

function ActionButton({ children, onClick, disabled, busy, color = 'blue' }) {
  const colors = {
    green: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    orange: 'bg-orange-500 hover:bg-orange-600 text-white',
    amber: 'bg-amber-100 hover:bg-amber-200 text-amber-900',
    blue: 'bg-blue-100 hover:bg-blue-200 text-blue-900',
    red: 'bg-red-100 hover:bg-red-200 text-red-800',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-2 text-xs font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed ${colors[color]}`}
    >
      {busy ? 'Saving...' : children}
    </button>
  );
}

function Empty({ message }) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
      <div className="text-3xl mb-2">📭</div>
      <p className="font-bold text-slate-700">{message}</p>
    </div>
  );
}

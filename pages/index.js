
// FILE: pages/index.js
// TIMBERMART HOME - SUPABASE FAVORITES
// Existing listings, filters, carpenter, premium and login flow preserved.

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/router';
import TreeLoader from '../components/TreeLoader';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const getTimeAgo = (date) => {
  if (!date) return '';

  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
};

const formatDateTime = (date) => {
  if (!date) return '';

  const d = new Date(date);

  return `${d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  })} • ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
};

export default function Home() {
  const router = useRouter();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [locSearch, setLocSearch] = useState('');
  const [locFilter, setLocFilter] = useState('All Locations');
  const [districtFilter, setDistrictFilter] = useState('All Districts');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [sortBy, setSortBy] = useState('Latest');

  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const [tab, setTab] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false);

  // Favorites now come from Supabase
  const [favs, setFavs] = useState([]);
  const [favoriteLoading, setFavoriteLoading] = useState(null);

  // ==========================================
  // LOAD APPROVED LISTINGS
  // ==========================================

  const load = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
  .from('listings')
  .select('*, listing_images(image_url)')
  .eq('status', 'approved')
  .gt('expires_at', new Date().toISOString())
  .order('created_at', { ascending: false })
  .limit(200);

      if (error) throw error;

      setListings(data || []);
    } catch (error) {
      console.error('Listings loading error:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // MIGRATE OLD LOCAL FAVORITES TO SUPABASE
  // ==========================================

  const migrateOldFavorites = async (userId) => {
    try {
      const oldSaved = JSON.parse(
        localStorage.getItem('timber_saved') || '[]'
      );

      if (!Array.isArray(oldSaved) || oldSaved.length === 0) {
        return;
      }

      const rows = oldSaved
        .filter(item => item && item.listing_id)
        .map(item => ({
          user_id: userId,
          listing_id: String(item.listing_id)
        }));

      if (rows.length === 0) return;

      const { error } = await supabase
        .from('favourites')
        .upsert(rows, {
          onConflict: 'user_id,listing_id',
          ignoreDuplicates: true
        });

      if (error) {
        console.error('Old favorites migration error:', error);
        return;
      }

      // Remove local copy only after successful Supabase migration
      localStorage.removeItem('timber_saved');

    } catch (error) {
      console.error('Favorite migration error:', error);
    }
  };

  // ==========================================
  // LOAD FAVORITES FROM SUPABASE
  // ==========================================

  const loadFavorites = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('favourites')
        .select('listing_id')
        .eq('user_id', userId);

      if (error) throw error;

      setFavs(
        (data || []).map(item => String(item.listing_id))
      );

    } catch (error) {
      console.error('Favorites loading error:', error);
      setFavs([]);
    }
  };

  // ==========================================
  // CHECK LOGIN SESSION
  // ==========================================

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        console.error('Session error:', error);
      }

      if (!session) {
        router.replace('/login');
        return;
      }

      // Keep existing login flow.
      await load();

      if (!active) return;

      // Migrate old browser favorites for this account.
      await migrateOldFavorites(session.user.id);

      if (!active) return;

      // Load account favorites from Supabase.
      await loadFavorites(session.user.id);
    };

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  // ==========================================
  // ADD / REMOVE FAVORITE IN SUPABASE
  // ==========================================

  const toggleFav = async (e, l) => {
    e.preventDefault();
    e.stopPropagation();

    if (!l?.listing_id) {
      alert('Listing ID not available.');
      return;
    }

    if (favoriteLoading === l.listing_id) return;

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert('Please login first.');
      router.push('/login');
      return;
    }

    const listingId = String(l.listing_id);
    const alreadySaved = favs.includes(listingId);

    setFavoriteLoading(listingId);

    // Optimistic heart icon update
    if (alreadySaved) {
      setFavs(prev => prev.filter(id => id !== listingId));
    } else {
      setFavs(prev => [...prev, listingId]);
    }

    try {
      if (alreadySaved) {
        const { error } = await supabase
          .from('favourites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);

        if (error) throw error;

      } else {
        const { error } = await supabase
          .from('favourites')
          .upsert(
            {
              user_id: user.id,
              listing_id: listingId
            },
            {
              onConflict: 'user_id,listing_id',
              ignoreDuplicates: true
            }
          );

        if (error) throw error;
      }

    } catch (error) {
      console.error('Favorite update error:', error);

      // Restore original heart status if database operation fails
      if (alreadySaved) {
        setFavs(prev => [...prev, listingId]);
      } else {
        setFavs(prev => prev.filter(id => id !== listingId));
      }

      alert('Favorite update failed: ' + error.message);

    } finally {
      setFavoriteLoading(null);
    }
  };

  // ==========================================
  // VILLAGE FILTER OPTIONS
  // ==========================================

  const allVillages = useMemo(() => {
    return [
      ...new Set(
        listings
          .map(x => x.location_village)
          .filter(Boolean)
      )
    ].sort();
  }, [listings]);

  // ==========================================
  // DISTRICT FILTER OPTIONS
  // ==========================================

  const allDistricts = useMemo(() => {
    return [
      ...new Set(
        listings
          .map(x => x.location_district)
          .filter(Boolean)
      )
    ].sort();
  }, [listings]);

  // ==========================================
  // SEARCH VILLAGES
  // ==========================================

  const visibleVillages = useMemo(() => {
    if (!locSearch) return allVillages;

    return allVillages.filter(v =>
      v.toLowerCase().includes(locSearch.toLowerCase())
    );
  }, [allVillages, locSearch]);

  // ==========================================
  // FILTER AND SORT LISTINGS
  // ==========================================

  const filtered = useMemo(() => {
    let out = listings.filter(l => {
      if (tab === 'Logs' && l.product_type !== 'logs') {
        return false;
      }

      if (tab === 'Cut Sizes' && l.product_type !== 'cut_sizes') {
        return false;
      }

      if (tab === 'Buyer' && l.user_role !== 'buyer') {
        return false;
      }

      if (tab === 'Premium' && !l.is_premium) {
        return false;
      }

      if (
        locFilter !== 'All Locations' &&
        l.location_village !== locFilter
      ) {
        return false;
      }

      if (
        districtFilter !== 'All Districts' &&
        l.location_district !== districtFilter
      ) {
        return false;
      }

      const ago = getTimeAgo(l.created_at);

      const diffDays =
        (Date.now() - new Date(l.created_at).getTime()) /
        (1000 * 60 * 60 * 24);

      if (
        dateFilter === 'Today' &&
        (
          ago === 'Yesterday' ||
          ago.includes('d ago') ||
          diffDays >= 1
        )
      ) {
        return false;
      }

      if (dateFilter === 'Yesterday' && ago !== 'Yesterday') {
        return false;
      }

      if (dateFilter === 'This Week' && diffDays > 7) {
        return false;
      }

      if (dateFilter === 'This Month' && diffDays > 30) {
        return false;
      }

      if (
        priceMin &&
        Number(l.unit_price) < Number(priceMin)
      ) {
        return false;
      }

      if (
        priceMax &&
        Number(l.unit_price) > Number(priceMax)
      ) {
        return false;
      }

      if (search) {
        const hay = `
          ${l.title || ''}
          ${l.species || ''}
          ${l.location_village || ''}
          ${l.location_district || ''}
        `.toLowerCase();

        if (!hay.includes(search.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    if (sortBy === 'Low Price') {
      out.sort(
        (a, b) => (a.unit_price || 0) - (b.unit_price || 0)
      );

    } else if (sortBy === 'High Price') {
      out.sort(
        (a, b) => (b.unit_price || 0) - (a.unit_price || 0)
      );

    } else if (sortBy === 'Most CFT') {
      out.sort(
        (a, b) => (b.cft || 0) - (a.cft || 0)
      );

    } else {
      out.sort(
        (a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
      );
    }

    out.sort(
      (a, b) =>
        (b.is_premium ? 1 : 0) -
        (a.is_premium ? 1 : 0)
    );

    return out;

  }, [
    listings,
    tab,
    locFilter,
    districtFilter,
    dateFilter,
    priceMin,
    priceMax,
    search,
    sortBy
  ]);

  // ==========================================
  // CLEAR FILTERS
  // ==========================================

  const clearAll = () => {
    setSearch('');
    setLocSearch('');
    setLocFilter('All Locations');
    setDistrictFilter('All Districts');
    setDateFilter('All Time');
    setPriceMin('');
    setPriceMax('');
    setSortBy('Latest');
    setTab('All');
  };

  const activeFilterCount = [
    locFilter !== 'All Locations',
    districtFilter !== 'All Districts',
    dateFilter !== 'All Time',
    priceMin,
    priceMax
  ].filter(Boolean).length;

  // ==========================================
  // HOME PAGE UI
  // ==========================================

    return (
    <div className="min-h-screen bg-[#f4f7f2] flex justify-center text-[#17251b]">
      <div className="w-full max-w-[480px] pb-28 min-h-screen relative bg-white shadow-xl overflow-x-hidden">

        {/* PREMIUM GREEN HEADER */}
        <header className="sticky top-0 z-30 text-white shadow-md bg-gradient-to-r from-[#052d17] via-[#075326] to-[#0b3d20]">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
  {/* TimberMart Logo */}
  <img
    src="logo.png"
    alt="TimberMart Logo"
    className="h-14 w-14 object-contain rounded-full"
  />

  {/* Brand Name + Tagline */}
  <div className="min-w-0">
    <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight">
      Timber<span className="text-[#ffc629]">Mart</span>
      <span className="text-[10px] align-top">®</span>
    </h1>

    <p className="text-[10px] sm:text-xs text-green-100 whitespace-nowrap">
      India's Timber & Wood Marketplace
    </p>
  </div>
</div>
           

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/profile"
                aria-label="My profile"
                className="w-9 h-9 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-lg"
              >
                👤
              </Link>

              <button
                onClick={async () => {
                  const { error } = await supabase.auth.signOut();

                  if (error) {
                    alert('Logout failed: ' + error.message);
                    return;
                  }

                  router.replace('/login');
                }}
                className="bg-white/10 border border-white/25 text-white px-2.5 py-2 rounded-full text-[10px] font-bold"
              >
                Logout
              </button>

              <Link
                href="/dynamic-listing"
                className="bg-[#ffc629] text-[#17220f] px-3 py-2 rounded-full text-[11px] font-black shadow"
              >
                + LIST
              </Link>
            </div>
          </div>
        </header>

        <main className="px-4 pt-4">

          {/* SEARCH */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
              ⌕
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search timber, species, village, supplier..."
              className="w-full bg-[#f5f7f5] border border-[#e2e9e2] rounded-full pl-11 pr-4 py-3.5 text-[13px] outline-none focus:border-[#16803c] focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* CATEGORY STRIP */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
  { label: 'Timber', sub: '(Logs)', icon: '🪵', value: 'Logs' },
  { label: 'Cut Sizes', sub: '', icon: '🪚', value: 'Cut Sizes' },
  { label: 'Buyer Needs', sub: '', icon: '📋', value: 'Buyer' },
  { label: 'Premium', sub: '', icon: '👑', value: 'Premium' }
].map(item => (
  <button
    key={item.value}
    type="button"
    onClick={() => {
      setTab(item.value);

      document.getElementById('latest-listings')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }}
    className={`min-w-0 rounded-2xl border px-1.5 py-3 flex flex-col items-center justify-center gap-1 transition ${
      tab === item.value
        ? 'bg-[#e8f5e9] border-[#16803c] shadow-sm'
        : 'bg-white border-[#edf0ed]'
    }`}
  >
    <span className="text-[25px] leading-none">{item.icon}</span>
    <span className="text-[10px] font-extrabold text-center leading-tight">
      {item.label}
    </span>
    {item.sub && (
      <span className="text-[9px] text-gray-500">{item.sub}</span>
    )}
  </button>
))}
          </div>

          {/* HERO BANNER */}
          <Link
            href="/dynamic-listing"
            className="block mt-4 rounded-[22px] overflow-hidden relative min-h-[178px] bg-gradient-to-r from-[#052d17] via-[#0b5127] to-[#174b25] shadow-lg"
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 80% 20%, #d7a83d 0, transparent 35%), linear-gradient(135deg, transparent 45%, #071e10 100%)'
              }}
            />
            <div className="relative z-10 p-5 pr-28">
              <p className="text-white text-[22px] leading-[1.12] font-black">
                Buy & Sell
              </p>
              <p className="text-[#ffc629] text-[22px] leading-[1.12] font-black">
                Quality Timber Online
              </p>
              <p className="text-green-50 text-[11px] leading-snug mt-2 max-w-[220px]">
                Connect with farmers, merchants, sawmills and carpenters.
              </p>
              <span className="inline-flex items-center gap-2 mt-4 bg-[#ffc629] text-[#17220f] rounded-full px-4 py-2 text-[11px] font-black">
                Post Your Requirement <span className="text-base">→</span>
              </span>
            </div>
            <div className="absolute right-2 bottom-3 text-[82px] leading-none drop-shadow-lg">
              🪵
            </div>
            <div className="absolute right-4 top-4 text-[35px] opacity-80">
              🌲
            </div>
          </Link>

          {/* TRUST STRIP */}
          <div className="grid grid-cols-4 gap-1 py-4 border-b border-[#edf1ed]">
            {[
              ['🛡️', 'Verified'],
              ['📍', 'Nearby Leads'],
              ['⚡', 'Quick Response'],
              ['🤝', 'Trusted Network']
            ].map(([icon, label]) => (
              <div
                key={label}
                className="flex flex-col items-center text-center gap-1"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-[9px] font-bold text-gray-700 leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* QUICK ACTIONS */}
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <Link
              href="/dynamic-listing"
              className="rounded-2xl bg-[#e7f5e8] border border-[#d5ead7] p-3 flex items-center gap-2.5 min-h-[76px]"
            >
              <span className="text-[28px]">🪵</span>
              <span>
                <b className="block text-[12px]">+ List Timber</b>
                <small className="text-[10px] text-gray-600">Sell logs / planks</small>
              </span>
            </Link>

            <Link
              href="/dynamic-listing"
              className="rounded-2xl bg-[#fff1df] border border-[#f6e4cc] p-3 flex items-center gap-2.5 min-h-[76px]"
            >
              <span className="text-[27px]">📋</span>
              <span>
                <b className="block text-[12px]">Post Requirement</b>
                <small className="text-[10px] text-gray-600">Tell what you need</small>
              </span>
            </Link>

            <Link
              href="/carpenters"
              className="rounded-2xl bg-[#e8f1ff] border border-[#d8e6fb] p-3 flex items-center gap-2.5 min-h-[76px]"
            >
              <span className="text-[27px]">🧑‍🔧</span>
              <span>
                <b className="block text-[12px]">Find Carpenter</b>
                <small className="text-[10px] text-gray-600">Nearby services</small>
              </span>
            </Link>

            <Link
              href="/subscription"
              className="rounded-2xl bg-[#f4eaff] border border-[#e9dcf7] p-3 flex items-center gap-2.5 min-h-[76px]"
            >
              <span className="text-[27px]">👑</span>
              <span>
                <b className="block text-[12px]">Upgrade Premium</b>
                <small className="text-[10px] text-gray-600">More visibility</small>
              </span>
            </Link>
          </div>

          {/* CARPENTER ACTIONS */}
          <div className="mt-3 flex gap-2">
            <Link
              href="/carpenters"
              className="flex-1 rounded-xl bg-[#f5f8f4] border border-[#e4ebe2] p-3 flex items-center gap-2"
            >
              <span className="text-xl">🪚</span>
              <span className="min-w-0">
                <b className="block text-[11px]">Find Carpenter Nearby</b>
                <small className="text-[9px] text-gray-500">
                  Distance in KM · Call Direct
                </small>
              </span>
              <span className="ml-auto">→</span>
            </Link>

            <Link
              href="/register-carpenter"
              className="rounded-xl bg-[#073b1d] text-white px-4 py-2 flex flex-col justify-center items-center"
            >
              <span className="text-lg leading-none">＋</span>
              <span className="text-[9px] font-bold text-center">
                Join as<br />Carpenter
              </span>
            </Link>
          </div>

          {/* LISTINGS HEADING */}
          <div
  id="latest-listings"
  className="flex items-end justify-between mt-6 mb-3 scroll-mt-24"
>
            <div>
              <p className="text-[19px] font-black tracking-tight">
                Latest Listings
              </p>
              <p className="text-[10px] text-gray-500">
                Explore timber available in the marketplace
              </p>
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-extrabold text-[#08732f]"
            >
              View All →
            </button>
          </div>

          {/* LISTING TABS */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['All', 'Logs', 'Cut Sizes', 'Buyer', 'Premium'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 px-4 py-2.5 rounded-full text-[11px] font-extrabold whitespace-nowrap border transition ${
                  tab === t
                    ? 'bg-[#075326] text-white border-[#075326] shadow-sm'
                    : 'bg-[#f6f7f6] text-gray-700 border-[#edf0ed]'
                }`}
              >
                {t === 'Buyer' ? 'Buyer Needs' : t}
                {t === 'All' ? ` (${filtered.length})` : ''}
              </button>
            ))}
          </div>

          {/* FILTER + SORT */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 border rounded-full px-3 py-2.5 text-[11px] font-bold text-left ${
                activeFilterCount > 0
                  ? 'bg-[#075326] text-white border-[#075326]'
                  : 'bg-white border-[#e2e8e2]'
              }`}
            >
              📍 {locFilter === 'All Locations' ? 'Location' : locFilter}
              {' · '}🗓️ {dateFilter}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              <span className="float-right">
                {showFilters ? '⌃' : '⌄'}
              </span>
            </button>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="border border-[#e2e8e2] rounded-full px-3 py-2.5 text-[11px] font-bold bg-white outline-none"
            >
              <option value="Latest">Latest</option>
              <option value="Low Price">Low Price</option>
              <option value="High Price">High Price</option>
              <option value="Most CFT">Most CFT</option>
            </select>
          </div>

          {/* FILTER PANEL */}
          {showFilters && (
            <div className="border border-[#e3ebe3] rounded-2xl p-4 mt-3 space-y-4 bg-[#f8faf7]">
              <div>
                <p className="text-[11px] font-extrabold mb-2">
                  📍 Location Search
                </p>
                <input
                  value={locSearch}
                  onChange={e => setLocSearch(e.target.value)}
                  placeholder="Type village... Example: Anakapalle"
                  className="w-full border border-[#dfe7df] rounded-xl px-4 py-3 text-[12px] bg-white outline-none"
                />
              </div>

              <div>
                <p className="text-[11px] font-extrabold mb-2">
                  Village Filter {visibleVillages.length > 0 && `(${visibleVillages.length})`}
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
                  <button
                    onClick={() => setLocFilter('All Locations')}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${
                      locFilter === 'All Locations'
                        ? 'bg-[#075326] text-white'
                        : 'bg-white border'
                    }`}
                  >
                    All Locations
                  </button>

                  {visibleVillages.map(v => (
                    <button
                      key={v}
                      onClick={() => setLocFilter(v)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${
                        locFilter === v
                          ? 'bg-[#075326] text-white'
                          : 'bg-white border'
                      }`}
                    >
                      {v}
                    </button>
                  ))}

                  {visibleVillages.length === 0 && (
                    <p className="text-[11px] text-gray-500">
                      No village found
                    </p>
                  )}
                </div>
              </div>

              {allDistricts.length > 0 && (
                <div>
                  <p className="text-[11px] font-extrabold mb-2">
                    District Filter
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setDistrictFilter('All Districts')}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${
                        districtFilter === 'All Districts'
                          ? 'bg-[#075326] text-white'
                          : 'bg-white border'
                      }`}
                    >
                      All Districts
                    </button>

                    {allDistricts.map(d => (
                      <button
                        key={d}
                        onClick={() => setDistrictFilter(d)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${
                          districtFilter === d
                            ? 'bg-[#075326] text-white'
                            : 'bg-white border'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-extrabold mb-2">Date Filter</p>
                <div className="grid grid-cols-5 gap-1">
                  {['All Time', 'Today', 'Yesterday', 'This Week', 'This Month'].map(d => (
                    <button
                      key={d}
                      onClick={() => setDateFilter(d)}
                      className={`py-2 rounded-lg text-[9px] font-bold ${
                        dateFilter === d
                          ? 'bg-[#075326] text-white'
                          : 'bg-white border'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-extrabold mb-2">
                  Price Filter - Per CFT
                </p>
                <div className="flex gap-2">
                  <input
                    value={priceMin}
                    onChange={e => setPriceMin(e.target.value)}
                    type="number"
                    placeholder="Min ₹"
                    className="w-1/2 border rounded-xl px-3 py-2.5 text-[12px] bg-white outline-none"
                  />
                  <input
                    value={priceMax}
                    onChange={e => setPriceMax(e.target.value)}
                    type="number"
                    placeholder="Max ₹"
                    className="w-1/2 border rounded-xl px-3 py-2.5 text-[12px] bg-white outline-none"
                  />
                </div>
              </div>

              <button
                onClick={clearAll}
                className="w-full text-[11px] font-bold text-[#08732f] py-2"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* ACTIVE FILTER CHIPS */}
          {(locFilter !== 'All Locations' ||
            dateFilter !== 'All Time' ||
            districtFilter !== 'All Districts') && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {locFilter !== 'All Locations' && (
                <button
                  onClick={() => setLocFilter('All Locations')}
                  className="bg-[#e8f5e9] text-[#075326] px-3 py-1 rounded-full text-[10px] font-bold"
                >
                  📍 {locFilter} ×
                </button>
              )}

              {districtFilter !== 'All Districts' && (
                <button
                  onClick={() => setDistrictFilter('All Districts')}
                  className="bg-[#e8f5e9] text-[#075326] px-3 py-1 rounded-full text-[10px] font-bold"
                >
                  {districtFilter} ×
                </button>
              )}

              {dateFilter !== 'All Time' && (
                <button
                  onClick={() => setDateFilter('All Time')}
                  className="bg-[#e8f5e9] text-[#075326] px-3 py-1 rounded-full text-[10px] font-bold"
                >
                  🗓️ {dateFilter} ×
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className="py-5">
              <TreeLoader message="Growing TimberMart..." fullScreen={false} />
            </div>
          )}

          {/* LISTING CARDS */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {filtered.map(l => (
              <Link
                key={l.listing_id}
                href={`/p/${l.listing_id}`}
                className="block min-w-0 rounded-2xl overflow-hidden border border-[#e8ece8] bg-white shadow-[0_3px_12px_rgba(0,0,0,0.07)]"
              >
                <div className={`relative aspect-[4/3] overflow-hidden bg-gray-100 ${
                  l.user_role === 'buyer'
                    ? 'ring-2 ring-inset ring-blue-500'
                    : ''
                }`}>
                  <img
                    src={l.listing_images?.[0]?.image_url || '/placeholder.jpg'}
                    alt={l.title}
                    className="w-full h-full object-cover"
                  />

                  {l.user_role === 'buyer' ? (
                    <span className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-[9px] font-black shadow">
                      BUYING
                    </span>
                  ) : (
                    <span className="absolute top-2 left-2 bg-[#07852f] text-white px-2 py-1 rounded-full text-[9px] font-black shadow">
                      FOR SALE
                    </span>
                  )}

                  {l.is_premium && (
                    <span className="absolute top-2 right-2 bg-[#ffc629] text-[#332600] px-2 py-1 rounded-full text-[8px] font-black">
                      PREMIUM
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => toggleFav(e, l)}
                    disabled={favoriteLoading === String(l.listing_id)}
                    className="absolute bottom-2 right-2 w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-base shadow"
                    aria-label={
                      favs.includes(String(l.listing_id))
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                  >
                    {favoriteLoading === String(l.listing_id)
                      ? '…'
                      : favs.includes(String(l.listing_id))
                        ? '❤️'
                        : '🤍'}
                  </button>

                  {l.cft && (
                    <span className="absolute bottom-2 left-2 bg-white/95 text-[#243329] px-2 py-1 rounded-full text-[9px] font-extrabold">
                      {l.cft} CFT
                    </span>
                  )}
                </div>

                <div className="p-2.5">
                  <p className="font-black text-[11px] leading-snug line-clamp-2 min-h-[30px]">
                    {l.title?.slice(0, 38)}
                  </p>
                  <p className="text-[9px] text-gray-500 mt-1 truncate">
                    📍 {l.location_village || 'Anakapalle'} · {getTimeAgo(l.created_at)}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {formatDateTime(l.created_at)}
                  </p>
                  <p className="font-black text-[12px] text-[#9c241c] mt-2">
                    ₹{l.unit_price}/{l.unit_type}
                  </p>
                  {l.total_price && (
                    <p className="text-[9px] text-gray-600">
                      Total ₹{l.total_price}
                    </p>
                  )}
                  {l.product_type === 'cut_sizes' && l.cut_size && (
                    <p className="text-[9px] text-gray-500 mt-1 line-clamp-1">
                      🪚 {l.cut_size}
                    </p>
                  )}
                  <p className="text-[9px] text-[#08732f] font-extrabold mt-2">
                    ✓ Admin Verified
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {!loading && filtered.length === 0 && (
            <div className="text-center mt-12 mb-8 rounded-2xl bg-[#f7faf6] p-7">
              <p className="text-[36px]">🪵</p>
              <p className="text-gray-700 text-[13px] font-bold mt-2">
                No approved listings for this filter
              </p>
              <p className="text-gray-400 text-[11px] mt-1">
                Pending listings will appear after admin approval
              </p>
              <button
                onClick={clearAll}
                className="mt-4 bg-[#075326] text-white px-5 py-2.5 rounded-full text-[11px] font-bold"
              >
                Clear Filters
              </button>
            </div>
          )}
        </main>

        {/* FLOATING WHATSAPP SUPPORT - UNCHANGED */}
        <div className="fixed bottom-24 right-4 z-50">
          {showWhatsAppMenu && (
            <div className="mb-3 w-60 bg-white rounded-2xl shadow-2xl border p-3">
              <p className="font-black text-sm text-gray-800">
                TimberMart Support 👋
              </p>
              <p className="text-[10px] text-gray-500 mt-1 mb-3">
                How can we help you?
              </p>

              <a
                href="https://wa.me/918985364488?text=Hi%20TimberMart%2C%20I%20have%20an%20enquiry."
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-green-50 rounded-xl p-3 mb-2"
              >
                <p className="text-xs font-bold text-green-800">
                  💬 More Enquiries
                </p>
                <p className="text-[10px] text-gray-500">
                  Ask about TimberMart services
                </p>
              </a>

              <a
                href="https://wa.me/918985364488?text=Hi%20TimberMart%2C%20I%20want%20to%20share%20feedback."
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-green-50 rounded-xl p-3 mb-2"
              >
                <p className="text-xs font-bold text-green-800">
                  ⭐ Feedback
                </p>
                <p className="text-[10px] text-gray-500">
                  Share your suggestions
                </p>
              </a>

              <a
                href="https://wa.me/918985364488?text=Hi%20TimberMart%2C%20I%20need%20customer%20support."
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-green-50 rounded-xl p-3"
              >
                <p className="text-xs font-bold text-green-800">
                  🎧 Customer Support
                </p>
                <p className="text-[10px] text-gray-500">
                  Get help with any issue
                </p>
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowWhatsAppMenu(prev => !prev)}
            className="ml-auto w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center text-3xl border-2 border-white"
            aria-label="WhatsApp Support"
          >
            {showWhatsAppMenu ? '✕' : '☏'}
          </button>
        </div>

        {/* BOTTOM NAVIGATION - UNCHANGED */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t px-4 py-3 flex justify-between items-center z-30">
          <Link href="/" className="text-[12px] font-black">
            Home
          </Link>

          <Link href="/carpenters" className="text-[12px] font-bold">
            🪚 Carpenter
          </Link>

          <Link
            href="/dynamic-listing"
            className="bg-black text-white px-5 py-2 rounded-full text-[12px] font-bold"
          >
            + List Timber
          </Link>

          <Link href="/profile" className="text-[12px] font-bold">
            Profile
          </Link>
        </div>

      </div>
    </div>
  );
}


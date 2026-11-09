// pages/index.js - FINAL - Home - Carpenter + SELL / BUYING Badge + Pure English + Admin Approved Only
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/router';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function Home() {
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
  const [favs, setFavs] = useState([]);

  useEffect(() => {
    load();
    const saved = JSON.parse(localStorage.getItem('timber_saved') || '[]');
    setFavs(saved.map(s => s.listing_id));
  }, []);

  const load = async () => {
    setLoading(true);
    // ONLY ADMIN APPROVED LISTINGS - PENDING / REJECTED NOT SHOWN
    const { data } = await supabase
      .from('listings')
      .select('*, listing_images(image_url)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(200);
    setListings(data || []);
    setLoading(false);
  };

  const allVillages = useMemo(() => {
    return [...new Set(listings.map(x => x.location_village).filter(Boolean))].sort();
  }, [listings]);

  const allDistricts = useMemo(() => {
    return [...new Set(listings.map(x => x.location_district).filter(Boolean))].sort();
  }, [listings]);

  const visibleVillages = useMemo(() => {
    if (!locSearch) return allVillages;
    return allVillages.filter(v => v.toLowerCase().includes(locSearch.toLowerCase()));
  }, [allVillages, locSearch]);

  const toggleFav = (e, l) => {
    e.preventDefault(); e.stopPropagation();
    let saved = JSON.parse(localStorage.getItem('timber_saved') || '[]');
    if (favs.includes(l.listing_id)) {
      saved = saved.filter(s => s.listing_id !== l.listing_id);
    } else {
      saved.push({ listing_id: l.listing_id, title: l.title, species: l.species });
    }
    localStorage.setItem('timber_saved', JSON.stringify(saved));
    setFavs(saved.map(s => s.listing_id));
  };

  const filtered = useMemo(() => {
    let out = listings.filter(l => {
      if (tab === 'Logs' && l.product_type !== 'logs') return false;
      if (tab === 'Cut Sizes' && l.product_type !== 'cut_sizes') return false;
      if (tab === 'Buyer' && l.user_role !== 'buyer') return false;
      if (tab === 'Premium' && !l.is_premium) return false;
      if (locFilter !== 'All Locations' && l.location_village !== locFilter) return false;
      if (districtFilter !== 'All Districts' && l.location_district !== districtFilter) return false;

      const ago = getTimeAgo(l.created_at);
      const diffDays = (Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (dateFilter === 'Today' && (ago === 'Yesterday' || ago.includes('d ago') || diffDays >= 1)) return false;
      if (dateFilter === 'Yesterday' && ago !== 'Yesterday') return false;
      if (dateFilter === 'This Week' && diffDays > 7) return false;
      if (dateFilter === 'This Month' && diffDays > 30) return false;

      if (priceMin && Number(l.unit_price) < Number(priceMin)) return false;
      if (priceMax && Number(l.unit_price) > Number(priceMax)) return false;

      if (search) {
        const hay = `${l.title || ''} ${l.species || ''} ${l.location_village || ''} ${l.location_district || ''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });

    if (sortBy === 'Low Price') out.sort((a, b) => (a.unit_price || 0) - (b.unit_price || 0));
    else if (sortBy === 'High Price') out.sort((a, b) => (b.unit_price || 0) - (a.unit_price || 0));
    else if (sortBy === 'Most CFT') out.sort((a, b) => (b.cft || 0) - (a.cft || 0));
    else out.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    out.sort((a, b) => (b.is_premium ? 1 : 0) - (a.is_premium ? 1 : 0));
    return out;
  }, [listings, tab, locFilter, districtFilter, dateFilter, priceMin, priceMax, search, sortBy]);

  const clearAll = () => {
    setSearch(''); setLocSearch(''); setLocFilter('All Locations'); setDistrictFilter('All Districts');
    setDateFilter('All Time'); setPriceMin(''); setPriceMax(''); setSortBy('Latest'); setTab('All');
  };

  const activeFilterCount = [locFilter !== 'All Locations', districtFilter !== 'All Districts', dateFilter !== 'All Time', priceMin, priceMax].filter(Boolean).length;
  const router = useRouter();

useEffect(() => {
  let active = true;

  const checkSession = async () => {
    const { data: { session } } =
      await supabase.auth.getSession();

    if (!active) return;

    if (!session) {
      router.replace('/login');
      return;
    }

    load();

    const saved = JSON.parse(
      localStorage.getItem('timber_saved') || '[]'
    );

    setFavs(saved.map(s => s.listing_id));
  };

  checkSession();

  return () => {
    active = false;
  };
}, []);

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-[480px] pb-24 min-h-screen relative">

        {/* HEADER */}
        <div className="bg-black text-white px-4 py-3 flex justify-between items-center sticky top-0 z-30">
          <p className="font-black text-[16px] tracking-wide">TimberMart.co.in</p>
          <div className="flex gap-2 items-center">
            <Link
  href="/profile"
  className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[16px]"
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
  className="bg-red-600 text-white px-3 py-2 rounded-full text-[11px] font-bold"
>
  Logout
</button>

<Link
  href="/list-timber"
  className="bg-white text-black px-4 py-2 rounded-full text-[12px] font-bold"
>
  + LIST
</Link>
          </div>
        </div>

        <div className="px-4 pt-3">
          {/* SEARCH */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search species, village..."
            className="w-full bg-[#f2f2f2] rounded-full px-4 py-3 text-[13px] outline-none"
          />

          {/* CARPENTER BANNER - HOME TOP */}
          <Link href="/subscription" className="block w-full mt-3 bg-yellow-400 rounded-[16px] p-3 text-center font-bold text-[12px]">⭐ Go Premium - ₹99 -  →</Link>
          <div className="flex gap-2 mt-3">
            <Link href="/carpenters" className="flex-1 bg-orange-50 border border-orange-200 rounded-[16px] p-3 flex items-center gap-2">
              <span className="text-[24px]">🪚</span>
              <div><p className="font-bold text-[12px]">Find Carpenter Nearby</p><p className="text-[10px] text-gray-500">Distance in KM • Call Direct</p></div>
              <span className="ml-auto text-[16px]">→</span>
            </Link>
            <Link href="/register-carpenter" className="bg-black text-white rounded-[16px] px-4 py-2 flex flex-col items-center justify-center">
              <span className="text-[16px] leading-none">+</span><span className="text-[10px] font-bold text-center leading-tight">Join as<br />Carpenter</span>
            </Link>
          </div>

          {/* LOCATION + DATE FILTER + SORT */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 border rounded-full py-2.5 text-[12px] font-bold ${activeFilterCount > 0 ? 'bg-black text-white border-black' : 'bg-white'}`}
            >
              📍 {locFilter === 'All Locations' ? 'Location' : locFilter} • 🗓️ {dateFilter} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''} {showFilters ? '▲' : '▼'}
            </button>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded-full px-3 py-2.5 text-[12px] bg-white outline-none">
              <option value="Latest">Latest</option>
              <option value="Low Price">Low Price</option>
              <option value="High Price">High Price</option>
              <option value="Most CFT">Most CFT</option>
            </select>
          </div>

          {/* FILTER PANEL */}
          {showFilters && (
            <div className="border rounded-[18px] p-4 mt-2 space-y-4 bg-[#fafafa]">
              <div>
                <p className="text-[11px] font-bold mb-1.5">📍 Location Search</p>
                <input
                  value={locSearch}
                  onChange={e => setLocSearch(e.target.value)}
                  placeholder="Type village... Example: Anakapalle"
                  className="w-full border rounded-full px-4 py-2.5 text-[12px] bg-white outline-none"
                />
              </div>

              <div>
                <p className="text-[11px] font-bold mb-1.5">Village Filter {visibleVillages.length > 0 && `(${visibleVillages.length})`}</p>
                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
                  <button onClick={() => setLocFilter('All Locations')} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${locFilter === 'All Locations' ? 'bg-black text-white' : 'bg-white border'}`}>All Locations</button>
                  {visibleVillages.map(v => (
                    <button key={v} onClick={() => setLocFilter(v)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${locFilter === v ? 'bg-black text-white' : 'bg-white border'}`}>{v}</button>
                  ))}
                  {visibleVillages.length === 0 && <p className="text-[11px] text-gray-500">No village found</p>}
                </div>
              </div>

              {allDistricts.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold mb-1.5">District Filter</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setDistrictFilter('All Districts')} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${districtFilter === 'All Districts' ? 'bg-black text-white' : 'bg-white border'}`}>All Districts</button>
                    {allDistricts.map(d => (
                      <button key={d} onClick={() => setDistrictFilter(d)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${districtFilter === d ? 'bg-black text-white' : 'bg-white border'}`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold mb-1.5">Date Filter</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {['All Time', 'Today', 'Yesterday', 'This Week', 'This Month'].map(d => (
                    <button key={d} onClick={() => setDateFilter(d)} className={`py-2 rounded-full text-[11px] font-bold ${dateFilter === d ? 'bg-black text-white' : 'bg-white border'}`}>{d}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold mb-1.5">Price Filter - Per CFT</p>
                <div className="flex gap-2">
                  <input value={priceMin} onChange={e => setPriceMin(e.target.value)} type="number" placeholder="Min ₹" className="flex-1 border rounded-full px-4 py-2.5 text-[12px] bg-white outline-none" />
                  <input value={priceMax} onChange={e => setPriceMax(e.target.value)} type="number" placeholder="Max ₹" className="flex-1 border rounded-full px-4 py-2.5 text-[12px] bg-white outline-none" />
                </div>
              </div>

              <button onClick={clearAll} className="w-full text-[11px] text-gray-500 underline">Clear All Filters</button>
            </div>
          )}

          {/* TABS */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {['All', 'Logs', 'Cut Sizes', 'Buyer', 'Premium'].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap ${tab === t ? 'bg-black text-white' : 'bg-[#f2f2f2]'}`}>
                {t} {t === 'All' ? `(${filtered.length})` : ''}
              </button>
            ))}
          </div>

          {/* ACTIVE FILTERS */}
          {(locFilter !== 'All Locations' || dateFilter !== 'All Time' || districtFilter !== 'All Districts') && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {locFilter !== 'All Locations' && <button onClick={() => setLocFilter('All Locations')} className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold">📍 {locFilter} ✕</button>}
              {districtFilter !== 'All Districts' && <button onClick={() => setDistrictFilter('All Districts')} className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold">📍 {districtFilter} ✕</button>}
              {dateFilter !== 'All Time' && <button onClick={() => setDateFilter('All Time')} className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold">🗓️ {dateFilter} ✕</button>}
            </div>
          )}

          {loading && <p className="text-center text-gray-500 text-[13px] mt-10">Loading approved listings...</p>}

          {/* LISTING CARDS - SELL vs BUYING - INSTANT IDENTIFY */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {filtered.map(l => (
              <Link key={l.listing_id} href={`/p/${l.listing_id}`} className="block">
                <div className={`relative rounded-[16px] overflow-hidden bg-gray-100 aspect-[4/3] ${l.user_role === 'buyer' ? 'ring-2 ring-blue-600' : ''}`}>
                  <img src={l.listing_images?.[0]?.image_url || '/placeholder.jpg'} alt={l.title} className="w-full h-full object-cover" />
                  {/* SELL / BUYING BADGE - ON IMAGE TOP */}
                  {l.user_role === 'buyer' ? (
                    <span className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-[9px] font-black tracking-wide shadow">BUYING</span>
                  ) : (
                    <span className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded-full text-[9px] font-black tracking-wide shadow">SELL</span>
                  )}
                  <span className="absolute bottom-2 right-2 bg-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow">{l.cft ? `${l.cft} CFT` : 'LOGS'}</span>
                  {l.is_premium && <span className="absolute top-2 right-2 bg-[#FFD700] px-2 py-0.5 rounded-full text-[9px] font-black">PREMIUM</span>}
                  {l.is_verified && <span className="absolute bottom-2 left-2 bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">✓</span>}
                  <button onClick={(e) => toggleFav(e, l)} className="absolute bottom-8 left-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-[13px] shadow">
                    {favs.includes(l.listing_id) ? '❤️' : '🤍'}
                  </button>
                </div>

                {/* SELL / BUYING TEXT BADGE - BELOW IMAGE */}
                {l.user_role === 'buyer' ? (
                  <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-black mt-2">BUYING - WANTS TO BUY</span>
                ) : (
                  <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[9px] font-black mt-2">SELL - FOR SALE</span>
                )}

                <p className="font-bold text-[12px] mt-1 leading-tight line-clamp-2">{l.title?.slice(0, 38)}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">📍 {l.location_village || 'Anakapalle'} • {getTimeAgo(l.created_at)}</p>
                <p className="text-[10px] text-gray-400">{formatDateTime(l.created_at)}</p>
                <p className="font-black text-[12px] mt-1">₹{l.unit_price}/{l.unit_type} {l.total_price ? `• ₹${l.total_price}` : ''}</p>
                {l.product_type === 'cut_sizes' && l.cut_size && <p className="text-[10px] text-gray-500 mt-0.5">🪚 {l.cut_size}</p>}
                <p className="text-[9px] text-green-600 font-bold mt-0.5">✓ Admin Verified</p>
              </Link>
            ))}
          </div>

          {!loading && filtered.length === 0 && (
            <div className="text-center mt-12">
              <p className="text-[32px]">🪵</p>
              <p className="text-gray-500 text-[13px] mt-2">No approved listings for this filter</p>
              <p className="text-gray-400 text-[11px] mt-1">Pending listings will appear after admin approval</p>
              <button onClick={clearAll} className="mt-3 bg-black text-white px-5 py-2.5 rounded-full text-[12px] font-bold">Clear Filters</button>
            </div>
          )}
        </div>

        {/* BOTTOM BAR - WITH CARPENTER */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t px-4 py-3 flex justify-between items-center z-30">
          <Link href="/" className="text-[12px] font-black">Home</Link>
          <Link href="/carpenters" className="text-[12px] font-bold">🪚 Carpenter</Link>
          <Link href="/list-timber" className="bg-black text-white px-5 py-2 rounded-full text-[12px] font-bold">+ List Timber</Link>
          <Link href="/profile" className="text-[12px] font-bold">Profile</Link>
        </div>
      </div>
    </div>
  );
}
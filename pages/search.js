// pages/search.js - ADVANCED SEARCH - MIXED GIRTHS + CUT SIZES + BUDGET + VILLAGE
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const WOOD_SPECIES = ["All","Teak Wood - Sagwan","Sal Wood - Sakhu","Sheesham - Rosewood","Neem Wood","Mango Wood","Eucalyptus - Nilagiri","Acacia - Babool","Pine Wood","Sandalwood","Bamboo","Plywood","Mahogany","Silver Oak","Gurjan","Others"];

export default function SearchPage() {
  const [listings, setListings] = useState([]);
  const [imagesMap, setImagesMap] = useState({});
  const [loading, setLoading] = useState(true);
  
  // FILTERS
  const [filters, setFilters] = useState({
    q: '', species: 'All', village: '', product_type: 'all', // all | logs | cut_sizes
    girth_mode: 'all', // all | single | mixed | range
    length_mode: 'all',
    min_girth: '', max_girth: '',
    min_length: '', max_length: '',
    width: '', thickness: '',
    user_role: 'all', // all | seller | buyer
    min_budget: '', max_budget: '',
    min_price: '', max_price: '',
    urgency: 'All'
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase.from('listings').select('*').order('created_at', { ascending: false }).limit(60);
    setListings(data || []);
    const map = {};
    for (const lot of data || []) {
      const { data: imgData } = await supabase.from('listing_images').select('image_url').eq('listing_id', lot.listing_id).limit(1);
      if (imgData && imgData.length > 0) map[lot.listing_id] = imgData[0].image_url;
      else {
        const { data: files } = await supabase.storage.from('timber-images').list(lot.listing_id);
        if (files && files.length > 0) {
          const f = files.find(x => /\.(jpg|jpeg|png|webp)$/i.test(x.name));
          if (f) {
            const { data: url } = supabase.storage.from('timber-images').getPublicUrl(`${lot.listing_id}/${f.name}`);
            map[lot.listing_id] = url.publicUrl;
          }
        }
      }
    }
    setImagesMap(map);
    setLoading(false);
  };

  const updateFilter = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));

  const filtered = listings.filter(l => {
    if (filters.q && !`${l.title} ${l.species} ${l.location_village} ${l.mixed_girths_text} ${l.mixed_lengths_text} ${l.mixed_widths_text}`.toLowerCase().includes(filters.q.toLowerCase())) return false;
    if (filters.species !== 'All' && l.species !== filters.species) return false;
    if (filters.village && !l.location_village?.toLowerCase().includes(filters.village.toLowerCase())) return false;
    if (filters.product_type !== 'all') {
      if (filters.product_type === 'logs' && l.product_type === 'cut_sizes') return false;
      if (filters.product_type === 'cut_sizes' && l.product_type !== 'cut_sizes') return false;
    }
    if (filters.girth_mode !== 'all' && l.girth_mode !== filters.girth_mode) return false;
    if (filters.length_mode !== 'all' && l.length_mode !== filters.length_mode && l.cut_length_mode !== filters.length_mode) return false;
    if (filters.user_role !== 'all' && l.user_role !== filters.user_role) return false;
    if (filters.urgency !== 'All' && l.urgency !== filters.urgency) return false;
    
    if (filters.min_girth) {
      const g = parseFloat(l.girth_inch || l.girth_min || 0);
      if (g < parseFloat(filters.min_girth)) return false;
    }
    if (filters.max_girth) {
      const g = parseFloat(l.girth_inch || l.girth_max || 999);
      if (g > parseFloat(filters.max_girth)) return false;
    }
    if (filters.min_length) {
      const le = parseFloat(l.length_ft || l.length_min || l.cut_length || l.cut_length_min || 0);
      if (le < parseFloat(filters.min_length)) return false;
    }
    if (filters.max_length) {
      const le = parseFloat(l.length_ft || l.length_max || l.cut_length || l.cut_length_max || 999);
      if (le > parseFloat(filters.max_length)) return false;
    }
    if (filters.min_price && parseFloat(l.unit_price || l.price || 0) < parseFloat(filters.min_price)) return false;
    if (filters.max_price && parseFloat(l.unit_price || l.price || 0) > parseFloat(filters.max_price)) return false;
    if (filters.min_budget && parseFloat(l.budget_max || 0) < parseFloat(filters.min_budget)) return false;
    if (filters.max_budget && parseFloat(l.budget_min || 999999) > parseFloat(filters.max_budget)) return false;
    
    return true;
  });

  const clearFilters = () => setFilters({ q: '', species: 'All', village: '', product_type: 'all', girth_mode: 'all', length_mode: 'all', min_girth: '', max_girth: '', min_length: '', max_length: '', width: '', thickness: '', user_role: 'all', min_budget: '', max_budget: '', min_price: '', max_price: '', urgency: 'All' });

  return (
    <div className="min-h-screen bg-[#f6f6f6] flex justify-center">
      <div className="w-full max-w-[480px] bg-white min-h-screen">
        <div className="sticky top-0 bg-black text-white px-4 py-3 flex justify-between items-center z-20">
          <Link href="/" className="text-[11px] font-bold">← HOME</Link>
          <span className="font-black text-[12px]">SEARCH • {filtered.length} RESULTS</span>
          <button onClick={clearFilters} className="text-[9px] bg-white text-black px-2.5 py-1 rounded-full font-bold">CLEAR</button>
        </div>

        {/* ADVANCED FILTERS */}
        <div className="p-3 bg-white border-b space-y-2.5 max-h-[65vh] overflow-y-auto">
          <input className="w-full bg-gray-100 rounded-full px-4 py-3 text-[12px] outline-none" placeholder="Search title, mixed girth ex: 18,22,30..." value={filters.q} onChange={e => updateFilter('q', e.target.value)} />
          
          <div className="grid grid-cols-2 gap-2">
            <select className="border rounded-xl px-3 py-2.5 text-[11px]" value={filters.species} onChange={e => updateFilter('species', e.target.value)}>{WOOD_SPECIES.map(s => <option key={s}>{s}</option>)}</select>
            <input className="border rounded-xl px-3 py-2.5 text-[11px]" placeholder="Village" value={filters.village} onChange={e => updateFilter('village', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[{id:'all',label:'All'},{id:'logs',label:'🪵 Logs'},{id:'cut_sizes',label:'📐 Cut Sizes'}].map(t => (
              <button key={t.id} onClick={() => updateFilter('product_type', t.id)} className={`py-2 rounded-full text-[10px] font-bold border ${filters.product_type===t.id?'bg-black text-white':'bg-white'}`}>{t.label}</button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[{id:'all',label:'All Roles'},{id:'seller',label:'Seller'},{id:'buyer',label:'Buyer Req'}].map(r => (
              <button key={r.id} onClick={() => updateFilter('user_role', r.id)} className={`py-2 rounded-full text-[10px] font-bold border ${filters.user_role===r.id?'bg-blue-600 text-white border-blue-600':'bg-white'}`}>{r.label}</button>
            ))}
          </div>

          <div className="border rounded-xl p-2.5 bg-amber-50/40">
            <p className="text-[10px] font-black">GIRTH FILTER - Mixed Girths Search</p>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              <select className="border rounded-lg px-2 py-2 text-[10px]" value={filters.girth_mode} onChange={e => updateFilter('girth_mode', e.target.value)}><option value="all">All Girth</option><option value="single">Single</option><option value="range">Range</option><option value="mixed">Mixed</option></select>
              <input className="border rounded-lg px-2 py-2 text-[10px]" placeholder="Min inch" value={filters.min_girth} onChange={e => updateFilter('min_girth', e.target.value)} />
              <input className="border rounded-lg px-2 py-2 text-[10px]" placeholder="Max inch" value={filters.max_girth} onChange={e => updateFilter('max_girth', e.target.value)} />
              <div className="bg-white border rounded-lg px-2 py-2 text-[9px] font-bold text-center">{filtered.filter(f => f.girth_mode==='mixed').length} Mixed</div>
            </div>
          </div>

          <div className="border rounded-xl p-2.5 bg-orange-50/40">
            <p className="text-[10px] font-black">LENGTH FILTER - Mixed Lengths</p>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              <select className="border rounded-lg px-2 py-2 text-[10px]" value={filters.length_mode} onChange={e => updateFilter('length_mode', e.target.value)}><option value="all">All Length</option><option value="single">Single</option><option value="range">Range</option><option value="mixed">Mixed</option></select>
              <input className="border rounded-lg px-2 py-2 text-[10px]" placeholder="Min ft" value={filters.min_length} onChange={e => updateFilter('min_length', e.target.value)} />
              <input className="border rounded-lg px-2 py-2 text-[10px]" placeholder="Max ft" value={filters.max_length} onChange={e => updateFilter('max_length', e.target.value)} />
              <div className="bg-white border rounded-lg px-2 py-2 text-[9px] font-bold text-center">{filtered.filter(f => f.length_mode==='mixed' || f.cut_length_mode==='mixed').length} Mixed</div>
            </div>
          </div>

          <div className="border rounded-xl p-2.5 bg-green-50/40">
            <p className="text-[10px] font-black">PRICE & BUDGET FILTER</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input type="number" className="border rounded-lg px-2 py-2 text-[11px]" placeholder="Min Price / CFT" value={filters.min_price} onChange={e => updateFilter('min_price', e.target.value)} />
              <input type="number" className="border rounded-lg px-2 py-2 text-[11px]" placeholder="Max Price / CFT" value={filters.max_price} onChange={e => updateFilter('max_price', e.target.value)} />
              <input type="number" className="border rounded-lg px-2 py-2 text-[11px]" placeholder="Min Budget (Buyer)" value={filters.min_budget} onChange={e => updateFilter('min_budget', e.target.value)} />
              <input type="number" className="border rounded-lg px-2 py-2 text-[11px]" placeholder="Max Budget (Buyer)" value={filters.max_budget} onChange={e => updateFilter('max_budget', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select className="border rounded-xl px-3 py-2.5 text-[11px]" value={filters.urgency} onChange={e => updateFilter('urgency', e.target.value)}><option>All</option><option>Normal</option><option>Urgent - Today</option><option>Within 3 Days</option><option>Within Week</option></select>
            <div className="bg-black text-white rounded-xl px-3 py-2.5 text-[11px] font-bold text-center">{filtered.length} Results Found</div>
          </div>
        </div>

        {/* RESULTS */}
        <div className="p-3">
          {loading ? <div className="py-10 text-center text-[12px]">Loading...</div> : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-bold text-[13px]">No Results - Try Clear Filters</p>
              <button onClick={clearFilters} className="mt-3 bg-black text-white px-5 py-2 rounded-full text-[11px] font-bold">Clear All Filters</button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map(l => (
                <Link key={l.listing_id} href={`/p/${l.listing_id}`} className="flex gap-2.5 border border-gray-100 rounded-[14px] overflow-hidden bg-white p-2">
                  <div className="w-[90px] h-[90px] bg-gray-50 rounded-[10px] overflow-hidden flex-shrink-0 relative">
                    {imagesMap[l.listing_id] ? <img src={imagesMap[l.listing_id]} alt={l.listing_id} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[18px]">🪵</div>}
                    {l.girth_mode === 'mixed' && <span className="absolute bottom-1 left-1 bg-amber-500 text-white text-[6px] px-1 py-0.5 rounded-full font-bold">MIXED G</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[11px] leading-tight truncate">{l.title || l.species}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{l.species} • {l.location_village}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {l.girth_mode === 'mixed' && <span className="bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.5 rounded-full font-bold">Mixed Girth: {l.mixed_girths_text || `${l.girth_min}-${l.girth_max}`}"</span>}
                      {l.length_mode === 'mixed' && <span className="bg-orange-100 text-orange-800 text-[8px] px-1.5 py-0.5 rounded-full font-bold">Mixed Length</span>}
                      {l.product_type === 'cut_sizes' && <span className="bg-blue-100 text-blue-800 text-[8px] px-1.5 py-0.5 rounded-full font-bold">{l.width}"W x {l.thickness}"T {l.width_mode === 'mixed' ? '(Mixed W)' : ''}</span>}
                    </div>
                    <div className="flex justify-between items-center mt-1.5">
                      <span className="text-[10px] font-bold">₹{l.unit_price || l.price}/{l.unit_type} {l.user_role === 'buyer' ? `Budget ₹${l.budget_min}-${l.budget_max}` : `Total ₹${l.total_price || ''}`}</span>
                      <span className="text-[8px] bg-black text-white px-2 py-0.5 rounded-full">{l.listing_id}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
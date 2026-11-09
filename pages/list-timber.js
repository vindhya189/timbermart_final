// pages/list-timber.js - List Timber - Pure English - DPDP Consent - Admin Approval - Get Location + DIGIPIN
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const WOOD_CATEGORIES = [
  { category: "Premium Hardwood - Teak / Sal / Rosewood", species: ["Teak Wood - Sagwan","Burma Teak - Original","CP Teak - Central Province","Nilambur Teak - Kerala","Karnataka Teak","Assam Teak","Godavari Teak","Sal Wood - Sakhu","Sheesham - Rosewood","Rosewood - Black Sheesham","Ebony - Karungali","Mahogany - Mahagani","Walnut - Akhrot","Padouk - Padauk","Wenge","Iroko","Bijasal","Haldu"] },
  { category: "Softwood - Pine / Deodar / Cedar", species: ["Pine Wood - Chir Pine","Deodar - Devadaru","Cedar - Devdar","Kail - Blue Pine","Spruce","Fir - Silver Fir","Cypress","Larch","Hollong","Hollock","Silver Oak - Silver Oak","Poplar - Populus","Kadamba - Kadam","Simul - Silk Cotton"] },
  { category: "Plantation - Eucalyptus / Subabul / Rubber", species: ["Eucalyptus - Nilagiri","Subabul - Leucaena","Acacia - Babool / Kikar","Rubber Wood","Casuarina - Casuarina","Ailanthus - Ailanthus","Melina - Gmelina","Neem Wood - Vepa","Mango Wood - Mamidi","Tamarind - Chinta","Jamun - Neredu","Jackfruit - Panasa","Coconut Wood - Kobbari","Palm Wood - Thati","Cashew Wood","Sesbania - Agise"] },
  { category: "North India - Khair / Shisham", species: ["Khair - Khair","Babul - Babool","Khejri","Shisham - UP Shisham","Siris - Siris","Kusum","Asna","Dhaura","Tendu - Tendu","Saja - Saja","Arjun - Arjuna","Karanj","Bamboo - Veduru"] },
  { category: "South India - Sandal / Gurjan", species: ["Sandalwood - Chandan","Red Sandal - Erra Chandan","Gurjan - Gurjan","Irul - Irul","Venteak - Venteak","Manjakadam","Thambakam","Punna","Aini - Aini","Matti - Matti","Nandi - Nandi","Benteak - Benteak","Anjili - Anjili","Kongu - Kongu","Pincoda","Maruthu - Maruthu"] },
  { category: "Exotic / Imported", species: ["American Walnut","White Oak - American","Red Oak - American","Maple - Maple","African Teak - Iroko","Merbau","Meranti - Red Meranti","Nyatoh","Keruing","Balau - Balau","Kapur - Kapur","Okoume - Okoume","Sapele - Sapele","Zebra Wood","Bubinga","Purpleheart","Jatoba","Cumaru","Tali"] },
  { category: "Plywood / Boards / Veneer", species: ["Plywood - Commercial MR","Plywood - BWR Waterproof","Plywood - BWP Marine","Plywood - Flexible / Flexi","Plywood - Shuttering / Film Faced","Block Board - Block Board","MDF - Medium Density Fibre","HDF - High Density Fibre","Particle Board - Particle","WPC Board - WPC","CenturyPly - Sainik 710","CenturyPly - Architect Ply","Greenply - Green Club","Greenply - Green Gold","Kitply - Kitply Gold","National Plywood","Duroply","Sarda Plywood","Anchor Plywood","Veneer - Teak Veneer","Veneer - Walnut Veneer","Veneer - Oak Veneer","Laminate - Sunmica"] },
  { category: "Bamboo / Cane / Others", species: ["Bamboo - Bambusa","Cane - Cane / Rattan","Betel Nut - Betel","Areca - Areca","Others - Others / Mix","Mixed Wood - Mixed Lot","Firewood - Firewood","Charcoal Wood"] }
];

const CUTTING_CATEGORIES = [
  { category: "Door & Frame Sizes", sizes: ["Door Frame 4x2.5 inch","Door Frame 5x2.5 inch","Door Frame 4x3 inch","Door Frame 6x2.5 inch","Door Shutter 7x3 ft","Door Shutter 7x2.5 ft","Door Shutter 6.5x3 ft","Door Shutter 7x4 ft - Double","Window Frame 4x2.5 inch","Window Frame 3x2.5 inch","Ventilator Frame 2x2 ft","Chowkat - Chowkat"] },
  { category: "Planks / Palalu", sizes: ["Plank 1 inch","Plank 1.5 inch","Plank 2 inch","Plank 2.5 inch","Plank 3 inch","Plank 4 inch Width","Plank 6 inch Width","Plank 8 inch Width","Plank 10 inch Width","Plank 12 inch Width","Palalu 6 ft Length","Palalu 7 ft Length","Palalu 8 ft Length","Palalu 10 ft Length","Palalu 12 ft Length"] },
  { category: "Battens / Reepers / Runners", sizes: ["Batten 2x1 inch","Batten 2x2 inch","Batten 3x2 inch","Batten 4x2 inch","Batten 4x3 inch","Reeper 2x1 inch","Reeper 3x1 inch","Runner 3x2 inch","Runner 4x2 inch","Patti 1x1 inch","Patti 2x1 inch","Square 2x2 inch","Square 3x3 inch","Square 4x4 inch"] },
  { category: "Beams / Joists / Sleepers", sizes: ["Beam 4x4 inch","Beam 4x6 inch","Beam 6x6 inch","Beam 6x8 inch","Beam 8x8 inch","Joist 4x3 inch","Joist 5x3 inch","Joist 6x4 inch","Rafter 4x2 inch","Purlin 4x3 inch","Sleeper 8x6 ft - Railway","Sleeper 5x4 ft","Sleeper 6x5 ft","Pole 10 ft","Pole 12 ft","Pole 15 ft","Pole 20 ft"] },
  { category: "Furniture Sizes", sizes: ["Cot Frame 6x3 ft - Single","Cot Frame 6x4 ft - Double","Cot Frame 6x5 ft - King","Table Top 3x2 ft","Table Top 4x2 ft","Table Top 6x3 ft","Dining Table 5x3 ft","Chair Leg 18 inch","Chair Back 24 inch","Sofa Frame 6 ft","Wardrobe 6x3 ft","Cupboard 6x4 ft"] },
  { category: "Plywood Sizes - All India Standard", sizes: ["Plywood 8x4 ft - 6mm","Plywood 8x4 ft - 9mm","Plywood 8x4 ft - 12mm","Plywood 8x4 ft - 16mm","Plywood 8x4 ft - 18mm","Plywood 8x4 ft - 25mm","Plywood 7x3 ft - 12mm","Plywood 7x4 ft - 18mm","Plywood 6x4 ft - 12mm","Plywood 6x3 ft - 9mm","Block Board 8x4 ft - 19mm","Block Board 7x3 ft - 19mm","MDF 8x4 ft - 8mm","MDF 8x4 ft - 12mm","MDF 8x4 ft - 18mm","MDF 8x4 ft - 25mm","Particle Board 8x4 ft - 12mm","Particle Board 8x4 ft - 18mm","WPC 8x4 ft - 18mm","WPC 8x4 ft - 25mm","Flexi Plywood 8x4 ft - 6mm","Flexi Plywood 8x4 ft - 9mm","Shuttering Ply 8x4 ft - 12mm","Shuttering Ply 8x4 ft - 18mm"] },
  { category: "Custom / Mixed Cutting", sizes: ["Mixed Cut Sizes - Mixed","Custom Size - As per Order","Log Cutting - As per Requirement","Sawn Sizes - Sawn","Rough Sawn - Rough","Dressed / Planed - Dressed","Finger Joint - Finger Joint"] }
];

const PLYWOOD_BRANDS = ["CenturyPly - Sainik 710 (BWP)","CenturyPly - Architect Ply (BWR)","CenturyPly - Club Prime","Greenply - Green Club 700","Greenply - Green Gold","Greenply - Green Platinum","Kitply - Kitply Gold","Kitply - Kitply Vista","National Plywood - National Gold","Duroply - Duro Green","Sarda - Sarda Gold","Anchor - Anchor Gold","Merino - Merino Ply","Austin Plywood - Austin Gold","Uniteply - Uniteply"];
const PLYWOOD_TYPES = ["MR - Moisture Resistant","BWR - Boiling Water Resistant","BWP - Boiling Water Proof / Marine","Flexible Plywood - Bendable","Film Faced Shuttering - Black Film","Commercial Ply - General","Calibrated Ply - Calibrated","Gurjan Ply - Gurjan Face","Teak Ply - Teak Face"];

export default function ListTimber() {
  const [role, setRole] = useState('seller');
  const [productType, setProductType] = useState('logs');
  const [species, setSpecies] = useState('Teak Wood - Sagwan');
  const [cutSize, setCutSize] = useState('');
  const [plyBrand, setPlyBrand] = useState('');
  const [plyType, setPlyType] = useState('');
  const [logsCount, setLogsCount] = useState('');
  const [pieces, setPieces] = useState('');
  const [cft, setCft] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unitType, setUnitType] = useState('CFT');
  const [village, setVillage] = useState('Anakapalle');
  const [district, setDistrict] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [girthMode, setGirthMode] = useState('single');
  const [girth, setGirth] = useState('');
  const [girthMin, setGirthMin] = useState('');
  const [girthMax, setGirthMax] = useState('');
  const [mixedGirths, setMixedGirths] = useState('');
  const [lengthMode, setLengthMode] = useState('single');
  const [lengthFt, setLengthFt] = useState('');
  const [mixedLengths, setMixedLengths] = useState('');
  const [widthMode, setWidthMode] = useState('single');
  const [width, setWidth] = useState('');
  const [mixedWidths, setMixedWidths] = useState('');
  const [thickness, setThickness] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [digipin, setDigipin] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    const p = localStorage.getItem('timber_phone');
    const v = localStorage.getItem('timber_village');
    if (p) setWhatsapp(p);
    if (v) setVillage(v);
  }, []);

  useEffect(() => {
    const count = logsCount || pieces || '';
    let t = '';
    if (productType === 'logs') {
      if (count && species) t = `${count} ${species.split(' - ')[0]} Logs ${girthMode === 'mixed' ? 'Mixed Girth' : girth ? girth + ' inch' : ''}`;
    } else {
      if (species) t = `${species.split(' - ')[0]} ${cutSize || 'Cut Sizes'} ${count ? count + ' pcs' : ''}`;
    }
    setTitle(t.trim());
  }, [species, logsCount, pieces, girth, girthMode, productType, cutSize]);

  const totalPrice = unitPrice && cft ? (Number(unitPrice) * Number(cft)).toFixed(0) : unitPrice && (logsCount || pieces) ? (Number(unitPrice) * Number(logsCount || pieces)).toFixed(0) : '';
  const isPlywood = species.toLowerCase().includes('plywood') || species.toLowerCase().includes('mdf') || species.toLowerCase().includes('block board') || species.toLowerCase().includes('particle') || species.toLowerCase().includes('wpc') || species.toLowerCase().includes('centuryply') || species.toLowerCase().includes('greenply') || species.toLowerCase().includes('kitply');

  const generateDigipin = (la, lo) => {
    const chars = '23456789CFGHJMPQRVWX';
    let code = ''; let v = Math.abs(la * 100000 + lo * 1000);
    for (let i = 0; i < 10; i++) { code += chars[Math.floor(v % chars.length)]; v = Math.floor(v / chars.length) + (la + lo) * 100; if (i === 2 || i === 5) code += '-'; }
    return code.slice(0, 12).toUpperCase();
  };

  const getLocation = () => {
    if (!navigator.geolocation) { alert('Location is not supported on this device'); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude;
      setLat(la.toFixed(6)); setLng(lo.toFixed(6));
      const pin = generateDigipin(la, lo); setDigipin(pin);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}`);
        const d = await r.json();
        if (d.address?.village || d.address?.town || d.address?.suburb) setVillage(d.address.village || d.address.town || d.address.suburb);
        if (d.address?.state_district) setDistrict(d.address.state_district);
      } catch {}
      setLocLoading(false);
    }, () => { setLocLoading(false); alert('Please allow location access'); }, { enableHighAccuracy: true });
  };

  const handlePublish = async () => {
    if (!species || !whatsapp || whatsapp.length < 10 || !village || !unitPrice) { alert('Please fill Species, Village, WhatsApp Number and Price'); return; }
    if (images.length === 0) { alert('Please upload at least 1 photo'); return; }
    if (!consent) { alert('Please accept the Privacy Policy to continue'); return; }
    setLoading(true);
    try {
      const listingId = 'TM-' + Math.random().toString(36).substring(2, 6).toUpperCase() + Math.floor(Math.random() * 90 + 10);
      const { error } = await supabase.from('listings').insert([{
        listing_id: listingId, title: title || `${species} - ${village}`, species, product_type: productType, user_role: role,
        logs_count: logsCount ? Number(logsCount) : null, pieces: pieces ? Number(pieces) : null, cft: cft ? Number(cft) : null,
        unit_price: Number(unitPrice), unit_type: unitType, total_price: totalPrice ? Number(totalPrice) : null,
        location_village: village, location_district: district, whatsapp_number: whatsapp,
        girth_mode: girthMode, girth_inch: girth ? Number(girth) : null, girth_min: girthMin ? Number(girthMin) : null, girth_max: girthMax ? Number(girthMax) : null,
        mixed_girths_text: mixedGirths, length_mode: lengthMode, length_ft: lengthFt ? Number(lengthFt) : null,
        mixed_lengths_text: mixedLengths, width_mode: widthMode, width: width, mixed_widths_text: mixedWidths,
        thickness: thickness, cut_size: cutSize, plywood_brand: plyBrand, plywood_type: plyType,
        latitude: lat ? Number(lat) : null, longitude: lng ? Number(lng) : null, digipin: digipin || null,
        status: 'pending', is_verified: false, is_premium: false, expiry_days: 10,
        consent_given: true, consent_at: new Date().toISOString(), consent_version: 'DPDP-2023-v1'
      }]);
      if (error) throw error;
      for (let i = 0; i < images.length; i++) {
        const file = images[i]; const fileName = `${Date.now()}_${i}_${file.name}`;
        await supabase.storage.from('timber-images').upload(`${listingId}/${fileName}`, file);
        const { data } = supabase.storage.from('timber-images').getPublicUrl(`${listingId}/${fileName}`);
        await supabase.from('listing_images').insert([{ listing_id: listingId, image_url: data.publicUrl }]);
      }
      localStorage.setItem('timber_phone', whatsapp); localStorage.setItem('timber_village', village);
      alert(`Submitted for Admin Approval. ID: ${listingId}`);
      window.location.href = `/profile`;
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex justify-center"><div className="w-full max-w-[480px] min-h-screen pb-6">
      <div className="bg-black text-white px-4 py-3 flex justify-between items-center sticky top-0 z-20"><Link href="/" className="text-[12px] font-bold">← HOME</Link><p className="font-black text-[14px]">LIST TIMBER</p><span className="bg-white text-black px-3 py-1 rounded-full text-[11px] font-bold">{images.length}/3</span></div>
      <div className="px-4 pt-4">

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3">
          <p className="text-[11px] font-bold text-yellow-800">Admin approval is required</p>
          <p className="text-[10px] text-yellow-700 mt-0.5">Your listing will be live after admin approval.</p>
        </div>

        <div className="bg-[#f2f2f2] rounded-full p-1 flex"><button onClick={() => setRole('seller')} className={`flex-1 py-3 rounded-full text-[12px] font-bold ${role === 'seller' ? 'bg-black text-white' : 'text-gray-600'}`}>SELLER</button><button onClick={() => setRole('buyer')} className={`flex-1 py-3 rounded-full text-[12px] font-bold ${role === 'buyer' ? 'bg-black text-white' : 'text-gray-600'}`}>BUYER</button></div>
        <div className="flex gap-2 mt-3"><button onClick={() => setProductType('logs')} className={`flex-1 py-3 rounded-xl text-[12px] font-bold border ${productType === 'logs' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white'}`}>Logs - Round</button><button onClick={() => setProductType('cut_sizes')} className={`flex-1 py-3 rounded-xl text-[12px] font-bold border ${productType === 'cut_sizes' ? 'bg-black text-white' : 'bg-white'}`}>Cut Sizes</button></div>

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title - Example: 30 Teak Logs, Mixed Girth" className="w-full border rounded-xl px-3 py-3 text-[13px] mt-4" />
        <select value={species} onChange={e => setSpecies(e.target.value)} className="w-full border rounded-xl px-3 py-3 text-[13px] mt-3 bg-white"><option value="">Select Wood Species</option>{WOOD_CATEGORIES.map(cat => (<optgroup key={cat.category} label={cat.category}>{cat.species.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>))}</select>

        {isPlywood && <div className="grid grid-cols-2 gap-2 mt-3"><select value={plyBrand} onChange={e => setPlyBrand(e.target.value)} className="border rounded-xl px-3 py-3 text-[12px] bg-white"><option value="">Plywood Brand</option>{PLYWOOD_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}</select><select value={plyType} onChange={e => setPlyType(e.target.value)} className="border rounded-xl px-3 py-3 text-[12px] bg-white"><option value="">Plywood Type</option>{PLYWOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>}
        {productType === 'cut_sizes' && <select value={cutSize} onChange={e => setCutSize(e.target.value)} className="w-full border rounded-xl px-3 py-3 text-[13px] mt-3 bg-white"><option value="">Select Cutting Size</option>{CUTTING_CATEGORIES.map(cat => (<optgroup key={cat.category} label={cat.category}>{cat.sizes.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>))}</select>}

        <div className="grid grid-cols-2 gap-2 mt-3"><input value={logsCount} onChange={e => setLogsCount(e.target.value)} type="number" placeholder={productType === 'logs' ? "Number of Logs" : "Number of Pieces"} className="border rounded-xl px-3 py-3 text-[13px]" /><input value={cft} onChange={e => setCft(e.target.value)} type="number" placeholder="Total CFT" className="border rounded-xl px-3 py-3 text-[13px]" /></div>
        <div className="grid grid-cols-2 gap-2 mt-2"><input value={unitPrice} onChange={e => setUnitPrice(e.target.value)} type="number" placeholder="Price" className="border rounded-xl px-3 py-3 text-[13px]" /><select value={unitType} onChange={e => setUnitType(e.target.value)} className="border rounded-xl px-3 py-3 text-[13px] bg-white"><option value="CFT">Per CFT</option><option value="Piece">Per Piece</option><option value="SqFt">Per SqFt</option><option value="Kg">Per Kg</option><option value="Ton">Per Ton</option></select></div>
        {totalPrice && <p className="text-right text-[12px] font-bold mt-1">Total ₹{totalPrice}</p>}

        {productType === 'logs' && <>
          <div className="flex gap-2 mt-4"><button onClick={() => setGirthMode('single')} className={`flex-1 py-2.5 rounded-full text-[11px] font-bold ${girthMode === 'single' ? 'bg-black text-white' : 'bg-[#f2f2f2]'}`}>Single Girth</button><button onClick={() => setGirthMode('range')} className={`flex-1 py-2.5 rounded-full text-[11px] font-bold ${girthMode === 'range' ? 'bg-black text-white' : 'bg-[#f2f2f2]'}`}>Range</button><button onClick={() => setGirthMode('mixed')} className={`flex-1 py-2.5 rounded-full text-[11px] font-bold ${girthMode === 'mixed' ? 'bg-black text-white' : 'bg-[#f2f2f2]'}`}>Mixed</button></div>
          {girthMode === 'single' && <input value={girth} onChange={e => setGirth(e.target.value)} type="number" placeholder="Girth in inch - Example: 36" className="w-full border rounded-xl px-3 py-3 text-[13px] mt-2" />}
          {girthMode === 'range' && <div className="grid grid-cols-2 gap-2 mt-2"><input value={girthMin} onChange={e => setGirthMin(e.target.value)} type="number" placeholder="Min Girth" className="border rounded-xl px-3 py-3 text-[13px]" /><input value={girthMax} onChange={e => setGirthMax(e.target.value)} type="number" placeholder="Max Girth" className="border rounded-xl px-3 py-3 text-[13px]" /></div>}
          {girthMode === 'mixed' && <input value={mixedGirths} onChange={e => setMixedGirths(e.target.value)} placeholder="Mixed Girths - Example: 16-18, 20-22, 30+" className="w-full border rounded-xl px-3 py-3 text-[13px] mt-2" />}
        </>}

        <div className="flex gap-2 mt-4"><button onClick={() => setLengthMode('single')} className={`flex-1 py-2.5 rounded-full text-[11px] font-bold ${lengthMode === 'single' ? 'bg-black text-white' : 'bg-[#f2f2f2]'}`}>Single Length</button><button onClick={() => setLengthMode('mixed')} className={`flex-1 py-2.5 rounded-full text-[11px] font-bold ${lengthMode === 'mixed' ? 'bg-black text-white' : 'bg-[#f2f2f2]'}`}>Mixed Length</button></div>
        {lengthMode === 'single' ? <input value={lengthFt} onChange={e => setLengthFt(e.target.value)} type="number" placeholder="Length in ft - Example: 8" className="w-full border rounded-xl px-3 py-3 text-[13px] mt-2" /> : <input value={mixedLengths} onChange={e => setMixedLengths(e.target.value)} placeholder="Mixed Lengths - Example: 6, 8, 10 ft" className="w-full border rounded-xl px-3 py-3 text-[13px] mt-2" />}

        {productType === 'cut_sizes' && <>
          <div className="flex gap-2 mt-4"><button onClick={() => setWidthMode('single')} className={`flex-1 py-2.5 rounded-full text-[11px] font-bold ${widthMode === 'single' ? 'bg-black text-white' : 'bg-[#f2f2f2]'}`}>Single Width</button><button onClick={() => setWidthMode('mixed')} className={`flex-1 py-2.5 rounded-full text-[11px] font-bold ${widthMode === 'mixed' ? 'bg-black text-white' : 'bg-[#f2f2f2]'}`}>Mixed Width</button></div>
          {widthMode === 'single' ? <input value={width} onChange={e => setWidth(e.target.value)} placeholder="Width - Example: 6 inch" className="w-full border rounded-xl px-3 py-3 text-[13px] mt-2" /> : <input value={mixedWidths} onChange={e => setMixedWidths(e.target.value)} placeholder="Mixed Widths - Example: 4, 6, 8 inch" className="w-full border rounded-xl px-3 py-3 text-[13px] mt-2" />}
          <input value={thickness} onChange={e => setThickness(e.target.value)} placeholder="Thickness - Example: 2 inch / 18mm" className="w-full border rounded-xl px-3 py-3 text-[13px] mt-2" />
        </>}

        {/* LOCATION + GET LOCATION + DIGIPIN */}
        <div className="grid grid-cols-2 gap-2 mt-4"><input value={village} onChange={e => setVillage(e.target.value)} placeholder="Village / Town" className="border rounded-xl px-3 py-3 text-[13px]" /><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp Number" className="border rounded-xl px-3 py-3 text-[13px]" /></div>
        <button onClick={getLocation} className="w-full mt-2 bg-blue-50 border border-blue-200 rounded-xl py-3 text-[12px] font-bold text-blue-700">{locLoading ? 'Getting Location...' : 'Get My Location'}</button>
        {digipin && <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-3 flex justify-between"><div><p className="text-[11px] font-bold">DIGIPIN: {digipin}</p><p className="text-[10px] text-gray-500">{lat}, {lng} • {village} {district ? `• ${district}` : ''}</p></div><span className="text-green-600 font-bold">✓</span></div>}

        {/* PHOTOS */}
        <div className="border border-dashed rounded-xl p-4 mt-4 text-center"><input type="file" multiple accept="image/*" onChange={e => setImages(Array.from(e.target.files).slice(0, 3))} className="text-[12px]" /><p className="text-[11px] text-gray-500 mt-1">{images.length}/3 Photos</p>{images.length > 0 && <div className="flex gap-2 mt-2 justify-center">{images.map((f, i) => (<img key={i} src={URL.createObjectURL(f)} className="w-16 h-16 object-cover rounded-lg" />))}</div>}</div>

        {/* DPDP CONSENT - REQUIRED */}
        <label className="flex gap-2 mt-4 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-[11px] text-gray-600 leading-snug">I agree to the <button type="button" onClick={() => setShowPrivacy(true)} className="text-blue-600 underline font-bold">Privacy Policy</button> and consent to the processing of my name, phone, location, and listing data as per the DPDP Act, 2023.</span>
        </label>

        <button onClick={handlePublish} disabled={loading} className="w-full bg-black text-white rounded-full py-4 font-bold text-[13px] mt-5">{loading ? 'Submitting...' : productType === 'logs' ? `Submit for Approval - ${girthMode === 'single' ? 'Single Girth' : girthMode === 'range' ? 'Range Girth' : 'Mixed Girth'}` : `Submit for Approval - ${cutSize || 'Custom'}`}</button>
        <p className="text-center text-[10px] text-gray-400 mt-2">Your listing will be live after admin approval</p>
      </div>

      {/* PRIVACY - SHORT VIEW */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowPrivacy(false)}>
          <div className="bg-white w-full max-w-[480px] max-h-[85vh] overflow-y-auto rounded-t-[24px] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between"><p className="font-black text-[16px]">Privacy Policy</p><button onClick={() => setShowPrivacy(false)} className="w-8 h-8 bg-[#f2f2f2] rounded-full">✕</button></div>
            <div className="text-[12px] leading-relaxed text-gray-700 space-y-3 mt-4">
              <p><b>1. Data We Collect.</b> Name, phone, village, location (latitude, longitude, DIGIPIN), listing photos, and listing details.</p>
              <p><b>2. Purpose.</b> To display your listing and connect buyers and sellers.</p>
              <p><b>3. Consent - DPDP Act 2023.</b> By posting, you give free, specific, and informed consent. You can withdraw consent by deleting your listing or contacting timbermartapp@gmail.com.</p>
              <p><b>4. Data Sharing.</b> Your phone number is shown only on the listing detail page. DIGIPIN is not shown on listing cards. We do not sell your data.</p>
              <p><b>5. Your Rights.</b> You can access, correct, or delete your data from Profile.</p>
              <p><b>6. Contact.</b> timbermartapp@gmail.com</p>
            </div>
            <button onClick={() => setShowPrivacy(false)} className="w-full bg-black text-white rounded-full py-3 font-bold text-[13px] mt-5">Close</button>
          </div>
        </div>
      )}
    </div></div>
  );
}
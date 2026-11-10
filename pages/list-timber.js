import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import TreeLoader from '../components/TreeLoader';

// COMPLETE WOOD SPECIES
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

const PLYWOOD_BRANDS = [
  "CenturyPly - Sainik 710 (BWP)","CenturyPly - Architect Ply (BWR)","CenturyPly - Club Prime","Greenply - Green Club 700","Greenply - Green Gold","Greenply - Green Platinum","Kitply - Kitply Gold","Kitply - Kitply Vista","National Plywood - National Gold","Duroply - Duro Green","Sarda - Sarda Gold","Anchor - Anchor Gold","Merino - Merino Ply","Austin Plywood - Austin Gold","Uniteply - Uniteply"
];

const PLYWOOD_TYPES = [
  "MR - Moisture Resistant","BWR - Boiling Water Resistant","BWP - Boiling Water Proof / Marine","Flexible Plywood - Bendable","Film Faced Shuttering - Black Film","Commercial Ply - General","Calibrated Ply - Calibrated","Gurjan Ply - Gurjan Face","Teak Ply - Teak Face"
];

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

  const [title, setTitle] = useState('');

  // Complete address
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [village, setVillage] = useState('');
  const [mandal, setMandal] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('Andhra Pradesh');
  const [pincode, setPincode] = useState('');

  // Authenticated user profile
  const [userId, setUserId] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  // Girth
  const [girthMode, setGirthMode] = useState('single');
  const [girth, setGirth] = useState('');
  const [girthMin, setGirthMin] = useState('');
  const [girthMax, setGirthMax] = useState('');
  const [mixedGirths, setMixedGirths] = useState('');

  // Length
  const [lengthMode, setLengthMode] = useState('single');
  const [length, setLength] = useState('');
  const [lengthMin, setLengthMin] = useState('');
  const [lengthMax, setLengthMax] = useState('');
  const [mixedLengths, setMixedLengths] = useState('');

  // Width
  const [widthMode, setWidthMode] = useState('single');
  const [width, setWidth] = useState('');
  const [widthMin, setWidthMin] = useState('');
  const [widthMax, setWidthMax] = useState('');
  const [mixedWidths, setMixedWidths] = useState('');

  // Thickness
  const [thicknessMode, setThicknessMode] = useState('single');
  const [thickness, setThickness] = useState('');
  const [thicknessMin, setThicknessMin] = useState('');
  const [thicknessMax, setThicknessMax] = useState('');
  const [mixedThickness, setMixedThickness] = useState('');

  // Cut length
  const [cutLengthMode, setCutLengthMode] = useState('single');
  const [cutLength, setCutLength] = useState('');
  const [cutLengthMin, setCutLengthMin] = useState('');
  const [cutLengthMax, setCutLengthMax] = useState('');
  const [mixedCutLengths, setMixedCutLengths] = useState('');

  const [urgency, setUrgency] = useState('Normal');
  const [requirementType, setRequirementType] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const [photos, setPhotos] = useState([]);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [digipin, setDigipin] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
    const inputClass =
    "w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white outline-none focus:border-amber-600";

 // Load registered phone from authenticated Supabase session
useEffect(() => {
  let active = true;

  async function loadProfile() {
    setProfileLoading(true);
    setProfileError('');

    try {
      // Get currently logged-in Supabase user
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error('Please login again.');
      }

      // Fetch profile using authenticated user ID
      const { data: profile, error } = await supabase
        .from('users_profile')
        .select('id, phone, location')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (!profile || !profile.phone) {
        throw new Error('Registered phone number not found in profile.');
      }

      if (active) {
        setUserId(profile.id);
        setWhatsapp(String(profile.phone));

        if (profile.location) {
          setVillage(profile.location);
        }
      }
    } catch (error) {
      console.error('Profile loading error:', error);

      if (active) {
        setProfileError(error.message || 'Unable to load registered profile.');
      }
    } finally {
      if (active) {
        setProfileLoading(false);
      }
    }
  }

  loadProfile();

  return () => {
    active = false;
  };
}, []);
  // Automatically generate listing title
  useEffect(() => {
    const count = logsCount || pieces || '';
    let generatedTitle = '';

    if (productType === 'logs') {
      generatedTitle =
        `${count} ${species.split(' - ')[0]} Logs ` +
        (girthMode === 'mixed'
          ? 'Mixed Girth'
          : girth
            ? `${girth} inch`
            : '');
    } else {
      generatedTitle =
        `${species.split(' - ')[0]} ${cutSize || 'Cut Sizes'} ` +
        (count ? `${count} pieces` : '');
    }

    setTitle(generatedTitle.trim());
  }, [
    species,
    logsCount,
    pieces,
    girth,
    girthMode,
    productType,
    cutSize
  ]);

  // Calculate total price
  const totalPrice =
    unitPrice && cft
      ? (Number(unitPrice) * Number(cft)).toFixed(0)
      : unitPrice && (logsCount || pieces)
        ? (
            Number(unitPrice) *
            Number(logsCount || pieces)
          ).toFixed(0)
        : '';

  const isPlywood =
    /plywood|mdf|block board|particle|wpc|centuryply|greenply|kitply/i.test(
      species
    );

  // DIGIPIN-like code generator
  // Note: This is not the official Government DIGIPIN encoder.
  const generateDigipin = (la, lo) => {
    const chars = '23456789CFGHJMPQRVWX';
    let code = '';
    let value = Math.abs(la * 100000 + lo * 1000);

    for (let i = 0; i < 10; i++) {
      code += chars[Math.floor(value % chars.length)];
      value = Math.floor(value / chars.length) + (la + lo) * 100;

      if (i === 2 || i === 5) {
        code += '-';
      }
    }

    return code.slice(0, 12).toUpperCase();
  };

  // Get GPS location and address
  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('Location is not supported on this device.');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const la = position.coords.latitude;
        const lo = position.coords.longitude;

        setLatitude(la.toFixed(6));
        setLongitude(lo.toFixed(6));
        setDigipin(generateDigipin(la, lo));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${la}&lon=${lo}`
          );

          if (!response.ok) {
            throw new Error('Address lookup failed');
          }

          const result = await response.json();
          const a = result.address || {};

          setHouseNumber(a.house_number || '');

          setStreet(
            a.road ||
            a.neighbourhood ||
            a.suburb ||
            ''
          );

          setVillage(
            a.village ||
            a.town ||
            a.city ||
            a.suburb ||
            ''
          );

          setMandal(
            a.county ||
            a.municipality ||
            ''
          );

          setDistrict(
            a.state_district ||
            a.district ||
            ''
          );

          setStateName(a.state || 'Andhra Pradesh');
          setPincode(a.postcode || '');

          alert('GPS location captured successfully.');
        } catch (error) {
          alert('GPS captured. Please enter your full address manually.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        alert('Location permission allow cheyyandi.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000
      }
    );
  };

  // Select listing photos
  const handlePhotoChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length > 3) {
      alert('Maximum 3 photos only.');
      e.target.value = '';
      return;
    }

    const invalidFile = selectedFiles.find(
      file => !file.type.startsWith('image/')
    );

    if (invalidFile) {
      alert('Images matrame upload cheyyandi.');
      e.target.value = '';
      return;
    }

    setPhotos(selectedFiles);
  };

  // Remove selected photo
  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };
    // Publish listing
  const handlePublish = async () => {
    if (profileLoading) {
      alert('Please wait. Loading your registered profile.');
      return;
    }

    if (!userId || !whatsapp) {
      alert(profileError || 'Please login again.');
      return;
    }

    if (
      !houseNumber.trim() ||
      !street.trim() ||
      !village.trim() ||
      !mandal.trim() ||
      !district.trim() ||
      !stateName.trim() ||
      !/^\d{6}$/.test(pincode)
    ) {
      alert('Please enter complete address and valid 6-digit PIN code.');
      return;
    }

    if (!species || !unitPrice || Number(unitPrice) <= 0) {
      alert('Please select wood species and enter a valid price.');
      return;
    }

    if (photos.length === 0) {
      alert('Please upload at least one photo.');
      return;
    }

    if (!consent) {
      alert('Please accept the Privacy Policy.');
      return;
    }

    setLoading(true);
    let listingId = '';

    try {
    
// Verify registered profile using authenticated Supabase user ID
const {
  data: { user },
  error: authError
} = await supabase.auth.getUser();

if (authError) throw authError;

if (!user) {
  throw new Error('Please login again.');
}

if (String(user.id) !== String(userId)) {
  throw new Error('Account changed. Please refresh and login again.');
}

const { data: profile, error: profileError } = await supabase
  .from('users_profile')
  .select('id, phone')
  .eq('id', user.id)
  .single();

if (profileError) throw profileError;

if (!profile || !profile.phone) {
  throw new Error('Registered phone number not found in users_profile.');
}

const registeredPhone = String(profile.phone).trim();


      const fullAddress = [
        houseNumber.trim(),
        street.trim(),
        village.trim(),
        mandal.trim(),
        district.trim(),
        stateName.trim(),
        pincode.trim()
      ].join(', ');

      listingId =
        'TM-' +
        Math.random().toString(36).substring(2, 6).toUpperCase() +
        Math.floor(Math.random() * 90 + 10);

      const count = logsCount || pieces;

      const listing = {
        listing_id: listingId,
        title: title || `${species} - ${village}`,
        species,
        quantity: count
          ? `${count} ${productType === 'logs' ? 'Logs' : 'Pieces'}`
          : null,

        price: String(unitPrice),
        unit_price: Number(unitPrice),
        unit_type: unitType,
        total_price: totalPrice ? Number(totalPrice) : null,

        product_type: productType,
        user_role: role,

        logs_count: logsCount ? Number(logsCount) : null,
        pieces: pieces ? Number(pieces) : null,
        cft: cft ? Number(cft) : null,

        
        

        
        
        location_pincode: pincode.trim(),
        full_address: fullAddress,

        whatsapp_number: registeredPhone,
        user_id: profile.id,

        girth_mode: girthMode,
        girth_inch: girth || null,
        girth_min: girthMin || null,
        girth_max: girthMax || null,
        mixed_girths_text: mixedGirths || null,

        length_mode: lengthMode,
        length_ft: length || null,
        length_min: lengthMin || null,
        length_max: lengthMax || null,
        mixed_lengths_text: mixedLengths || null,

        width_mode: widthMode,
        width: width || null,
        width_min: widthMin || null,
        width_max: widthMax || null,
        mixed_widths_text: mixedWidths || null,

        thickness_mode: thicknessMode,
        thickness: thickness || null,
        thickness_min: thicknessMin || null,
        thickness_max: thicknessMax || null,
        mixed_thickness_text: mixedThickness || null,

        cut_length_mode: cutLengthMode,
        cut_length: cutLength || null,
        cut_length_min: cutLengthMin || null,
        cut_length_max: cutLengthMax || null,
        mixed_cut_lengths_text: mixedCutLengths || null,

        cut_size: cutSize || null,
        plywood_brand: plyBrand || null,
        plywood_type: plyType || null,

        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        digipin: digipin || null,

        status: 'pending',
        is_verified: false,
        is_premium: false,
        expiry_days: 10,

        consent_given: true,
        consent_at: new Date().toISOString(),
        consent_version: 'DPDP-2023-v1'
      };

      const { error: insertError } = await supabase
        .from('listings')
        .insert([listing]);

      if (insertError) throw insertError;

      // Upload listing photos
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];

        const cleanName = file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        );

        const fileName =
          `${listingId}/${Date.now()}_${i}_${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from('timber-images')
          .upload(fileName, file, {
            upsert: false,
            contentType: file.type || 'application/octet-stream'
          });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('timber-images')
          .getPublicUrl(fileName);

        const { error: imageError } = await supabase
          .from('listing_images')
          .insert([{
            listing_id: listingId,
            image_url: publicData.publicUrl
          }]);

        if (imageError) throw imageError;
      }

      alert(
        `Listing submitted for admin approval. Listing ID: ${listingId}`
      );

      window.location.href = '/profile';

    } catch (error) {
      console.error('Listing submission error:', error);

      alert(
        `Listing submission failed: ${error.message || 'Unknown error'}`
      );

    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
  return (
    <TreeLoader
      message="Growing your TimberMart listing..."
      fullScreen={true}
    />
  );
}
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen bg-white pb-10">

        {/* HEADER */}
        <div className="bg-black text-white px-4 py-4 flex justify-between items-center sticky top-0 z-20">
          <Link href="/" className="text-xs font-bold">
            ← HOME
          </Link>

          <p className="font-black text-sm">LIST TIMBER</p>

          <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold">
            {photos.length}/3
          </span>
        </div>

        <div className="p-4">

          {/* ADMIN APPROVAL */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
            <p className="text-xs font-bold text-yellow-800">
              Admin approval is required
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Your listing will be visible after admin approval.
            </p>
          </div>

          {/* REGISTERED PHONE */}
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-700">
              Registered WhatsApp Number
            </label>

            <input
              value={profileLoading ? 'Loading...' : whatsapp}
              readOnly
              className={`${inputClass} mt-2 bg-gray-100`}
            />

            {profileError && (
              <p className="text-xs text-red-600 mt-1">
                {profileError}
              </p>
            )}
          </div>

          {/* ROLE */}
          <label className="text-xs font-bold">Select Role</label>

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setRole('seller')}
              className={`flex-1 p-3 rounded-xl border font-bold text-sm ${
                role === 'seller'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              SELLER
            </button>

            <button
              type="button"
              onClick={() => setRole('buyer')}
              className={`flex-1 p-3 rounded-xl border font-bold text-sm ${
                role === 'buyer'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              BUYER
            </button>
          </div>

          {/* PRODUCT TYPE */}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setProductType('logs')}
              className={`flex-1 p-3 rounded-xl border text-sm font-bold ${
                productType === 'logs'
                  ? 'bg-amber-100 border-amber-500'
                  : 'bg-white'
              }`}
            >
              Logs - Round
            </button>

            <button
              type="button"
              onClick={() => setProductType('cut_sizes')}
              className={`flex-1 p-3 rounded-xl border text-sm font-bold ${
                productType === 'cut_sizes'
                  ? 'bg-amber-100 border-amber-500'
                  : 'bg-white'
              }`}
            >
              Cut Sizes
            </button>
          </div>

          {/* TITLE */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Listing title"
            className={`${inputClass} mt-4`}
          />

          {/* SPECIES */}
          <label className="block text-xs font-bold mt-4 mb-2">
            Wood Species
          </label>

          <select
            value={species}
            onChange={e => setSpecies(e.target.value)}
            className={inputClass}
          >
            <option value="">Select Wood Species</option>

            {WOOD_CATEGORIES.map(cat => (
              <optgroup key={cat.category} label={cat.category}>
                {cat.species.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* PLYWOOD DETAILS */}
          {isPlywood && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <select
                value={plyBrand}
                onChange={e => setPlyBrand(e.target.value)}
                className={inputClass}
              >
                <option value="">Plywood Brand</option>
                {PLYWOOD_BRANDS.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <select
                value={plyType}
                onChange={e => setPlyType(e.target.value)}
                className={inputClass}
              >
                <option value="">Plywood Type</option>
                {PLYWOOD_TYPES.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          )}

          {/* CUT SIZE */}
          {productType === 'cut_sizes' && (
            <select
              value={cutSize}
              onChange={e => setCutSize(e.target.value)}
              className={`${inputClass} mt-4`}
            >
              <option value="">Select Cutting Size</option>

              {CUTTING_CATEGORIES.map(cat => (
                <optgroup key={cat.category} label={cat.category}>
                  {cat.sizes.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
                    {/* LOGS / PIECES */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label className="block text-xs font-bold mb-2">
                Number of Logs
              </label>
              <input
                type="number"
                min="0"
                value={logsCount}
                onChange={e => setLogsCount(e.target.value)}
                placeholder="Enter logs"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-2">
                Number of Pieces
              </label>
              <input
                type="number"
                min="0"
                value={pieces}
                onChange={e => setPieces(e.target.value)}
                placeholder="Enter pieces"
                className={inputClass}
              />
            </div>
          </div>

          {/* GIRTH */}
          <h3 className="font-bold text-sm mt-5 mb-2">Girth Details</h3>

          <select
            value={girthMode}
            onChange={e => setGirthMode(e.target.value)}
            className={inputClass}
          >
            <option value="single">Single Girth</option>
            <option value="range">Girth Range</option>
            <option value="mixed">Mixed Girths</option>
          </select>

          {girthMode === 'single' && (
            <input
              value={girth}
              onChange={e => setGirth(e.target.value)}
              placeholder="Girth in inches"
              className={`${inputClass} mt-2`}
            />
          )}

          {girthMode === 'range' && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                value={girthMin}
                onChange={e => setGirthMin(e.target.value)}
                placeholder="Minimum girth"
                className={inputClass}
              />
              <input
                value={girthMax}
                onChange={e => setGirthMax(e.target.value)}
                placeholder="Maximum girth"
                className={inputClass}
              />
            </div>
          )}

          {girthMode === 'mixed' && (
            <textarea
              value={mixedGirths}
              onChange={e => setMixedGirths(e.target.value)}
              placeholder="Example: 10, 12, 14, 16 inches"
              className={`${inputClass} mt-2`}
            />
          )}

          {/* LENGTH */}
          <h3 className="font-bold text-sm mt-5 mb-2">Length Details</h3>

          <select
            value={lengthMode}
            onChange={e => setLengthMode(e.target.value)}
            className={inputClass}
          >
            <option value="single">Single Length</option>
            <option value="range">Length Range</option>
            <option value="mixed">Mixed Lengths</option>
          </select>

          {lengthMode === 'single' && (
            <input
              value={length}
              onChange={e => setLength(e.target.value)}
              placeholder="Length in feet"
              className={`${inputClass} mt-2`}
            />
          )}

          {lengthMode === 'range' && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                value={lengthMin}
                onChange={e => setLengthMin(e.target.value)}
                placeholder="Minimum length"
                className={inputClass}
              />
              <input
                value={lengthMax}
                onChange={e => setLengthMax(e.target.value)}
                placeholder="Maximum length"
                className={inputClass}
              />
            </div>
          )}

          {lengthMode === 'mixed' && (
            <textarea
              value={mixedLengths}
              onChange={e => setMixedLengths(e.target.value)}
              placeholder="Example: 6, 8, 10, 12 feet"
              className={`${inputClass} mt-2`}
            />
          )}

          {/* WIDTH */}
          <h3 className="font-bold text-sm mt-5 mb-2">Width Details</h3>

          <select
            value={widthMode}
            onChange={e => setWidthMode(e.target.value)}
            className={inputClass}
          >
            <option value="single">Single Width</option>
            <option value="range">Width Range</option>
            <option value="mixed">Mixed Widths</option>
          </select>

          {widthMode === 'single' && (
            <input
              value={width}
              onChange={e => setWidth(e.target.value)}
              placeholder="Width in inches"
              className={`${inputClass} mt-2`}
            />
          )}

          {widthMode === 'range' && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                value={widthMin}
                onChange={e => setWidthMin(e.target.value)}
                placeholder="Minimum width"
                className={inputClass}
              />
              <input
                value={widthMax}
                onChange={e => setWidthMax(e.target.value)}
                placeholder="Maximum width"
                className={inputClass}
              />
            </div>
          )}

          {widthMode === 'mixed' && (
            <textarea
              value={mixedWidths}
              onChange={e => setMixedWidths(e.target.value)}
              placeholder="Example: 2, 3, 4 inches"
              className={`${inputClass} mt-2`}
            />
          )}

          {/* THICKNESS */}
          <h3 className="font-bold text-sm mt-5 mb-2">
            Thickness Details
          </h3>

          <select
            value={thicknessMode}
            onChange={e => setThicknessMode(e.target.value)}
            className={inputClass}
          >
            <option value="single">Single Thickness</option>
            <option value="range">Thickness Range</option>
            <option value="mixed">Mixed Thickness</option>
          </select>

          {thicknessMode === 'single' && (
            <input
              value={thickness}
              onChange={e => setThickness(e.target.value)}
              placeholder="Thickness in inches"
              className={`${inputClass} mt-2`}
            />
          )}

          {thicknessMode === 'range' && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                value={thicknessMin}
                onChange={e => setThicknessMin(e.target.value)}
                placeholder="Minimum thickness"
                className={inputClass}
              />
              <input
                value={thicknessMax}
                onChange={e => setThicknessMax(e.target.value)}
                placeholder="Maximum thickness"
                className={inputClass}
              />
            </div>
          )}

          {thicknessMode === 'mixed' && (
            <textarea
              value={mixedThickness}
              onChange={e => setMixedThickness(e.target.value)}
              placeholder="Enter mixed thicknesses"
              className={`${inputClass} mt-2`}
            />
          )}

          {/* CUT LENGTH */}
          <h3 className="font-bold text-sm mt-5 mb-2">
            Cut Length Details
          </h3>

          <select
            value={cutLengthMode}
            onChange={e => setCutLengthMode(e.target.value)}
            className={inputClass}
          >
            <option value="single">Single Cut Length</option>
            <option value="range">Cut Length Range</option>
            <option value="mixed">Mixed Cut Lengths</option>
          </select>

          {cutLengthMode === 'single' && (
            <input
              value={cutLength}
              onChange={e => setCutLength(e.target.value)}
              placeholder="Cut length in feet"
              className={`${inputClass} mt-2`}
            />
          )}

          {cutLengthMode === 'range' && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                value={cutLengthMin}
                onChange={e => setCutLengthMin(e.target.value)}
                placeholder="Minimum cut length"
                className={inputClass}
              />
              <input
                value={cutLengthMax}
                onChange={e => setCutLengthMax(e.target.value)}
                placeholder="Maximum cut length"
                className={inputClass}
              />
            </div>
          )}

          {cutLengthMode === 'mixed' && (
            <textarea
              value={mixedCutLengths}
              onChange={e => setMixedCutLengths(e.target.value)}
              placeholder="Enter mixed cut lengths"
              className={`${inputClass} mt-2`}
            />
          )}

          {/* QUANTITY AND PRICE */}
          <h3 className="font-bold text-sm mt-5 mb-2">
            Quantity and Price
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-2">
                CFT
              </label>
              <input
                type="number"
                min="0"
                value={cft}
                onChange={e => setCft(e.target.value)}
                placeholder="CFT"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-2">
                Unit
              </label>
              <select
                value={unitType}
                onChange={e => setUnitType(e.target.value)}
                className={inputClass}
              >
                <option value="CFT">CFT</option>
                <option value="Piece">Piece</option>
                <option value="Ton">Ton</option>
                <option value="Kg">Kg</option>
                <option value="Sheet">Sheet</option>
              </select>
            </div>
          </div>

          <label className="block text-xs font-bold mt-3 mb-2">
            Price per Unit (₹)
          </label>
          <input
            type="number"
            min="0"
            value={unitPrice}
            onChange={e => setUnitPrice(e.target.value)}
            placeholder="Enter price"
            className={inputClass}
          />

          {totalPrice && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3">
              <p className="text-xs text-green-700">Estimated Total Price</p>
              <p className="font-black text-lg text-green-800">
                ₹{Number(totalPrice).toLocaleString('en-IN')}
              </p>
            </div>
          )}

          {/* URGENCY */}
          <label className="block text-xs font-bold mt-5 mb-2">
            Urgency
          </label>
          <select
            value={urgency}
            onChange={e => setUrgency(e.target.value)}
            className={inputClass}
          >
            <option value="Normal">Normal</option>
            <option value="Urgent">Urgent</option>
            <option value="Very Urgent">Very Urgent</option>
          </select>

          {/* BUYER REQUIREMENT */}
          {role === 'buyer' && (
            <div className="mt-4">
              <label className="block text-xs font-bold mb-2">
                Requirement Type
              </label>
              <select
                value={requirementType}
                onChange={e => setRequirementType(e.target.value)}
                className={inputClass}
              >
                <option value="">Select Requirement</option>
                <option value="Immediate Purchase">Immediate Purchase</option>
                <option value="Regular Requirement">Regular Requirement</option>
                <option value="Future Requirement">Future Requirement</option>
              </select>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <input
                  type="number"
                  value={budgetMin}
                  onChange={e => setBudgetMin(e.target.value)}
                  placeholder="Minimum budget ₹"
                  className={inputClass}
                />
                <input
                  type="number"
                  value={budgetMax}
                  onChange={e => setBudgetMax(e.target.value)}
                  placeholder="Maximum budget ₹"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* COMPLETE ADDRESS */}
          <div className="border-t mt-6 pt-5">
            <h3 className="font-black text-base">Complete Address</h3>
            <p className="text-xs text-gray-500 mt-1">
              Enter your timber location details.
            </p>

            <button
              type="button"
              onClick={getLocation}
              disabled={loading}
              className="w-full mt-3 p-3 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-50"
            >
              {loading ? 'Getting Location...' : '📍 Get GPS Location'}
            </button>

            <div className="grid grid-cols-2 gap-3 mt-4">
            
            </div>

            <input
              value={village}
              onChange={e => setVillage(e.target.value)}
              placeholder="Village / Town / City"
              className={`${inputClass} mt-3`}
            />

            <input
              value={mandal}
              onChange={e => setMandal(e.target.value)}
              placeholder="Mandal"
              className={`${inputClass} mt-3`}
            />

            <input
              value={district}
              onChange={e => setDistrict(e.target.value)}
              placeholder="District"
              className={`${inputClass} mt-3`}
            />

            <input
              value={stateName}
              onChange={e => setStateName(e.target.value)}
              placeholder="State"
              className={`${inputClass} mt-3`}
            />

            <input
              value={pincode}
              onChange={e => setPincode(e.target.value)}
              placeholder="6-digit PIN Code"
              maxLength={6}
              inputMode="numeric"
              className={`${inputClass} mt-3`}
            />

            {latitude && longitude && (
              <div className="bg-blue-50 rounded-xl p-3 mt-3 text-xs">
                <p>Latitude: {latitude}</p>
                <p>Longitude: {longitude}</p>
                <p>DIGIPIN: {digipin}</p>
              </div>
            )}
          </div>

          {/* PHOTOS */}
          <div className="mt-6">
            <h3 className="font-bold text-sm mb-2">
              Upload Timber Photos
            </h3>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="w-full border border-gray-300 rounded-xl p-3 text-xs"
            />

            <p className="text-xs text-gray-500 mt-1">
              Maximum 3 photos.
            </p>

            <div className="grid grid-cols-3 gap-2 mt-3">
              {photos.map((photo, index) => (
                <div key={`${photo.name}-${index}`} className="relative">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Timber ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* PRIVACY CONSENT */}
          <div className="bg-gray-50 border rounded-xl p-3 mt-6">
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-1"
              />

              <span>
                I agree to share my listing details, registered contact
                number and location with TimberMart for marketplace
                services. I accept the Privacy Policy.
              </span>
            </label>
          </div>

          {/* SUBMIT */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={loading || profileLoading || !userId}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl py-4 mt-6 disabled:opacity-50"
          >
            {loading
              ? 'SUBMITTING...'
              : profileLoading
                ? 'LOADING PROFILE...'
                : 'SUBMIT LISTING'}
          </button>

          <p className="text-center text-xs text-gray-500 mt-3">
            Your listing will be submitted for admin approval.
          </p>

        </div>
      </div>
    </div>
  );
}
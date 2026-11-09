
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

// ---------------------------------------------
// BUSINESS ROLES
// ---------------------------------------------

const ROLES = [
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

const TYPES = [
  { id: 'PRODUCT', label: 'Sell Product', icon: '🪵' },
  { id: 'REQUIREMENT', label: 'Buy Requirement', icon: '🔍' },
  { id: 'SERVICE', label: 'Offer Service', icon: '🛠️' },
  { id: 'JOB', label: 'Job / Work', icon: '👷' },
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

const SPECIES = [
  'Teak',
  'Rosewood',
  'Sal',
  'Neem',
  'Mango',
  'Red Sanders',
  'Pine',
  'Eucalyptus',
  'Bamboo',
  'Other',
];

const initialForm = {
  role: '',
  listingType: '',
  category: '',
  title: '',
  species: '',
  description: '',
  quantity: '',
  unit: 'CFT',
  girth: '',
  length: '',
  width: '',
  thickness: '',
  quality: '',
  priceType: 'NEGOTIABLE',
  price: '',
  budgetMin: '',
  budgetMax: '',
  location: '',
  district: '',
  state: 'Andhra Pradesh',
  contact: '',
  experience: '',
  salary: '',
  jobType: 'FULL_TIME',
  delivery: '',
  latitude: '',
  longitude: '',
};

// ---------------------------------------------
// REUSABLE INPUT COMPONENTS
// Keep outside DynamicListing to preserve focus
// ---------------------------------------------

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}) => (
  <label className="block">
    <span className="text-sm font-bold text-gray-700">
      {label} {required ? '*' : ''}
    </span>

    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || label}
      className="w-full border rounded-xl p-3 mt-1 outline-none focus:border-green-700"
    />
  </label>
);

const Select = ({
  label,
  value,
  onChange,
  options,
}) => (
  <label className="block">
    <span className="text-sm font-bold text-gray-700">
      {label}
    </span>

    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border rounded-xl p-3 mt-1 bg-white"
    >
      <option value="">Select {label}</option>

      {options.map(item => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  </label>
);

// ---------------------------------------------
// MAIN PAGE
// ---------------------------------------------

export default function DynamicListing() {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [registeredPhone, setRegisteredPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  const [selectedImages, setSelectedImages] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const availableTypes = ROLE_PERMISSIONS[form.role] || [];

  const isProduct = form.listingType === 'PRODUCT';
  const isRequirement = form.listingType === 'REQUIREMENT';
  const isService = form.listingType === 'SERVICE';
  const isJob = form.listingType === 'JOB';

  // ---------------------------------------------
  // UPDATE FORM
  // ---------------------------------------------

  const update = (key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // ---------------------------------------------
  // LOAD REGISTERED PHONE
  // ---------------------------------------------

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.user) {
          if (active) {
            setMessage('Please login first.');
            setProfileLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from('users_profile')
          .select('phone, name')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        if (active) {
          setRegisteredPhone(data?.phone || '');
          setProfileLoading(false);
        }
      } catch (error) {
        console.error('Profile loading error:', error);

        if (active) {
          setMessage(
            error.message || 'Unable to load registered mobile number.'
          );
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  // ---------------------------------------------
  // IMAGE SELECTION
  // ---------------------------------------------

  const handleImageSelect = event => {
    const files = Array.from(event.target.files || []);

    const validFiles = files.filter(file =>
      file.type.startsWith('image/')
    );

    if (validFiles.length !== files.length) {
      setMessage('Please select image files only.');
    } else {
      setMessage('');
    }

    const newImages = validFiles.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedImages(prev => [
      ...prev,
      ...newImages,
    ]);

    // Allow selecting same file again
    event.target.value = '';
  };

  const removeImage = id => {
    setSelectedImages(prev => {
      const image = prev.find(item => item.id === id);

      if (image?.preview) {
        URL.revokeObjectURL(image.preview);
      }

      return prev.filter(item => item.id !== id);
    });
  };

  // ---------------------------------------------
  // UPLOAD PHOTOS TO SUPABASE STORAGE
  // ---------------------------------------------

  const uploadListingImages = async userId => {
    if (selectedImages.length < 1) {
      throw new Error(
        'Please upload at least one listing photo.'
      );
    }

    const uploadedUrls = [];

    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i].file;

      if (!file || !file.type.startsWith('image/')) {
        throw new Error('Invalid image selected.');
      }

      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      );

      const filePath =
        `${userId}/${Date.now()}-${i}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('timber-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        throw new Error(
          `Photo upload failed: ${file.name}. ${uploadError.message}`
        );
      }

      const { data } = supabase.storage
        .from('timber-images')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error(
          'Unable to generate photo URL.'
        );
      }

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  // ---------------------------------------------
  // GET MY LOCATION
  // ---------------------------------------------

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      setMessage(
        'GPS is not supported by this browser.'
      );
      return;
    }

    setLocationLoading(true);
    setMessage('');

    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          update('latitude', String(latitude));
          update('longitude', String(longitude));

          const url =
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;

          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(
              'Unable to fetch address from GPS.'
            );
          }

          const result = await response.json();
          const address = result.address || {};

          const village =
            address.village ||
            address.town ||
            address.city ||
            address.suburb ||
            address.hamlet ||
            address.neighbourhood ||
            '';

          const district =
            address.state_district ||
            address.county ||
            address.city_district ||
            '';

          const state =
            address.state || 'Andhra Pradesh';

          const pincode = address.postcode || '';

          const fullAddress = [
            village,
            district,
            state,
            pincode,
          ]
            .filter(Boolean)
            .join(', ');

          update(
            'location',
            fullAddress || result.display_name || ''
          );

          update('district', district);
          update('state', state);

          setMessage(
            'Location detected successfully. Please verify the address.'
          );
        } catch (error) {
          console.error('Address lookup error:', error);

          setMessage(
            'GPS captured, but address lookup failed. Enter address manually.'
          );
        } finally {
          setLocationLoading(false);
        }
      },

      error => {
        console.error('GPS error:', error);

        setLocationLoading(false);

        if (error.code === 1) {
          setMessage(
            'Please allow location permission in your browser.'
          );
        } else if (error.code === 2) {
          setMessage(
            'Your location is unavailable. Try again.'
          );
        } else {
          setMessage(
            'Location request timed out. Try again.'
          );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  // ---------------------------------------------
  // VALIDATION
  // ---------------------------------------------

  const validate = () => {
    if (!form.role) {
      return 'Please select your business role.';
    }

    if (!form.listingType) {
      return 'Please select listing type.';
    }

    if (!availableTypes.includes(form.listingType)) {
      return 'This listing type is not allowed for your role.';
    }

    if (!form.category) {
      return 'Please select category.';
    }

    if (!form.title.trim()) {
      return 'Please enter listing title.';
    }

    if (!form.description.trim()) {
      return 'Please enter description.';
    }

    if (!form.location.trim()) {
      return 'Please enter location.';
    }

    if (!registeredPhone) {
      return 'Registered mobile number not found. Please update your profile.';
    }

    if (selectedImages.length < 1) {
      return 'Please upload at least one listing photo.';
    }

    if (
      (isProduct || isRequirement) &&
      !form.species
    ) {
      return 'Please select timber species.';
    }

    if (
      (isProduct || isRequirement) &&
      (!form.quantity || Number(form.quantity) <= 0)
    ) {
      return 'Please enter a valid quantity.';
    }

    if (
      isProduct &&
      form.priceType === 'FIXED' &&
      (!form.price || Number(form.price) < 0)
    ) {
      return 'Please enter product price.';
    }

    if (
      isRequirement &&
      form.priceType === 'FIXED' &&
      !form.budgetMin &&
      !form.budgetMax
    ) {
      return 'Please enter your budget.';
    }

    if (
      isService &&
      !form.experience
    ) {
      return 'Please enter your experience.';
    }

    if (
      isJob &&
      !form.salary.trim()
    ) {
      return 'Please enter salary/payment details.';
    }

    return '';
  };

  // ---------------------------------------------
  // SUBMIT LISTING
  // ---------------------------------------------

  const submitListing = async () => {
    const validation = validate();

    if (validation) {
      setMessage(validation);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Get login session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token || !session?.user?.id) {
        throw new Error(
          'Please login first to submit your listing.'
        );
      }

      // Upload every selected photo first
      setMessage(
        `Uploading ${selectedImages.length} photo(s)...`
      );

      const imageUrls = await uploadListingImages(
        session.user.id
      );

      if (imageUrls.length < 1) {
        throw new Error(
          'At least one photo must be uploaded.'
        );
      }

      // Submit listing with uploaded image URLs
      setMessage('Submitting your listing...');

      const response = await fetch(
        '/api/dynamic-listings',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            ...form,
            images: imageUrls,
            contact: registeredPhone,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          result.message ||
          'Unable to submit listing.'
        );
      }

      alert(
        'Listing submitted successfully! Waiting for admin approval.'
      );

      // Clear local image previews
      selectedImages.forEach(image => {
        URL.revokeObjectURL(image.preview);
      });

      router.push('/profile');

    } catch (error) {
      console.error('Dynamic listing error:', error);

      setMessage(
        error.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------
  // CATEGORY OPTIONS
  // ---------------------------------------------

  const categoryOptions =
    isProduct || isRequirement
      ? [
          'Timber Logs',
          'Cut Sizes',
          'Plywood',
          'Bamboo',
          'Other',
        ]
      : isService
        ? [
            'Carpentry',
            'Wood Cutting',
            'Furniture Making',
            'Polishing',
            'Other',
          ]
        : isJob
          ? [
              'Carpenter Job',
              'Sawmill Worker',
              'Helper',
              'Machine Operator',
              'Other',
            ]
          : [];

  // ---------------------------------------------
  // PAGE UI
  // ---------------------------------------------

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl p-5 shadow-sm">

        {/* HEADER */}
        <header className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-bold"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-black text-green-800 mt-3">
            TimberMart Listing Engine
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            One platform. Four listing types. Ten business roles.
          </p>
        </header>

        {/* PROGRESS */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${
                step >= n
                  ? 'bg-green-700'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* STEP 1: ROLE AND TYPE */}
        {step === 1 && (
          <section className="space-y-5">

            <h2 className="font-black text-lg">
              1. Select your role
            </h2>

            <Select
              label="Business Role"
              value={form.role}
              onChange={value => {
                update('role', value);
                update('listingType', '');
                update('category', '');
                setMessage('');
              }}
              options={ROLES}
            />

            <h2 className="font-black text-lg">
              What do you want to do?
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {TYPES
                .filter(item =>
                  availableTypes.includes(item.id)
                )
                .map(item => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      update('listingType', item.id);
                      update('category', '');
                      setMessage('');
                    }}
                    className={`border-2 rounded-xl p-4 text-left ${
                      form.listingType === item.id
                        ? 'border-green-700 bg-green-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <span className="text-2xl">
                      {item.icon}
                    </span>

                    <p className="font-bold text-sm mt-2">
                      {item.label}
                    </p>
                  </button>
                ))}
            </div>

            <Select
              label="Category"
              value={form.category}
              onChange={value =>
                update('category', value)
              }
              options={categoryOptions}
            />

            <button
              type="button"
              onClick={() => {
                if (
                  !form.role ||
                  !form.listingType ||
                  !form.category
                ) {
                  setMessage(
                    'Select role, listing type and category.'
                  );
                  return;
                }

                setMessage('');
                setStep(2);
              }}
              className="w-full bg-green-700 text-white rounded-xl p-3 font-bold"
            >
              Continue →
            </button>
          </section>
        )}

        {/* STEP 2: LISTING DETAILS */}
        {step === 2 && (
          <section className="space-y-4">

            <h2 className="font-black text-lg">
              2. Listing Details
            </h2>

            <Field
              label="Listing Title"
              value={form.title}
              onChange={value =>
                update('title', value)
              }
              required
            />

            {/* PRODUCT AND REQUIREMENT */}
            {(isProduct || isRequirement) && (
              <>
                <Select
                  label="Timber Species"
                  value={form.species}
                  onChange={value =>
                    update('species', value)
                  }
                  options={SPECIES}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Quantity"
                    type="number"
                    value={form.quantity}
                    onChange={value =>
                      update('quantity', value)
                    }
                  />

                  <Select
                    label="Unit"
                    value={form.unit}
                    onChange={value =>
                      update('unit', value)
                    }
                    options={[
                      'CFT',
                      'TONS',
                      'PIECES',
                      'LOGS',
                      'LOADS',
                    ]}
                  />
                </div>

                <h3 className="font-bold">
                  Measurements (Optional)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Girth (inch)"
                    type="number"
                    value={form.girth}
                    onChange={value =>
                      update('girth', value)
                    }
                  />

                  <Field
                    label="Length (feet)"
                    type="number"
                    value={form.length}
                    onChange={value =>
                      update('length', value)
                    }
                  />

                  <Field
                    label="Width (inch)"
                    type="number"
                    value={form.width}
                    onChange={value =>
                      update('width', value)
                    }
                  />

                  <Field
                    label="Thickness (inch)"
                    type="number"
                    value={form.thickness}
                    onChange={value =>
                      update('thickness', value)
                    }
                  />
                </div>

                <Field
                  label="Quality / Grade"
                  value={form.quality}
                  onChange={value =>
                    update('quality', value)
                  }
                />

                <Select
                  label="Price Type"
                  value={form.priceType}
                  onChange={value =>
                    update('priceType', value)
                  }
                  options={[
                    'FIXED',
                    'NEGOTIABLE',
                    'CONTACT_FOR_PRICE',
                  ]}
                />

                {isProduct &&
                  form.priceType === 'FIXED' && (
                    <Field
                      label="Selling Price (₹)"
                      type="number"
                      value={form.price}
                      onChange={value =>
                        update('price', value)
                      }
                    />
                  )}

                {isRequirement &&
                  form.priceType === 'FIXED' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Minimum Budget (₹)"
                        type="number"
                        value={form.budgetMin}
                        onChange={value =>
                          update('budgetMin', value)
                        }
                      />

                      <Field
                        label="Maximum Budget (₹)"
                        type="number"
                        value={form.budgetMax}
                        onChange={value =>
                          update('budgetMax', value)
                        }
                      />
                    </div>
                  )}
              </>
            )}

            {/* SERVICE FIELDS */}
            {isService && (
              <>
                <Field
                  label="Experience (Years)"
                  type="number"
                  value={form.experience}
                  onChange={value =>
                    update('experience', value)
                  }
                />

                <Field
                  label="Service Charges (Optional ₹)"
                  type="number"
                  value={form.price}
                  onChange={value =>
                    update('price', value)
                  }
                />
              </>
            )}

            {/* JOB FIELDS */}
            {isJob && (
              <>
                <Select
                  label="Job Type"
                  value={form.jobType}
                  onChange={value =>
                    update('jobType', value)
                  }
                  options={[
                    'FULL_TIME',
                    'PART_TIME',
                    'CONTRACT',
                    'DAILY_WAGE',
                  ]}
                />

                <Field
                  label="Salary / Payment Details"
                  value={form.salary}
                  onChange={value =>
                    update('salary', value)
                  }
                />
              </>
            )}

            {/* DESCRIPTION */}
            <label className="block">
              <span className="text-sm font-bold">
                Description *
              </span>

              <textarea
                rows={4}
                value={form.description}
                onChange={e =>
                  update('description', e.target.value)
                }
                className="w-full border rounded-xl p-3 mt-1"
                placeholder="Enter complete details..."
              />
            </label>

            {/* PHOTO UPLOAD */}
            <div className="border-2 border-dashed border-green-600 rounded-xl p-4 space-y-3">

              <div>
                <h3 className="font-black text-gray-800">
                  📸 Listing Photos *
                </h3>

                <p className="text-xs text-gray-600 mt-1">
                  Upload at least one photo. You can select multiple photos.
                </p>
              </div>

              <label className="block cursor-pointer">
                <span className="block text-center bg-green-700 text-white rounded-xl p-3 font-bold">
                  + Add Photos
                </span>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>

              <p className="text-sm font-semibold text-green-800">
                {selectedImages.length} photo(s) selected
              </p>

              {selectedImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedImages.map(image => (
                    <div
                      key={image.id}
                      className="relative border rounded-xl overflow-hidden"
                    >
                      <img
                        src={image.preview}
                        alt="Selected listing"
                        className="w-full h-32 object-cover"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(image.id)
                        }
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500">
                You can add more photos or remove selected photos before submitting.
              </p>
            </div>

            {/* STEP 2 NAVIGATION */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMessage('');
                  setStep(1);
                }}
                className="flex-1 border rounded-xl p-3 font-bold"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => {
                  if (
                    !form.title.trim() ||
                    !form.description.trim()
                  ) {
                    setMessage(
                      'Enter title and description.'
                    );
                    return;
                  }

                  if (selectedImages.length < 1) {
                    setMessage(
                      'Please upload at least one listing photo.'
                    );
                    return;
                  }

                  setMessage('');
                  setStep(3);
                }}
                className="flex-1 bg-green-700 text-white rounded-xl p-3 font-bold"
              >
                Continue →
              </button>
            </div>
          </section>
        )}

        {/* STEP 3: LOCATION AND CONTACT */}
        {step === 3 && (
          <section className="space-y-4">

            <h2 className="font-black text-lg">
              3. Location & Contact
            </h2>

            {/* GET MY LOCATION */}
            <button
              type="button"
              onClick={getMyLocation}
              disabled={locationLoading}
              className="w-full bg-blue-700 text-white rounded-xl p-3 font-bold disabled:opacity-50"
            >
              {locationLoading
                ? 'Detecting Location...'
                : '📍 Get My Location'}
            </button>

            <p className="text-xs text-gray-500">
              Allow browser location permission to automatically detect your address.
            </p>

            {/* ADDRESS */}
            <Field
              label="Village / City"
              value={form.location}
              onChange={value =>
                update('location', value)
              }
            />

            <Field
              label="District"
              value={form.district}
              onChange={value =>
                update('district', value)
              }
            />

            <Field
              label="State"
              value={form.state}
              onChange={value =>
                update('state', value)
              }
            />

            {form.latitude && form.longitude && (
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs font-bold text-green-800">
                  GPS coordinates captured
                </p>

                <p className="text-xs text-green-700 mt-1">
                  Latitude: {form.latitude}
                </p>

                <p className="text-xs text-green-700">
                  Longitude: {form.longitude}
                </p>
              </div>
            )}

            {/* REGISTERED PHONE */}
            <div className="border rounded-xl p-3 bg-gray-50">
              <p className="text-sm font-bold">
                Registered Mobile Number
              </p>

              <p className="mt-1 text-green-800 font-semibold">
                {profileLoading
                  ? 'Loading registered number...'
                  : registeredPhone || 'Number not found'}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Your registered mobile number will be used for this listing.
              </p>
            </div>

            <Field
              label="Delivery Location (Optional)"
              value={form.delivery}
              onChange={value =>
                update('delivery', value)
              }
            />

            <div className="bg-yellow-50 p-3 rounded-xl text-sm text-yellow-900">
              Your listing will be submitted for admin review. It will become publicly visible only after approval.
            </div>

            {/* STEP 3 NAVIGATION */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  setMessage('');
                }}
                className="flex-1 border rounded-xl p-3 font-bold"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => {
                  const error = validate();

                  if (error) {
                    setMessage(error);
                    return;
                  }

                  setMessage('');
                  setPreview(true);
                }}
                className="flex-1 bg-black text-white rounded-xl p-3 font-bold"
              >
                Preview Listing
              </button>
            </div>
          </section>
        )}

        {/* ERROR / STATUS MESSAGE */}
        {message && (
          <p className="text-sm font-semibold mt-4 text-red-600">
            {message}
          </p>
        )}

        {/* PREVIEW */}
        {preview && (
          <div className="mt-6 border-2 border-green-700 rounded-xl p-4 space-y-2">

            <h2 className="font-black text-xl">
              Listing Preview
            </h2>

            <p className="text-sm">
              <b>Business Role:</b> {form.role}
            </p>

            <p className="text-sm">
              <b>Listing Type:</b> {form.listingType}
            </p>

            <p className="text-sm">
              <b>Category:</b> {form.category}
            </p>

            <p className="text-sm">
              <b>Title:</b> {form.title}
            </p>

            <p className="text-sm">
              <b>Species:</b> {form.species || '-'}
            </p>

            <p className="text-sm">
              <b>Quantity:</b> {form.quantity} {form.unit}
            </p>

            <p className="text-sm">
              <b>Price Type:</b> {form.priceType}
            </p>

            <p className="text-sm">
              <b>Price:</b> {form.price || '-'}
            </p>

            <p className="text-sm">
              <b>Location:</b> {form.location}
            </p>

            <p className="text-sm">
              <b>District:</b> {form.district}
            </p>

            <p className="text-sm">
              <b>State:</b> {form.state}
            </p>

            <p className="text-sm">
              <b>Registered Phone:</b> {registeredPhone}
            </p>

            <p className="text-sm">
              <b>Photos:</b> {selectedImages.length}
            </p>

            <div className="grid grid-cols-3 gap-2 mt-3">
              {selectedImages.map(image => (
                <img
                  key={image.id}
                  src={image.preview}
                  alt="Listing preview"
                  className="w-full h-20 object-cover rounded-lg"
                />
              ))}
            </div>

            <p className="text-sm mt-3">
              <b>Description:</b> {form.description}
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={submitListing}
              className="w-full bg-green-700 text-white rounded-xl p-3 mt-5 font-bold disabled:opacity-50"
            >
              {loading
                ? 'Uploading Photos & Submitting...'
                : 'Submit for Admin Approval'}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setPreview(false);
                setMessage('');
              }}
              className="w-full border rounded-xl p-3 mt-2 font-bold disabled:opacity-50"
            >
              Edit Listing
            </button>
          </div>
        )}

      </div>
    </main>
  );
}

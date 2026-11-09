// FILE: pages/profile.js
// COMPLETE TIMBERMART PROFILE PAGE WITH PREMIUM PROMOTION POPUP

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import TreeLoader from '../components/TreeLoader';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Profile() {
  const router = useRouter();
  const fileRef = useRef(null);

  const [user, setUser] = useState(null);
  const [premiumPromptListing, setPremiumPromptListing] = useState(null);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    photo_url: ''
  });

  const [listings, setListings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('listings');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [removingFavId, setRemovingFavId] = useState(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const totalViews = listings.reduce(
    (total, item) => total + Number(item.views_count || 0),
    0
  );

  useEffect(() => {
    loadProfile();
  }, []);

  // LOAD PROFILE, LISTINGS AND FAVORITES
  async function loadProfile() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData?.user) {
        router.replace('/login');
        return;
      }

      const currentUser = authData.user;
      setUser(currentUser);

      const { data: profileData, error: profileError } =
        await supabase
          .from('users_profile')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

      if (profileError) throw profileError;

      setProfile({
        name:
          profileData?.name ||
          currentUser.user_metadata?.name ||
          '',
        email: currentUser.email || profileData?.email || '',
        phone: profileData?.phone || '',
        location: profileData?.location || '',
        photo_url: profileData?.photo_url || ''
      });

      const { data: myListings, error: listingError } =
        await supabase
          .from('listings')
          .select('*, listing_images(image_url)')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

      if (listingError) throw listingError;

      setListings(myListings || []);

      await migrateOldFavorites(currentUser.id);
      await loadFavorites(currentUser.id);

    } catch (err) {
      console.error('Profile loading error:', err);
      setError(err.message || 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  }

  // MIGRATE OLD LOCAL FAVORITES
  async function migrateOldFavorites(userId) {
    try {
      if (typeof window === 'undefined') return;

      const oldSaved = JSON.parse(
        localStorage.getItem('timber_saved') || '[]'
      );

      if (!Array.isArray(oldSaved) || oldSaved.length === 0) return;

      const rows = oldSaved
        .filter(item => item?.listing_id)
        .map(item => ({
          user_id: userId,
          listing_id: String(item.listing_id)
        }));

      if (!rows.length) return;

      const { error: migrationError } = await supabase
        .from('favourites')
        .upsert(rows, {
          onConflict: 'user_id,listing_id',
          ignoreDuplicates: true
        });

      if (migrationError) {
        console.error('Favorites migration error:', migrationError);
        return;
      }

      localStorage.removeItem('timber_saved');

    } catch (err) {
      console.error('Favorites migration failed:', err);
    }
  }

  // LOAD FAVORITES
  async function loadFavorites(userId) {
    try {
      const { data: favoriteRows, error: favoriteError } =
        await supabase
          .from('favourites')
          .select('id, listing_id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

      if (favoriteError) throw favoriteError;

      const rows = favoriteRows || [];

      if (!rows.length) {
        setFavorites([]);
        return;
      }

      const favoriteIds = rows.map(item =>
        String(item.listing_id)
      );

      const { data: favoriteListings, error: listingsError } =
        await supabase
          .from('listings')
          .select('*, listing_images(image_url)')
          .in('listing_id', favoriteIds);

      if (listingsError) throw listingsError;

      const listingMap = new Map(
        (favoriteListings || []).map(item => [
          String(item.listing_id),
          item
        ])
      );

      const combined = rows
        .map(item => ({
          ...item,
          listing: listingMap.get(String(item.listing_id))
        }))
        .filter(item => item.listing);

      setFavorites(combined);

    } catch (err) {
      console.error('Favorites loading error:', err);
      setFavorites([]);
      setError('Favorites could not be loaded: ' + err.message);
    }
  }

  // SAVE PROFILE
  async function saveProfile(e) {
    e.preventDefault();

    if (!user) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const { error: saveError } = await supabase
        .from('users_profile')
        .upsert(
          {
            id: user.id,
            name: profile.name,
            phone: profile.phone,
            location: profile.location,
            photo_url: profile.photo_url
          },
          { onConflict: 'id' }
        );

      if (saveError) throw saveError;

      setMessage('Profile updated successfully!');

    } catch (err) {
      console.error(err);
      setError(err.message || 'Profile update failed.');
    } finally {
      setSaving(false);
    }
  }

  // PROFILE PHOTO UPLOAD
  async function uploadPhoto(event) {
    const file = event.target.files?.[0];

    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be below 5 MB.');
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');

    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      const photoUrl = publicData.publicUrl;

      const { error: saveError } = await supabase
        .from('users_profile')
        .upsert(
          {
            id: user.id,
            name: profile.name,
            phone: profile.phone,
            location: profile.location,
            photo_url: photoUrl
          },
          { onConflict: 'id' }
        );

      if (saveError) throw saveError;

      setProfile(prev => ({
        ...prev,
        photo_url: photoUrl
      }));

      setMessage('Profile photo uploaded successfully!');

    } catch (err) {
      console.error('Photo upload error:', err);
      setError(err.message || 'Photo upload failed.');
    } finally {
      setUploading(false);

      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  }

  // AUTOMATIC GPS LOCATION
  async function getLocation() {
    setError('');
    setMessage('');

    if (!navigator.geolocation) {
      setError('Your browser does not support location.');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );

          if (!response.ok) {
            throw new Error('Unable to convert GPS location into address.');
          }

          const result = await response.json();
          const address = result.address || {};

          const location = [
            address.village ||
              address.suburb ||
              address.town ||
              address.city ||
              address.county,
            address.municipality || address.county,
            address.state,
            address.postcode
          ]
            .filter(Boolean)
            .filter((value, index, array) =>
              array.indexOf(value) === index
            )
            .join(', ');

          setProfile(prev => ({
            ...prev,
            location:
              location ||
              result.display_name ||
              `${latitude}, ${longitude}`
          }));

          setMessage(
            'Location detected. Click Save Profile to save.'
          );

        } catch (err) {
          setError(err.message || 'Unable to get address.');
        } finally {
          setGettingLocation(false);
        }
      },

      err => {
        setGettingLocation(false);

        if (err.code === 1) {
          setError(
            'Location permission denied. Please allow location access in your browser.'
          );
        } else if (err.code === 2) {
          setError('Your current location is unavailable.');
        } else {
          setError('Location request timed out. Please try again.');
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  }

  // DELETE OWN LISTING ONLY
  async function deleteListing(item) {
    if (!user) {
      setError('Please login first.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${item.title || item.species || 'this listing'}"?`
    );

    if (!confirmed) return;

    setDeletingId(item.id);
    setError('');
    setMessage('');

    try {
      const { data, error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', item.id)
        .eq('user_id', user.id)
        .select('id');

      if (deleteError) throw deleteError;

      if (!data || data.length === 0) {
        throw new Error(
          'Listing could not be deleted. Check ownership and database permissions.'
        );
      }

      setListings(prev =>
        prev.filter(listing => listing.id !== item.id)
      );

      setMessage('Your listing has been deleted successfully!');

    } catch (err) {
      console.error('Delete listing error:', err);
      setError(err.message || 'Unable to delete listing.');
    } finally {
      setDeletingId(null);
    }
  }

  // REMOVE FAVORITE
  async function removeFavorite(favorite) {
    if (!user) return;

    const confirmed = window.confirm(
      'Remove this listing from Favorites?'
    );

    if (!confirmed) return;

    setRemovingFavId(favorite.id);
    setError('');
    setMessage('');

    try {
      const { data, error: deleteError } = await supabase
        .from('favourites')
        .delete()
        .eq('id', favorite.id)
        .eq('user_id', user.id)
        .select('id');

      if (deleteError) throw deleteError;

      if (!data || data.length === 0) {
        throw new Error('Unable to remove favorite.');
      }

      setFavorites(prev =>
        prev.filter(item => item.id !== favorite.id)
      );

      setMessage('Removed from Favorites successfully!');

    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to remove favorite.');
    } finally {
      setRemovingFavId(null);
    }
  }

  // LOGOUT
  async function logout() {
    const confirmed = window.confirm('Do you want to logout?');

    if (!confirmed) return;

    const { error: logoutError } =
      await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    router.replace('/login');
  }

  // LISTING HELPERS
  function getTitle(item) {
    return (
      item.title ||
      item.species ||
      item.listing_id ||
      'Timber Listing'
    );
  }

  function getImage(item) {
    return (
      item.listing_images?.[0]?.image_url ||
      item.image_url ||
      item.image ||
      (Array.isArray(item.images) ? item.images[0] : '') ||
      ''
    );
  }

  // OPEN OWN LISTING - ASK PREMIUM FIRST
  function openListing(item) {
    setPremiumPromptListing(item);
  }

  // USER CHOOSES MAYBE LATER
  function continueToListing() {
    const item = premiumPromptListing;
    setPremiumPromptListing(null);

    const id = item?.listing_id || item?.id;

    if (id) {
      router.push(`/p/${id}`);
    }
  }

  // USER CHOOSES YES - GO TO PROMOTION PLANS
  function promoteSelectedListing() {
    const item = premiumPromptListing;
    const id = item?.listing_id || item?.id;

    if (!id) {
      setPremiumPromptListing(null);
      setError('Listing ID not found.');
      return;
    }

    setPremiumPromptListing(null);

    router.push({
      pathname: '/subscription',
      query: {
        listing_id: String(id),
        source: 'listing'
      }
    });
  }

  // LISTING CARD
  function ListingCard({ item, favorite = null }) {
    return (
      <article style={S.card}>
        {getImage(item) ? (
          <img
            src={getImage(item)}
            alt={getTitle(item)}
            style={S.listingImage}
          />
        ) : (
          <div style={S.noImage}>
            🌳
            <span>No image available</span>
          </div>
        )}

        <div style={S.cardBody}>
          <div style={S.cardTitleRow}>
            <h3 style={S.cardTitle}>
              {getTitle(item)}
            </h3>

            <span style={S.status}>
              {item.status || 'Pending'}
            </span>
          </div>

          <p style={S.cardInfo}>
            💰 {item.unit_price
              ? `₹${item.unit_price}/${item.unit_type || 'unit'}`
              : item.price || 'Contact Seller'}
          </p>

          <p style={S.cardInfo}>
            📍 {item.location_village ||
              item.location ||
              'Location not specified'}
          </p>

          {!favorite && (
            <p style={S.cardInfo}>
              👁 {Number(item.views_count || 0)} Views
            </p>
          )}

          <div style={S.actions}>
            <button
              type="button"
              style={S.viewBtn}
              onClick={() => {
                if (favorite) {
                  const id = item.listing_id || item.id;
                  if (id) router.push(`/p/${id}`);
                } else {
                  openListing(item);
                }
              }}
            >
              View Listing
            </button>

            {favorite ? (
              <button
                type="button"
                style={S.removeBtn}
                disabled={removingFavId === favorite.id}
                onClick={() => removeFavorite(favorite)}
              >
                {removingFavId === favorite.id
                  ? 'Removing...'
                  : '❤️ Remove'}
              </button>
            ) : (
              <button
                type="button"
                style={S.removeBtn}
                disabled={deletingId === item.id}
                onClick={() => deleteListing(item)}
              >
                {deletingId === item.id
                  ? 'Deleting...'
                  : '🗑 Delete'}
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  // LOADING SCREEN
  if (loading) {
    return (
      <TreeLoader
        message="Growing your TimberMart profile..."
        fullScreen={true}
      />
    );
  }

  // MAIN PROFILE UI
  return (
    <main style={S.page}>
      <div style={S.container}>

        {/* HEADER */}
        <header style={S.topbar}>
          <div>
            <div style={S.brand}>🌳 TimberMart</div>
            <h1 style={S.pageTitle}>My Profile</h1>
            <p style={S.subtitle}>
              Manage your TimberMart account
            </p>
          </div>

          <button
            type="button"
            style={S.logoutBtn}
            onClick={logout}
          >
            ↪ Logout
          </button>
        </header>

        {/* ALERTS */}
        {error && (
          <div style={S.errorBox}>
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div style={S.successBox}>
            ✓ {message}
          </div>
        )}

        {/* PROFILE HERO */}
        <section style={S.hero}>
          <div style={S.heroLeft}>
            <div style={S.avatarWrap}>
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt="Profile"
                  style={S.avatar}
                />
              ) : (
                <div style={S.avatarFallback}>
                  {(profile.name || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <button
                type="button"
                title="Upload profile photo"
                style={S.cameraBtn}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? '…' : '📷'}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={uploadPhoto}
              />
            </div>

            <div style={S.heroDetails}>
              <span style={S.memberTag}>
                TIMBERMART MEMBER
              </span>

              <h2 style={S.heroName}>
                {profile.name || 'Welcome!'}
              </h2>

              <p style={S.heroText}>
                ✉️ {profile.email || 'No email available'}
              </p>

              <p style={S.heroText}>
                📱 {profile.phone || 'No phone number'}
              </p>

              <p style={S.heroText}>
                📍 {profile.location || 'Add your location below'}
              </p>

              <button
                type="button"
                style={S.photoLink}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading
                  ? 'Uploading photo...'
                  : 'Change Profile Photo'}
              </button>

              <span style={S.photoHint}>
                JPG, PNG · Maximum 5 MB
              </span>
            </div>
          </div>

          <div style={S.heroBadge}>
            🌲
            <span>Growing with TimberMart</span>
          </div>
        </section>

        {/* STATISTICS */}
        <section style={S.stats}>
          <div style={S.statCard}>
            <span style={S.statIcon}>📦</span>
            <strong style={S.statNumber}>
              {listings.length}
            </strong>
            <span style={S.statLabel}>My Listings</span>
          </div>

          <div style={S.statCard}>
            <span style={S.statIcon}>❤️</span>
            <strong style={S.statNumber}>
              {favorites.length}
            </strong>
            <span style={S.statLabel}>Favorites</span>
          </div>

          <div style={S.statCard}>
            <span style={S.statIcon}>👁</span>
            <strong style={S.statNumber}>
              {totalViews}
            </strong>
            <span style={S.statLabel}>Total Views</span>
          </div>
        </section>

        {/* PERSONAL INFORMATION */}
        <section style={S.panel}>
          <div style={S.sectionHeading}>
            <div>
              <span style={S.eyebrow}>
                ACCOUNT SETTINGS
              </span>

              <h2 style={S.sectionTitle}>
                Personal Information
              </h2>

              <p style={S.sectionDesc}>
                Keep your account details up to date.
              </p>
            </div>

            <span style={S.sectionEmoji}>👤</span>
          </div>

          <form onSubmit={saveProfile}>
            <div style={S.formGrid}>
              <label style={S.field}>
                <span style={S.label}>Full Name</span>

                <input
                  style={S.input}
                  value={profile.name}
                  onChange={e =>
                    setProfile(prev => ({
                      ...prev,
                      name: e.target.value
                    }))
                  }
                  placeholder="Enter your full name"
                />
              </label>

              <label style={S.field}>
                <span style={S.label}>Email Address</span>

                <input
                  style={S.inputDisabled}
                  value={profile.email}
                  disabled
                />
              </label>

              <label style={S.field}>
                <span style={S.label}>Phone Number</span>

                <input
                  style={S.inputDisabled}
                  value={profile.phone}
                  disabled
                />
              </label>

              <div style={S.field}>
                <span style={S.label}>Your Location</span>

                <input
                  style={S.input}
                  value={profile.location}
                  onChange={e =>
                    setProfile(prev => ({
                      ...prev,
                      location: e.target.value
                    }))
                  }
                  placeholder="Enter your location"
                />

                <button
                  type="button"
                  style={S.locationBtn}
                  onClick={getLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation
                    ? '⌛ Detecting location...'
                    : '📍 Get My Current Location'}
                </button>
              </div>
            </div>

            <div style={S.formFooter}>
              <span style={S.secureText}>
                🔒 Your account information is private.
              </span>

              <button
                type="submit"
                style={S.saveBtn}
                disabled={saving}
              >
                {saving ? 'Saving...' : '✓ Save Profile'}
              </button>
            </div>
          </form>
        </section>

        {/* MY ACTIVITY */}
        <section style={S.panel}>
          <div style={S.sectionHeading}>
            <div>
              <span style={S.eyebrow}>
                YOUR ACTIVITY
              </span>

              <h2 style={S.sectionTitle}>
                My Activity
              </h2>

              <p style={S.sectionDesc}>
                Manage your posted and saved timber listings.
              </p>
            </div>

            <button
              type="button"
              style={S.postBtn}
              onClick={() => router.push('/list-timber')}
            >
              + Post Listing
            </button>
          </div>

          {/* TABS */}
          <div style={S.tabs}>
            <button
              type="button"
              style={
                activeTab === 'listings'
                  ? S.activeTab
                  : S.tab
              }
              onClick={() => setActiveTab('listings')}
            >
              📦 My Listings ({listings.length})
            </button>

            <button
              type="button"
              style={
                activeTab === 'favorites'
                  ? S.activeTab
                  : S.tab
              }
              onClick={() => setActiveTab('favorites')}
            >
              ❤️ Favorites ({favorites.length})
            </button>
          </div>

          {/* MY LISTINGS */}
          {activeTab === 'listings' && (
            listings.length > 0 ? (
              <div style={S.cardsGrid}>
                {listings.map(item => (
                  <ListingCard
                    key={item.id}
                    item={item}
                  />
                ))}
              </div>
            ) : (
              <div style={S.empty}>
                <div style={S.emptyIcon}>📦</div>
                <h3>No listings found</h3>
                <p>
                  Your posted timber listings will appear here.
                </p>

                <button
                  type="button"
                  style={S.saveBtn}
                  onClick={() => router.push('/list-timber')}
                >
                  Post Your First Listing
                </button>
              </div>
            )
          )}

          {/* FAVORITES */}
          {activeTab === 'favorites' && (
            favorites.length > 0 ? (
              <div style={S.cardsGrid}>
                {favorites.map(favorite => (
                  <ListingCard
                    key={favorite.id}
                    item={favorite.listing}
                    favorite={favorite}
                  />
                ))}
              </div>
            ) : (
              <div style={S.empty}>
                <div style={S.emptyIcon}>❤️</div>
                <h3>No saved favorites yet</h3>
                <p>
                  Listings you save on TimberMart will appear here.
                </p>

                <button
                  type="button"
                  style={S.saveBtn}
                  onClick={() => router.push('/')}
                >
                  Explore Listings
                </button>
              </div>
            )
          )}
        </section>

        {/* PREMIUM PROMOTION POPUP */}
        {premiumPromptListing && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-prompt-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                continueToListing();
              }
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0,0,0,.58)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 18
            }}
          >
            <div style={{
              width: '100%',
              maxWidth: 390,
              background: '#fff',
              borderRadius: 18,
              padding: 24,
              boxShadow: '0 20px 60px rgba(0,0,0,.25)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 38, marginBottom: 8 }}>
                🌟
              </div>

              <h2
                id="premium-prompt-title"
                style={{
                  margin: '0 0 8px',
                  color: '#183b29',
                  fontSize: 20,
                  fontWeight: 800
                }}
              >
                Make This Listing Premium?
              </h2>

              <p style={{
                color: '#68776d',
                fontSize: 13,
                lineHeight: 1.6,
                margin: '0 0 8px'
              }}>
                Would you like to promote{' '}
                <strong>{premiumPromptListing.title ||
                  premiumPromptListing.species ||
                  'your listing'}</strong>{' '}
                and reach more timber buyers?
              </p>

              <p style={{
                color: '#89948c',
                fontSize: 11,
                margin: '0 0 18px'
              }}>
                You can choose a promotion plan on the next page.
              </p>

              <button
                type="button"
                onClick={promoteSelectedListing}
                style={{
                  width: '100%',
                  border: 0,
                  borderRadius: 10,
                  padding: '13px 16px',
                  background: '#247344',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginBottom: 9
                }}
              >
                Yes, Make It Premium
              </button>

              <button
                type="button"
                onClick={continueToListing}
                style={{
                  width: '100%',
                  border: '1px solid #dce6de',
                  borderRadius: 10,
                  padding: '12px 16px',
                  background: '#fff',
                  color: '#40564a',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Maybe Later — View Listing
              </button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer style={S.footer}>
          © {new Date().getFullYear()} TimberMart
          <br />
          Connecting the Timber Community
        </footer>

      </div>
    </main>
  );
}

// COMPLETE PROFILE PAGE STYLES
const S = {
  page: {
    minHeight: '100vh',
    background: '#f3f7f4',
    padding: '32px 18px',
    fontFamily: 'Arial, sans-serif',
    color: '#183b29'
  },

  container: {
    maxWidth: 1180,
    margin: '0 auto'
  },

  loading: {
    minHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#246b43'
  },

  spinner: {
    width: 38,
    height: 38,
    border: '4px solid #dce9df',
    borderTop: '4px solid #247344',
    borderRadius: '50%'
  },

  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
    marginBottom: 25,
    flexWrap: 'wrap'
  },

  brand: {
    color: '#247344',
    fontWeight: 800,
    fontSize: 15,
    marginBottom: 8
  },

  pageTitle: {
    fontSize: 30,
    margin: 0,
    color: '#173b28'
  },

  subtitle: {
    color: '#718077',
    margin: '7px 0 0'
  },

  logoutBtn: {
    background: '#fff',
    color: '#b23a3a',
    border: '1px solid #eadada',
    borderRadius: 9,
    padding: '11px 18px',
    fontWeight: 700,
    cursor: 'pointer'
  },

  errorBox: {
    padding: 14,
    borderRadius: 10,
    background: '#fff0ef',
    color: '#a52b25',
    marginBottom: 15,
    border: '1px solid #f2ceca'
  },

  successBox: {
    padding: 14,
    borderRadius: 10,
    background: '#e9f7ed',
    color: '#21683b',
    marginBottom: 15,
    border: '1px solid #cce8d3'
  },

  hero: {
    background: 'linear-gradient(115deg, #164d31, #287a49)',
    color: '#fff',
    padding: 30,
    borderRadius: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
    boxShadow: '0 10px 28px rgba(27,85,48,.13)'
  },

  heroLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap'
  },

  avatarWrap: {
    position: 'relative',
    width: 112,
    height: 112,
    flexShrink: 0
  },

  avatar: {
    width: 112,
    height: 112,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid rgba(255,255,255,.8)'
  },

  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: '50%',
    background: '#e2f1e6',
    color: '#21683b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 48,
    fontWeight: 800,
    border: '4px solid rgba(255,255,255,.8)'
  },

  cameraBtn: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '2px solid white',
    background: '#f1fff4',
    cursor: 'pointer',
    fontSize: 16
  },

  heroDetails: {
    minWidth: 220
  },

  memberTag: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#c9efd4',
    fontWeight: 800
  },

  heroName: {
    fontSize: 27,
    margin: '7px 0 9px',
    color: '#fff'
  },

  heroText: {
    color: '#e3f1e7',
    margin: '5px 0',
    fontSize: 14
  },

  photoLink: {
    marginTop: 10,
    border: '1px solid rgba(255,255,255,.6)',
    background: 'rgba(255,255,255,.12)',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: 7,
    cursor: 'pointer'
  },

  photoHint: {
    display: 'block',
    fontSize: 11,
    color: '#d3e9da',
    marginTop: 6
  },

  heroBadge: {
    fontSize: 38,
    color: '#d5edda',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 7
  },

  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
    gap: 16,
    margin: '22px 0'
  },

  statCard: {
    background: '#fff',
    border: '1px solid #e8eee9',
    borderRadius: 15,
    padding: '22px 15px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 4px 16px rgba(20,60,35,.035)'
  },

  statIcon: {
    fontSize: 23,
    marginBottom: 8
  },

  statNumber: {
    color: '#247344',
    fontSize: 32,
    fontWeight: 800
  },

  statLabel: {
    color: '#718077',
    fontSize: 13,
    marginTop: 5
  },

  panel: {
    background: '#fff',
    border: '1px solid #e8eee9',
    borderRadius: 17,
    padding: 26,
    marginBottom: 22,
    boxShadow: '0 4px 18px rgba(20,60,35,.035)'
  },

  sectionHeading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
    marginBottom: 22,
    flexWrap: 'wrap'
  },

  eyebrow: {
    fontSize: 10,
    color: '#388052',
    letterSpacing: 1.5,
    fontWeight: 800
  },

  sectionTitle: {
    fontSize: 22,
    color: '#193c29',
    margin: '6px 0'
  },

  sectionDesc: {
    color: '#839087',
    fontSize: 13,
    margin: 0
  },

  sectionEmoji: {
    fontSize: 27,
    background: '#edf6ef',
    padding: 12,
    borderRadius: 12
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
    gap: 20
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 9
  },

  label: {
    fontSize: 13,
    fontWeight: 700,
    color: '#40564a'
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 14,
    border: '1px solid #dce6de',
    borderRadius: 9,
    fontSize: 14,
    color: '#203d2b',
    outlineColor: '#247344'
  },

  inputDisabled: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 14,
    border: '1px solid #e5ebe6',
    borderRadius: 9,
    fontSize: 14,
    color: '#78847c',
    background: '#f6f8f6'
  },

  locationBtn: {
    background: '#edf7ef',
    color: '#247344',
    border: '1px solid #cce4d2',
    padding: 11,
    borderRadius: 8,
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'left'
  },

  formFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
    marginTop: 22,
    flexWrap: 'wrap'
  },

  secureText: {
    color: '#849087',
    fontSize: 12
  },

  saveBtn: {
    background: '#247344',
    color: '#fff',
    border: 0,
    padding: '13px 22px',
    borderRadius: 9,
    fontWeight: 700,
    cursor: 'pointer'
  },

  postBtn: {
    background: '#247344',
    color: '#fff',
    border: 0,
    padding: '11px 17px',
    borderRadius: 9,
    cursor: 'pointer',
    fontWeight: 700
  },

  tabs: {
    display: 'flex',
    gap: 10,
    borderBottom: '1px solid #e9eee9',
    marginBottom: 22,
    flexWrap: 'wrap'
  },

  tab: {
    background: 'transparent',
    border: 0,
    padding: '13px 16px',
    color: '#77847a',
    cursor: 'pointer',
    fontWeight: 700,
    borderBottom: '3px solid transparent'
  },

  activeTab: {
    background: '#f0f7f1',
    border: 0,
    padding: '13px 16px',
    color: '#247344',
    cursor: 'pointer',
    fontWeight: 800,
    borderBottom: '3px solid #247344',
    borderRadius: '8px 8px 0 0'
  },

  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
    gap: 17
  },

  card: {
    border: '1px solid #e6ece7',
    borderRadius: 13,
    overflow: 'hidden',
    background: '#fff'
  },

  listingImage: {
    width: '100%',
    height: 180,
    objectFit: 'cover',
    display: 'block'
  },

  noImage: {
    height: 180,
    background: '#edf4ee',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 35,
    color: '#48835b'
  },

  cardBody: {
    padding: 15
  },

  cardTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'flex-start'
  },

  cardTitle: {
    margin: 0,
    fontSize: 16,
    color: '#23432e'
  },

  status: {
    fontSize: 10,
    background: '#eaf5ec',
    color: '#287044',
    padding: '5px 8px',
    borderRadius: 20,
    whiteSpace: 'nowrap'
  },

  cardInfo: {
    fontSize: 13,
    color: '#758078',
    margin: '9px 0'
  },

  actions: {
    display: 'flex',
    gap: 9,
    marginTop: 14
  },

  viewBtn: {
    flex: 1,
    border: 0,
    background: '#247344',
    color: '#fff',
    padding: 10,
    borderRadius: 7,
    cursor: 'pointer',
    fontWeight: 700
  },

  removeBtn: {
    flex: 1,
    border: '1px solid #f0d4d1',
    background: '#fff3f1',
    color: '#b43d34',
    padding: 10,
    borderRadius: 7,
    cursor: 'pointer',
    fontWeight: 700
  },

  empty: {
    padding: '42px 15px',
    textAlign: 'center',
    background: '#f8faf8',
    borderRadius: 12,
    color: '#748077'
  },

  emptyIcon: {
    fontSize: 36
  },

  footer: {
    textAlign: 'center',
    color: '#89948c',
    fontSize: 12,
    padding: '8px 0 22px',
    lineHeight: 1.8
  }
};
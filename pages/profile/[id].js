
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PublicProfile() {
  const router = useRouter();
  const { id } = router.query;

  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (router.isReady && id) loadPublicProfile();
  }, [router.isReady, id]);

  async function loadPublicProfile() {
    setLoading(true);

    try {
      const { data: profileData, error: profileError } =
        await supabase
          .from('users_profile')
          .select('id, name, location, photo_url, role')
          .eq('id', id)
          .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        setProfile(null);
        setListings([]);
        return;
      }

      setProfile(profileData);

      const { data: listingData, error: listingError } =
        await supabase
          .from('listings')
          .select('id, listing_id, title, species, price, unit_price, unit_type, location_village, status, listing_images(image_url)')
          .eq('user_id', id)
          .order('created_at', { ascending: false });

      if (listingError) throw listingError;

      setListings(listingData || []);
    } catch (error) {
      console.error('Public profile error:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function shareProfile() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile?.name || 'TimberMart Member'} Profile`,
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Profile link copied!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        alert('Unable to share profile.');
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading Profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <h2 className="text-xl font-bold">Profile Not Found</h2>
        <button
          onClick={() => router.push('/')}
          className="bg-green-700 text-white px-5 py-2 rounded-full"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-3xl mx-auto">

        <header className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-black text-green-800">
            🌳 TimberMart
          </h1>

          <button
            onClick={shareProfile}
            className="bg-green-700 text-white px-4 py-2 rounded-full text-sm font-bold"
          >
            ↗ Share Profile
          </button>
        </header>

        <section className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-3xl font-bold text-green-800">
              {(profile.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h2 className="text-xl font-black">
              {profile.name || 'TimberMart Member'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {profile.role || 'Member'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              📍 {profile.location || 'Location not available'}
            </p>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black">My Timber Listings</h2>
            <span className="text-sm text-gray-500">
              {listings.length} Listings
            </span>
          </div>

          {listings.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500">
              No public listings available.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listings.map(item => {
                const image = item.listing_images?.[0]?.image_url;

                return (
                  <article
                    key={item.id}
                    className="bg-white rounded-xl overflow-hidden shadow-sm"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={item.title || item.species || 'Timber'}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-green-50 flex items-center justify-center text-5xl">
                        🌳
                      </div>
                    )}

                    <div className="p-4">
                      <h3 className="font-bold">
                        {item.title || item.species || 'Timber Listing'}
                      </h3>

                      <p className="text-sm text-gray-600 mt-1">
                        {item.species || ''}
                      </p>

                      <p className="font-black text-green-800 mt-2">
                        ₹{item.unit_price || item.price || 'Contact Seller'}
                        {item.unit_type ? ` / ${item.unit_type}` : ''}
                      </p>

                      <p className="text-sm text-gray-500 mt-1">
                        📍 {item.location_village || 'Location not specified'}
                      </p>

                      <button
                        onClick={() => router.push(`/p/${item.listing_id}`)}
                        className="mt-4 w-full bg-green-700 text-white py-3 rounded-full font-bold text-sm"
                      >
                        View Listing →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="text-center text-xs text-gray-500 mt-8">
          Shared via TimberMart 🌳
        </footer>
      </div>
    </main>
  );
}

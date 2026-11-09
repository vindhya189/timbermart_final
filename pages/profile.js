
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Profile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session }, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !session) {
      router.replace('/login');
      return;
    }

    const currentUser = session.user;
    setUser(currentUser);

    const { data, error } = await supabase
      .from('users_profile')
      .select('name, email, phone, location')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (error) {
      console.error('Profile loading error:', error.message);
    }

    setName(data?.name || currentUser.user_metadata?.full_name || '');
    setEmail(data?.email || currentUser.email || '');
    setPhone(data?.phone || currentUser.user_metadata?.phone || '');
    setArea(data?.location || '');

    setLoading(false);
  };

  const saveArea = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from('users_profile')
      .upsert(
        {
          id: user.id,
          name,
          email,
          phone,
          location: area.trim()
        },
        { onConflict: 'id' }
      );

    setSaving(false);

    if (error) {
      alert('Area save failed: ' + error.message);
      return;
    }

    alert('Profile updated successfully!');
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert('Logout failed: ' + error.message);
      return;
    }

    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen bg-white">

        <div className="bg-black text-white px-5 py-4 flex justify-between items-center">

  <div className="flex items-center gap-3">
    <button
      onClick={() => router.push('/')}
      className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center text-xl font-bold"
    >
      ←
    </button>

    <h1 className="font-black text-lg">My Profile</h1>
  </div>

  <button
    onClick={logout}
    className="bg-red-600 text-white px-4 py-2 rounded-full text-xs font-bold"
  >
    Logout
  </button>

</div>

        <div className="p-5">

          <div className="text-center mt-5 mb-7">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-4xl mx-auto">
              👤
            </div>
            <h2 className="font-black text-xl mt-3">
              {name || 'Your Name'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              TimberMart Member
            </p>
          </div>

          <div className="border rounded-2xl p-4 space-y-4">

            <div>
              <label className="text-xs text-gray-500 font-bold">
                REGISTERED NAME
              </label>
              <p className="font-semibold text-sm mt-1">
                {name || 'Not available'}
              </p>
            </div>

            <div className="border-t pt-3">
              <label className="text-xs text-gray-500 font-bold">
                EMAIL ADDRESS
              </label>
              <p className="font-semibold text-sm mt-1 break-all">
                {email || 'Not available'}
              </p>
            </div>

            <div className="border-t pt-3">
              <label className="text-xs text-gray-500 font-bold">
                WHATSAPP PHONE NUMBER
              </label>
              <p className="font-semibold text-sm mt-1">
                {phone || 'Not available'}
              </p>
            </div>

            <div className="border-t pt-3">
              <label className="text-xs text-gray-500 font-bold">
                AREA / LOCATION
              </label>
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Enter your area or village"
                className="w-full border rounded-xl px-3 py-3 mt-2 text-sm outline-none focus:border-black"
              />
            </div>

            <button
              onClick={saveArea}
              disabled={saving}
              className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>

          </div>

          <button
            onClick={logout}
            className="w-full mt-6 border border-red-500 text-red-600 py-3 rounded-xl font-bold text-sm"
          >
            Logout
          </button>

          <p className="text-center text-[11px] text-gray-400 mt-5">
            TimberMart.co.in
          </p>

        </div>
      </div>
    </div>
  );
}

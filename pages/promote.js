
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const AUDIENCES = [
  { value: 'all', label: 'All TimberMart Users' },
  { value: 'farmers', label: 'Farmers' },
  { value: 'merchants', label: 'Merchants' },
  { value: 'sawmills', label: 'Sawmills' },
  { value: 'carpenters', label: 'Carpenters' }
];

export default function Promote() {
  const router = useRouter();
  const fileRef = useRef(null);

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    contact_number: '',
    website_url: '',
    target_audience: 'all',
    package_days: 7
  });

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;

        const currentSession = data.session;
        setSession(currentSession);

        if (currentSession?.user) {
          const { data: profile } = await supabase
            .from('users_profile')
            .select('phone')
            .eq('id', currentSession.user.id)
            .maybeSingle();

          if (!active) return;

          const phone = String(
            profile?.phone || currentSession.user.phone || ''
          ).replace(/\D/g, '').slice(-10);

          setRegisteredPhone(phone);

          setForm(previous => ({
            ...previous,
            contact_number: previous.contact_number || phone
          }));
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (active) setSession(newSession);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const change = (event) => {
    const { name, value } = event.target;
    setForm(previous => ({
      ...previous,
      [name]: name === 'package_days' ? Number(value) : value
    }));
  };

  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    setError('');

    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('JPG, PNG, WEBP photos maatrame upload cheyyandi.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo maximum size 5 MB.');
      event.target.value = '';
      return;
    }

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhoto(null);
    setPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const uploadPhoto = async (userId) => {
    if (!photo) throw new Error('Please select a business photo.');

    const extension = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    }[photo.type];

    const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('announcements')
      .upload(filePath, photo, {
        contentType: photo.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('announcements')
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error('Photo URL generate avvaledhu.');
    }

    return data.publicUrl;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setError('');
    setStatus('');

    try {
      if (!window.Razorpay) {
        throw new Error('Payment gateway loading. Try again.');
      }

      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;

      if (!currentSession) {
        router.push('/login');
        return;
      }

      if (!/^[6-9]\d{9}$/.test(registeredPhone)) {
        throw new Error('Registered profile phone number invalid.');
      }

      const contact = form.contact_number.replace(/\D/g, '');

      if (!/^[6-9]\d{9}$/.test(contact)) {
        throw new Error('Valid 10-digit contact number enter cheyyandi.');
      }

      if (!form.title.trim() || !form.description.trim()) {
        throw new Error('Title and description required.');
      }

      if (!photo) {
        throw new Error('Business photo select cheyyandi.');
      }

      if (
        form.website_url.trim() &&
        !/^https:\/\//i.test(form.website_url.trim())
      ) {
        throw new Error('Website URL https:// tho start avvali.');
      }

      setLoading(true);
      setStatus('Uploading business photo...');

      const imageUrl = await uploadPhoto(currentSession.user.id);

      const plan = Number(form.package_days) === 7
        ? 'announcement_7'
        : 'announcement_14';

      setStatus('Creating Razorpay payment order...');

      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({
          plan,
          phone: registeredPhone,
          title: form.title.trim(),
          description: form.description.trim(),
          image_url: imageUrl,
          contact_number: contact,
          website_url: form.website_url.trim(),
          target_audience: form.target_audience
        })
      });

      const order = await orderResponse.json();

      if (!orderResponse.ok || !order.success) {
        throw new Error(order.error || 'Order creation failed.');
      }

      if (!order.orderId || !order.key || !order.announcementId) {
        throw new Error('Incomplete announcement order response.');
      }

      setStatus('');

      const checkout = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'TimberMart',
        description: `${form.package_days} Days Business Announcement`,
        order_id: order.orderId,
        prefill: {
          contact: registeredPhone
        },
        theme: {
          color: '#07552c'
        },
        handler: async (payment) => {
          try {
            setStatus('Verifying payment...');

            const response = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentSession.access_token}`
              },
              body: JSON.stringify({
                plan,
                phone: registeredPhone,
                announcement_id: order.announcementId,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature
              })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
              throw new Error(result.error || 'Payment verification failed.');
            }

            setStatus('Payment successful! Waiting for admin approval.');
            await router.push('/my-promotions');
          } catch (err) {
            setError(
              `${err.message} Payment deduct ayithe malli pay cheyyakandi. Support ni Payment ID tho contact cheyyandi.`
            );
            setStatus('');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStatus('');
          }
        }
      });

      checkout.on('payment.failed', (response) => {
        setError(
          response.error?.description ||
          'Payment failed. Please check My Promotions.'
        );
        setLoading(false);
        setStatus('');
      });

      checkout.open();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setStatus('');
      setLoading(false);
    }
  };

  const amount = form.package_days === 7 ? 149 : 249;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <main className="page">
        <div className="container">
          <header className="header">
            <Link href="/" className="back">← TimberMart Home</Link>
            <span className="eyebrow">TIMBERMART BUSINESS</span>
            <h1>📢 Promote Your Business</h1>
            <p>
              Reach TimberMart farmers, merchants, sawmills and carpenters
              with your business announcement.
            </p>
          </header>

          {authLoading ? (
            <div className="notice">Checking login...</div>
          ) : !session ? (
            <div className="notice">
              Login required. <Link href="/login">Login Now</Link>
            </div>
          ) : null}

          <form className="card" onSubmit={handleSubmit}>
            <h2>Business Information</h2>

            <label htmlFor="title">Promotion Title *</label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={change}
              maxLength={150}
              placeholder="Premium Teak Wood Available"
              required
            />

            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={change}
              maxLength={5000}
              rows={5}
              placeholder="Describe your business, products and offers..."
              required
            />

            <label>Business Photo *</label>
            <div className="upload">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selectPhoto}
              />
              <small>Gallery nunchi photo select cheyyandi. Max 5 MB.</small>

              {preview && (
                <div className="preview">
                  <img src={preview} alt="Business promotion preview" />
                  <button type="button" onClick={removePhoto}>
                    Remove Photo
                  </button>
                </div>
              )}
            </div>

            <label htmlFor="contact">Contact Number *</label>
            <input
              id="contact"
              type="tel"
              name="contact_number"
              value={form.contact_number}
              onChange={change}
              maxLength={10}
              inputMode="numeric"
              placeholder="10-digit mobile number"
              required
            />

            <label htmlFor="website">Website (Optional)</label>
            <input
              id="website"
              type="url"
              name="website_url"
              value={form.website_url}
              onChange={change}
              placeholder="https://example.com"
            />

            <label htmlFor="audience">Target Audience *</label>
            <select
              id="audience"
              name="target_audience"
              value={form.target_audience}
              onChange={change}
            >
              {AUDIENCES.map(item => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <h2>Choose Promotion Package</h2>

            <div className="packages">
              {[7, 14].map(days => (
                <label
                  key={days}
                  className={`package ${form.package_days === days ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="package_days"
                    value={days}
                    checked={form.package_days === days}
                    onChange={change}
                  />
                  <span>{days} Days</span>
                  <strong>₹{days === 7 ? 149 : 249}</strong>
                  <small>Business Announcement</small>
                </label>
              ))}
            </div>

            <div className="summary">
              <span>Total Payment</span>
              <strong>₹{amount}</strong>
            </div>

            {error && <div className="error" role="alert">{error}</div>}
            {status && <div className="status">{status}</div>}

            <button
              className="pay"
              type="submit"
              disabled={loading || !session || authLoading}
            >
              {loading ? 'Processing...' : `Pay ₹${amount} & Submit`}
            </button>

            <p className="note">
              Promotion will be published only after payment verification
              and admin approval. Validity starts after approval.
            </p>

            <Link href="/my-promotions" className="history">
              View My Promotions →
            </Link>
          </form>
        </div>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f4f7f4;
          padding: 28px 14px 65px;
          color: #18291f;
        }
        .container { max-width: 700px; margin: auto; }
        .header { text-align: center; margin-bottom: 24px; }
        .back {
          display: block;
          text-align: left;
          margin-bottom: 22px;
          color: #166534;
          text-decoration: none;
        }
        .eyebrow {
          color: #15803d;
          font-weight: 800;
          letter-spacing: 1.5px;
          font-size: 12px;
        }
        h1 { font-size: 29px; margin: 12px 0; }
        .header p { color: #64748b; line-height: 1.6; }
        .card {
          background: white;
          padding: 25px;
          border-radius: 16px;
          box-shadow: 0 5px 22px rgba(0,0,0,.06);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        h2 { font-size: 19px; margin: 12px 0 8px; }
        .card > label { font-size: 14px; font-weight: 700; }
        input:not([type="radio"]), textarea, select {
          width: 100%;
          padding: 13px;
          border: 1px solid #d1ddd3;
          border-radius: 9px;
          background: white;
          color: #18291f;
          font-size: 15px;
        }
        input:focus, textarea:focus, select:focus {
          outline: 2px solid #86efac;
        }
        .upload {
          padding: 17px;
          background: #f5fbf6;
          border: 2px dashed #bbd5c0;
          border-radius: 12px;
        }
        .upload small { display: block; color: #64748b; margin-top: 9px; }
        .preview { margin-top: 14px; }
        .preview img {
          width: 100%;
          max-height: 270px;
          object-fit: cover;
          border-radius: 10px;
        }
        .preview button {
          display: block;
          margin-top: 9px;
          border: none;
          border-radius: 7px;
          padding: 9px 14px;
          background: #fee2e2;
          color: #991b1b;
          cursor: pointer;
        }
        .packages { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .package {
          border: 2px solid #e2e8e2;
          border-radius: 12px;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
        }
        .package.selected {
          border-color: #15803d;
          background: #f0fdf4;
        }
        .package strong { font-size: 28px; color: #15803d; }
        .package small { color: #64748b; }
        .summary {
          background: #f0fdf4;
          border-radius: 10px;
          padding: 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
        }
        .summary strong { color: #15803d; font-size: 25px; }
        .pay {
          background: #07552c;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 16px;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
        }
        .pay:disabled { opacity: .55; cursor: not-allowed; }
        .note { color: #64748b; font-size: 12px; text-align: center; line-height: 1.6; }
        .history { text-align: center; color: #166534; font-weight: 700; }
        .notice, .error, .status {
          padding: 13px;
          border-radius: 9px;
          margin-bottom: 12px;
        }
        .notice { background: #fff7ed; }
        .error { background: #fee2e2; color: #991b1b; }
        .status { background: #eff6ff; color: #1d4ed8; }
        @media (max-width: 480px) {
          h1 { font-size: 24px; }
          .card { padding: 17px; }
          .package { padding: 12px; }
        }
      `}</style>
    </>
  );
}

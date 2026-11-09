
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/router';
import TreeLoader from '../components/TreeLoader';

const PLANS = [
  // EXISTING SUBSCRIPTION PLANS
  {
    id: 'free',
    name: 'Free Listing',
    price: 0,
    days: '10 Days',
    features: ['1 Listing', 'Normal Position', '10 Days Validity', 'WhatsApp Contact'],
    color: 'bg-white',
    btn: 'Start Free',
    type: 'subscription'
  },
  {
    id: 'premium',
    name: 'Premium Listing',
    price: 99,
    days: '30 Days',
    features: ['Top of Home Page', 'Premium Badge', '30 Days Validity', '3x More Views', 'Priority Support'],
    color: 'bg-yellow-50 border-yellow-300',
    btn: 'Pay ₹99',
    popular: true,
    type: 'subscription'
  },
  {
    id: 'carpenter',
    name: 'Carpenter Pro',
    price: 149,
    days: '30 Days',
    features: ['Top in Carpenter List', 'Pro Badge', 'Unlimited Leads', '30 Days Validity'],
    color: 'bg-orange-50 border-orange-300',
    btn: 'Pay ₹149',
    type: 'subscription'
  },
  {
    id: 'business',
    name: 'Business - 10 Listings',
    price: 499,
    days: '30 Days',
    features: ['10 Premium Listings', 'All Premium Benefits', 'Dedicated Support'],
    color: 'bg-blue-50 border-blue-300',
    btn: 'Pay ₹499',
    type: 'subscription'
  },

  // LISTING PROMOTION PLANS
  {
    id: 'local_top',
    name: 'Local Top Premium',
    price: 199,
    days: '14 Days',
    features: ['Top Position within 10 KM', 'Premium Badge', '14 Days Validity', 'More Local Buyers'],
    color: 'bg-green-50 border-green-300',
    btn: 'Promote for ₹199',
    type: 'promotion'
  },
  {
    id: 'city_top',
    name: 'City Top Premium',
    price: 499,
    days: '14 Days',
    features: ['Top Position in Selected City', 'Premium Badge', '14 Days Validity', 'More City Buyers'],
    color: 'bg-yellow-50 border-yellow-300',
    btn: 'Promote for ₹499',
    type: 'promotion'
  },
  {
    id: 'district_top',
    name: 'District Top Premium',
    price: 1499,
    days: '14 Days',
    features: ['Top Position in Entire District', 'Premium Badge', '14 Days Validity', 'District-wide Reach'],
    color: 'bg-orange-50 border-orange-300',
    btn: 'Promote for ₹1,499',
    type: 'promotion'
  },
  {
    id: 'state_top',
    name: 'State Top Premium',
    price: 2999,
    days: '14 Days',
    features: ['Top Position Across State', 'Premium Badge', '14 Days Validity', 'State-wide Reach'],
    color: 'bg-blue-50 border-blue-300',
    btn: 'Promote for ₹2,999',
    type: 'promotion'
  },
  {
    id: 'india_top',
    name: 'All India Listing Top',
    price: 4999,
    days: '14 Days',
    features: ['Top Position Across India', 'Premium Badge', '14 Days Validity', 'Pan-India Buyer Reach'],
    color: 'bg-purple-50 border-purple-300',
    btn: 'Promote for ₹4,999',
    type: 'promotion'
  }
];

export default function Subscription() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Read selected listing from profile popup URL
  const listingId =
    router.isReady && typeof router.query.listing_id === 'string'
      ? router.query.listing_id.trim()
      : '';

  const fromListing =
    router.isReady &&
    router.query.source === 'listing' &&
    !!listingId;

  // Load saved phone number
  useEffect(() => {
    const savedPhone = localStorage.getItem('timber_phone');

    if (savedPhone) {
      setPhone(savedPhone.replace(/\D/g, '').slice(-10));
    }
  }, []);

  // PAYMENT FUNCTION
  const pay = async (plan) => {
    // Free listing
    if (plan.price === 0) {
      window.location.href = '/list-timber';
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    // Promotion must be opened from a selected listing
    if (plan.type === 'promotion' && !fromListing) {
      alert('Please open your listing and select Make It Premium first.');
      return;
    }

    if (typeof window.Razorpay === 'undefined') {
      alert('Razorpay is loading. Please wait 2 seconds and try again.');
      return;
    }

    setPaying(plan.id);
    setCreatingOrder(true);

    try {
      // Existing plans use their original names.
      // Promotion plans use their plan IDs.
      const planValue =
        plan.type === 'promotion' ? plan.id : plan.name;

      // STEP 1: CREATE RAZORPAY ORDER
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: plan.price,
          plan: planValue,
          phone: cleanPhone,
          listing_id: plan.type === 'promotion' ? listingId : ''
        })
      });

      const data = await res.json();

      console.log('Razorpay Order Response:', data);

      if (!res.ok || !data.orderId) {
        throw new Error(data.error || 'Unable to create payment order');
      }

      setCreatingOrder(false);

      // STEP 2: RAZORPAY CHECKOUT
      const options = {
        key: data.key,
        amount: data.amount,
        currency: 'INR',
        name: 'TimberMart',
        description: plan.name,
        order_id: data.orderId,

        handler: async (response) => {
          try {
            setCreatingOrder(true);

            // STEP 3: VERIFY PAYMENT
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...response,
                phone: cleanPhone,
                plan: planValue,
                amount: plan.price,
                listing_id: plan.type === 'promotion' ? listingId : ''
              })
            });

            const result = await verifyResponse.json();

            if (!verifyResponse.ok || !result.success) {
              throw new Error(
                result.error || 'Payment verification failed'
              );
            }

            alert(
              plan.type === 'promotion'
                ? 'Payment Successful! Your selected listing promotion is activated for 14 days.'
                : 'Payment Successful! Your subscription is activated.'
            );

            window.location.href = '/profile';

          } catch (error) {
            console.error('Payment verification error:', error);

            alert(
              'Payment received, but activation needs attention. Please contact timbermartapp@gmail.com with your Payment ID: ' +
              response.razorpay_payment_id
            );

            setPaying('');
            setCreatingOrder(false);
          }
        },

        prefill: {
          contact: '91' + cleanPhone
        },

        theme: {
          color: '#245b32'
        },

        modal: {
          ondismiss: () => {
            setPaying('');
            setCreatingOrder(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (error) => {
        alert(
          'Payment Failed: ' +
          (error.error?.description || 'Please try again')
        );

        setPaying('');
        setCreatingOrder(false);
      });

      rzp.open();

    } catch (error) {
      console.error('Payment error:', error);

      alert('Payment Error: ' + error.message);

      setPaying('');
      setCreatingOrder(false);
    }
  };

  // Wait for URL query to load
  if (!router.isReady) {
    return (
      <TreeLoader
        message="Preparing TimberMart plans..."
        fullScreen={true}
      />
    );
  }

  // Separate existing plans and listing promotion plans
  const subscriptionPlans = PLANS.filter(
    plan => plan.type === 'subscription'
  );

  const promotionPlans = PLANS.filter(
    plan => plan.type === 'promotion'
  );

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-[480px] pb-8">

        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />

        {/* HEADER */}
        <div className="bg-black text-white px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-[12px] font-bold">
            ← HOME
          </Link>

          <p className="font-black text-[14px]">
            SUBSCRIPTION & PREMIUM
          </p>

          <span className="w-10"></span>
        </div>

        <div className="px-4 pt-5">

          {creatingOrder && (
            <TreeLoader
              message="Preparing your TimberMart payment..."
              fullScreen={false}
            />
          )}

          {/* INTRO */}
          <h1 className="font-black text-[20px] text-center text-gray-900">
            Grow Your Timber Business
          </h1>

          <p className="text-[11px] text-gray-500 text-center mt-1">
            Choose the right plan to grow your business
          </p>

          {/* SELECTED LISTING - ONLY WHEN COMING FROM PROFILE */}
          {fromListing && (
            <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-[12px] font-black text-green-900">
                🌳 Premium promotion for your selected listing
              </p>

              <p className="text-[12px] text-green-800 mt-2">
                Listing ID: <strong>{listingId}</strong>
              </p>

              <p className="text-[10px] text-gray-500 mt-2">
                The selected listing will be used for your promotion.
              </p>

              <Link
                href="/profile"
                className="inline-block text-[11px] text-green-800 font-bold underline mt-2"
              >
                Change Listing
              </Link>
            </div>
          )}

          {/* PHONE */}
          <div className="mt-5">
            <label className="text-[12px] font-bold block mb-2">
              Registered Phone Number *
            </label>

            <input
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                )
              }
              placeholder="Enter 10-digit phone number"
              type="tel"
              maxLength={10}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-[13px] text-center font-bold outline-none focus:border-green-600 bg-white"
            />
          </div>

          {/* EXISTING SUBSCRIPTION PLANS */}
          <div className="mt-7">
            <h2 className="font-black text-[16px]">
              Existing Subscription Plans
            </h2>

            <p className="text-[11px] text-gray-500 mt-1">
              Choose a plan for your TimberMart account.
            </p>

            <div className="space-y-3 mt-3">
              {subscriptionPlans.map(plan => (
                <div
                  key={plan.id}
                  className={`border rounded-2xl p-4 ${plan.color}`}
                >
                  {plan.popular && (
                    <span className="bg-yellow-400 px-2 py-1 rounded-full text-[9px] font-black">
                      MOST POPULAR
                    </span>
                  )}

                  <div className="flex justify-between items-center mt-1">
                    <p className="font-bold text-[14px]">
                      {plan.name}
                    </p>

                    <p className="font-black text-[19px]">
                      {plan.price === 0 ? 'FREE' : `₹${plan.price}`}
                    </p>
                  </div>

                  <p className="text-[11px] text-gray-500">
                    {plan.days}
                  </p>

                  <ul className="mt-3 space-y-1">
                    {plan.features.map(feature => (
                      <li key={feature} className="text-[12px]">
                        ✓ {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => pay(plan)}
                    disabled={!!paying || creatingOrder}
                    className="w-full bg-black text-white rounded-full py-3 font-bold text-[12px] mt-4 disabled:opacity-50"
                  >
                    {paying === plan.id
                      ? 'Processing...'
                      : plan.btn}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* PROMOTION PLANS - ONLY WHEN OPENED FROM A LISTING */}
          {fromListing && (
            <div className="mt-8">

              <div className="text-center">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-[10px] font-black">
                  PREMIUM LISTING PROMOTION
                </span>

                <h2 className="font-black text-[19px] mt-3">
                  Boost Your Timber Listing
                </h2>

                <p className="text-[11px] text-gray-500 mt-1">
                  Select your preferred promotion reach.
                </p>
              </div>

              <div className="space-y-3 mt-4">
                {promotionPlans.map(plan => (
                  <div
                    key={plan.id}
                    className={`border-2 rounded-2xl p-4 ${plan.color}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-black text-[14px]">
                          {plan.name}
                        </p>

                        <p className="text-[11px] text-gray-600 mt-1">
                          {plan.days} validity
                        </p>
                      </div>

                      <p className="font-black text-[20px] whitespace-nowrap">
                        ₹{plan.price.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <ul className="mt-3 space-y-1">
                      {plan.features.map(feature => (
                        <li
                          key={feature}
                          className="text-[12px] text-gray-700"
                        >
                          ✓ {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => pay(plan)}
                      disabled={!!paying || creatingOrder}
                      className="w-full bg-green-800 text-white rounded-full py-3 font-bold text-[12px] mt-4 disabled:opacity-50 active:scale-95"
                    >
                      {paying === plan.id
                        ? 'Processing Payment...'
                        : plan.btn}
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-center text-[10px] text-gray-500 mt-4 leading-5">
                Premium promotion is valid for 14 days.
                <br />
                After expiry, your listing continues as a normal listing.
              </p>
            </div>
          )}

          {/* NORMAL PAGE MESSAGE */}
          {!fromListing && (
            <div className="mt-6 p-3 bg-green-50 border border-green-100 rounded-xl">
              <p className="text-[11px] text-green-800 text-center">
                Want to promote a particular listing? Open that listing from My Profile and choose Make It Premium.
              </p>
            </div>
          )}

          {/* FOOTER */}
          <div className="text-center text-[10px] text-gray-400 mt-6 leading-5">
            Secure payments powered by Razorpay.
            <br />
            UPI • Cards • NetBanking
            <br />
            Support: timbermartapp@gmail.com
          </div>

        </div>
      </div>
    </div>
  );
}

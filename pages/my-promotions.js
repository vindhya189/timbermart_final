
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS = {
  pending_payment: {
    label: 'Payment Pending',
    color: '#b45309',
    bg: '#fef3c7'
  },
  pending_approval: {
    label: 'Waiting for Admin Approval',
    color: '#1d4ed8',
    bg: '#dbeafe'
  },
  approved: {
    label: 'Approved',
    color: '#15803d',
    bg: '#dcfce7'
  },
  active: {
    label: 'Active',
    color: '#15803d',
    bg: '#dcfce7'
  },
  rejected: {
    label: 'Rejected',
    color: '#b91c1c',
    bg: '#fee2e2'
  },
  expired: {
    label: 'Expired',
    color: '#64748b',
    bg: '#f1f5f9'
  },
  cancelled: {
    label: 'Cancelled',
    color: '#64748b',
    bg: '#f1f5f9'
  }
};

const formatDate = (date) => {
  if (!date) return 'Not available';
  return new Date(date).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

export default function MyPromotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadPromotions() {
    setLoading(true);
    setError('');

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        throw new Error('Please login to view your promotions.');
      }

      const response = await fetch(
        '/api/announcements/my-promotions',
        {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to load promotions.');
      }

      setPromotions(result.promotions || []);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPromotions();
  }, []);

  return (
    <main className="page">
      <div className="container">
        <Link href="/" className="back">
          ← TimberMart Home
        </Link>

        <div className="heading">
          <div>
            <h1>My Promotions</h1>
            <p>Manage and track your business announcements.</p>
          </div>
          <Link href="/promote" className="create">
            + Create Announcement
          </Link>
        </div>

        <button
          type="button"
          className="refresh"
          onClick={loadPromotions}
          disabled={loading}
        >
          ↻ Refresh Status
        </button>

        {loading && <div className="empty">Loading promotions...</div>}

        {error && (
          <div className="error">
            {error}
            <button onClick={loadPromotions}>Try Again</button>
          </div>
        )}

        {!loading && !error && promotions.length === 0 && (
          <div className="empty">
            <div className="emptyIcon">📢</div>
            <h2>No Promotions Yet</h2>
            <p>Promote your business to TimberMart users.</p>
            <Link href="/promote">Create First Promotion</Link>
          </div>
        )}

        <div className="grid">
          {promotions.map(item => {
            const status = STATUS[item.status] || {
              label: item.status,
              color: '#334155',
              bg: '#f1f5f9'
            };

            const payments = item.announcement_payments || [];
            const payment = payments.find(
              p => p.payment_status === 'paid'
            ) || payments[0];

            const actuallyExpired =
              item.expires_at &&
              new Date(item.expires_at).getTime() <= Date.now() &&
              ['active', 'approved'].includes(item.status);

            const shownStatus = actuallyExpired
              ? STATUS.expired
              : status;

            return (
              <article className="card" key={item.id}>
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="photo"
                  />
                )}

                <div className="content">
                  <span
                    className="badge"
                    style={{
                      color: shownStatus.color,
                      background: shownStatus.bg
                    }}
                  >
                    {shownStatus.label}
                  </span>

                  <h2>{item.title}</h2>
                  <p className="description">{item.description}</p>

                  <div className="details">
                    <div>
                      <span>Audience</span>
                      <strong>{item.target_audience}</strong>
                    </div>
                    <div>
                      <span>Package</span>
                      <strong>{item.package_days} Days</strong>
                    </div>
                    <div>
                      <span>Amount</span>
                      <strong>₹{item.amount}</strong>
                    </div>
                    <div>
                      <span>Payment</span>
                      <strong>
                        {payment?.payment_status || 'Not Paid'}
                      </strong>
                    </div>
                  </div>

                  {item.rejection_reason && (
                    <p className="rejection">
                      Rejection Reason: {item.rejection_reason}
                    </p>
                  )}

                  {item.starts_at && (
                    <p className="date">
                      Started: {formatDate(item.starts_at)}
                    </p>
                  )}

                  {item.expires_at && (
                    <p className="date">
                      Expires: {formatDate(item.expires_at)}
                    </p>
                  )}

                  <p className="date">
                    Created: {formatDate(item.created_at)}
                  </p>

                  {item.status === 'pending_approval' && (
                    <p className="notice">
                      Payment received. Admin approval pending.
                    </p>
                  )}

                  {item.status === 'pending_payment' && (
                    <p className="notice">
                      Payment not confirmed. If money was deducted,
                      contact support before paying again.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f4f7f4;
          padding: 30px 15px 70px;
          color: #17251b;
        }
        .container { max-width: 1000px; margin: auto; }
        .back { color: #166534; text-decoration: none; }
        .heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          margin: 25px 0 15px;
        }
        h1 { margin: 0; font-size: 30px; }
        .heading p { color: #64748b; }
        .create {
          background: #07552c;
          color: white;
          padding: 13px 19px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 700;
        }
        .refresh {
          padding: 9px 15px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          margin-bottom: 20px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        .card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,.04);
        }
        .photo {
          width: 100%;
          height: 210px;
          object-fit: cover;
        }
        .content { padding: 20px; }
        .badge {
          display: inline-block;
          border-radius: 30px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 700;
        }
        h2 { font-size: 19px; margin: 15px 0 10px; }
        .description {
          color: #475569;
          line-height: 1.6;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 13px;
          margin: 20px 0;
        }
        .details div {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .details span {
          color: #64748b;
          font-size: 12px;
        }
        .details strong {
          font-size: 14px;
          text-transform: capitalize;
        }
        .date {
          color: #64748b;
          font-size: 12px;
        }
        .rejection {
          color: #b91c1c;
          background: #fef2f2;
          padding: 12px;
          border-radius: 8px;
        }
        .notice {
          color: #1d4ed8;
          background: #eff6ff;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
        }
        .empty {
          text-align: center;
          padding: 50px 20px;
          background: white;
          border-radius: 14px;
          margin-top: 20px;
        }
        .emptyIcon { font-size: 45px; }
        .empty a { color: #166534; font-weight: 700; }
        .error {
          padding: 18px;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 10px;
        }
        .error button {
          display: block;
          margin-top: 10px;
          cursor: pointer;
        }
        @media(max-width: 480px) {
          h1 { font-size: 25px; }
          .create { width: 100%; text-align: center; }
        }
      `}</style>
    </main>
  );
}

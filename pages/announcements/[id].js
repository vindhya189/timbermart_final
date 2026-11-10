
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function AnnouncementDetails() {
  const router = useRouter();
  const { id } = router.query;

  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchAnnouncement = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `/api/announcements/${encodeURIComponent(id)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || 'Announcement not found'
          );
        }

        setAnnouncement(result.announcement);
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [router.isReady, id]);

  const formatDate = (date) => {
    if (!date) return 'Not available';

    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={styles.center}>
        Loading announcement...
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div style={styles.center}>
        <h2>Announcement Unavailable</h2>
        <p>{error || 'This announcement is not available.'}</p>
        <button style={styles.button} onClick={() => router.push('/')}>
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{announcement.title} | TimberMart</title>
        <meta
          name="description"
          content={announcement.description?.slice(0, 160)}
        />
      </Head>

      <main style={styles.page}>
        <button
          style={styles.backButton}
          onClick={() => router.back()}
        >
          ← Back
        </button>

        <article style={styles.card}>
          {announcement.image_url && (
            <img
              src={announcement.image_url}
              alt={announcement.title}
              style={styles.image}
            />
          )}

          <div style={styles.content}>
            <div style={styles.badge}>
              <span>Official Announcement</span>
            </div>

            <h1 style={styles.title}>
              {announcement.title}
            </h1>

            <p style={styles.date}>
              Published: {formatDate(announcement.created_at)}
            </p>

            <div style={styles.description}>
              {announcement.description}
            </div>

            <hr style={styles.divider} />

            <h3>Announcement Details</h3>

            <p>
              <strong>Target Audience:</strong>{' '}
              {Array.isArray(announcement.target_audience)
                ? announcement.target_audience.join(', ')
                : announcement.target_audience || 'All Users'}
            </p>

            {announcement.contact_number && (
              <p>
                <strong>Contact:</strong>{' '}
                <a href={`tel:${announcement.contact_number}`}>
                  {announcement.contact_number}
                </a>
              </p>
            )}

            {announcement.website_url && (
              <p>
                <strong>Website:</strong>{' '}
                <a
                  href={announcement.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit Website
                </a>
              </p>
            )}

            {announcement.expires_at && (
              <p>
                <strong>Valid Until:</strong>{' '}
                {formatDate(announcement.expires_at)}
              </p>
            )}

            <button
              style={styles.button}
              onClick={() => router.push('/')}
            >
              Explore TimberMart
            </button>
          </div>
        </article>
      </main>
    </>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f7f5',
    padding: '25px 15px',
    fontFamily: 'Arial, sans-serif'
  },
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    textAlign: 'center'
  },
  card: {
    maxWidth: 850,
    margin: '20px auto',
    background: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 5px 25px rgba(0,0,0,0.08)'
  },
  image: {
    width: '100%',
    maxHeight: 430,
    objectFit: 'cover',
    display: 'block'
  },
  content: {
    padding: '28px'
  },
  badge: {
    display: 'inline-block',
    background: '#e7f5e9',
    color: '#176b35',
    padding: '8px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 'bold'
  },
  title: {
    fontSize: 30,
    color: '#17251b',
    marginTop: 18,
    lineHeight: 1.3
  },
  date: {
    color: '#777',
    fontSize: 14,
    marginBottom: 25
  },
  description: {
    whiteSpace: 'pre-wrap',
    lineHeight: 1.8,
    fontSize: 16,
    color: '#333',
    overflowWrap: 'anywhere'
  },
  divider: {
    border: 0,
    borderTop: '1px solid #eee',
    margin: '28px 0'
  },
  backButton: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 16,
    padding: 10
  },
  button: {
    background: '#176b35',
    color: '#fff',
    border: 'none',
    padding: '13px 22px',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 20,
    fontSize: 15
  }
};

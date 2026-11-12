
import '../styles/globals.css';
import Head from 'next/head';
import DPDPConsentBanner from '../components/DPDPConsentBanner.js';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </Head>

      <Component {...pageProps} />
      <DPDPConsentBanner />
    </>
  );
}

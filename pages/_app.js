import '../styles/globals.css';
import DPDPConsentBanner from '../components/DPDPConsentBanner.js';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <DPDPConsentBanner />
    </>
  );
}
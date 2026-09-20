import type { Metadata, Viewport } from 'next';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-mono/700.css';
import './globals.css';
import { PlayerProvider } from '@/lib/client/usePlayer';
import { ToastProvider } from '@/components/ui/Toast';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/nav/Footer';

export const metadata: Metadata = {
  title: { default: 'WICK WARS — Trade the chart. Survive the wick.', template: '%s — WICK WARS' },
  description:
    'WICK WARS is a premium browser trading arcade. Long, short, close. 45 seconds. One chart. Prove it, card it, post it.',
  metadataBase: new URL(process.env.WW_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'WICK WARS',
    description: 'Trade the chart. Survive the wick.',
    siteName: 'WICK WARS',
    type: 'website',
    images: ['/examples/card-win.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WICK WARS',
    description: 'Trade the chart. Survive the wick.',
    images: ['/examples/card-win.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#08090C',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-ww-bg font-sans text-ww-text antialiased">
        <ToastProvider>
          <PlayerProvider>
            <a href="#main" className="skip-link">
              Skip to content
            </a>
            <Header />
            <main id="main">{children}</main>
            <Footer />
          </PlayerProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

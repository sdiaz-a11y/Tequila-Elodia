import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Geist } from 'next/font/google';
import { AppProviders } from '@/components/providers';
import './globals.css';

// Display serif is provisional (docs/BRANDING.md): swap for the official face when it is supplied.
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
});
const sans = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: { default: 'ELODIA OS', template: '%s · ELODIA OS' },
  description: 'Plataforma privada de dirección y expansión de ELODIA',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#0e0e10', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

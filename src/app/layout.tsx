import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/layout/app-providers';

export const metadata: Metadata = {
  title: {
    default: 'Tutuklama Hesaplayıcı',
    template: '%s',
  },
  description: 'San Andreas Ceza Kanunu’na göre ceza süresi, para cezası ve kefalet hesaplayıcı.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="font-body antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

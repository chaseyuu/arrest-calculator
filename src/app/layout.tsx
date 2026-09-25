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
      <head>
        {/* Designed at 1920px wide; on wider screens the root font size grows so every rem-based size
            scales proportionally (same look on 1440p, and popovers keep correct positions). */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){var B=1920;function f(){var z=Math.max(1,window.innerWidth/B);document.documentElement.style.fontSize=z>1?(16*z)+'px':'';}f();window.addEventListener('resize',f);})();" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="font-body antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

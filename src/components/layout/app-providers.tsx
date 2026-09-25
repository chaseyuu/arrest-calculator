'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { I18nProvider } from '@/lib/i18n/client';
import { defaultLocale } from '@/lib/i18n/config';
import { dictionary } from '@/lib/i18n/dictionaries';
import { AppHeader } from './app-header';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <I18nProvider locale={defaultLocale} messages={dictionary}>
        <div className="flex min-h-screen flex-col bg-background">
          <AppHeader />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster />
      </I18nProvider>
    </ThemeProvider>
  );
}

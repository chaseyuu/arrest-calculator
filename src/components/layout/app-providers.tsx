'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { I18nProvider } from '@/lib/i18n/client';
import { defaultLocale } from '@/lib/i18n/config';
import { dictionary } from '@/lib/i18n/dictionaries';
import configData from '../../../data/config.json';
import { AppHeader } from './app-header';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <I18nProvider locale={defaultLocale} messages={dictionary}>
        <div className="min-h-screen flex flex-col bg-background">
          <AppHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-4 text-center text-xs text-muted-foreground px-4">
            <a href={configData.URL_GITHUB} target="_blank" rel="noopener noreferrer" className="underline">
              MDC Panel+
            </a>{' '}
            tabanlıdır (GPL-3.0).
          </footer>
        </div>
        <Toaster />
      </I18nProvider>
    </ThemeProvider>
  );
}

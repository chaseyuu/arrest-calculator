'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { basePath } from '@/lib/gtaw-data';
import { CharacterSwitcher } from './character-switcher';

const DASHBOARD_URL = 'https://chaseyuu.github.io/lspd-tools/';
const SETTINGS_URL = 'https://chaseyuu.github.io/lspd-tools/settings/';

// Theme is shared by all LSPD Tools pages through a cookie on chaseyuu.github.io.
const THEME_COOKIE = 'lspd_theme';
function readThemeCookie(): 'dark' | 'light' | null {
  const m = document.cookie.match(/(?:^|; )lspd_theme=([^;]*)/);
  const v = m ? decodeURIComponent(m[1]) : null;
  return v === 'light' || v === 'dark' ? v : null;
}
function writeThemeCookie(theme: 'dark' | 'light') {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const saved = readThemeCookie();
    if (saved) setTheme(saved);
  }, [setTheme]);

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    writeThemeCookie(next);
  };

  return (
    <header className="sticky top-0 z-40 border-b-4 border-primary bg-header text-header-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
        {/* "LSPD Tools" opens the main dashboard. */}
        <a href={DASHBOARD_URL} className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${basePath}/img/lspd.webp`} alt="LSPD" width={44} height={42} className="h-11 w-auto drop-shadow" />
          <span className="text-lg font-semibold">LSPD Tools</span>
        </a>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Temayı değiştir"
            className="text-white/80 hover:bg-white/10 hover:text-white"
            onClick={toggleTheme}
          >
            <Sun className="hidden h-5 w-5 dark:block" />
            <Moon className="h-5 w-5 dark:hidden" />
          </Button>
          <CharacterSwitcher settingsUrl={SETTINGS_URL} />
        </div>
      </div>
    </header>
  );
}

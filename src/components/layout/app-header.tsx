'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { basePath } from '@/lib/gtaw-data';
import { CharacterSwitcher } from './character-switcher';

const DASHBOARD_URL = 'https://chaseyuu.github.io/lspd-tools/';
const SETTINGS_URL = 'https://chaseyuu.github.io/lspd-tools/settings/';

// Theme is shared by all LSPD Tools pages through a cookie on chaseyuu.github.io.
const THEME_COOKIE = 'lspd_theme';
function readThemeCookie(): 'dark' | 'light' | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
  const v = m ? decodeURIComponent(m[1]) : null;
  return v === 'light' || v === 'dark' ? v : null;
}

export function AppHeader() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const saved = readThemeCookie();
    if (saved) setTheme(saved);
  }, [setTheme]);

  return (
    <header className="sticky top-0 z-40 border-b-4 border-primary bg-header text-white shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.35)]">
      <div className="flex h-16 items-center justify-between gap-3 px-8 max-[720px]:px-4">
        {/* "LSPD Tools" opens the main dashboard. */}
        <a href={DASHBOARD_URL} className="flex items-center gap-3 text-white no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${basePath}/img/lspd.webp`}
            alt="LSPD"
            width={46}
            height={44}
            className="h-11 w-auto [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.5))]"
          />
          <span className="text-[1.125rem] font-semibold leading-[normal]">LSPD Tools</span>
        </a>
        <CharacterSwitcher settingsUrl={SETTINGS_URL} />
      </div>
    </header>
  );
}

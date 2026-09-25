'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { basePath } from '@/lib/gtaw-data';

export function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b-4 border-primary bg-header text-header-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${basePath}/img/lspd.webp`} alt="LSPD" width={44} height={42} className="h-11 w-auto drop-shadow" />
          <span className="text-lg font-semibold">LSPD Tools</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Temayı değiştir"
          className="text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="hidden h-5 w-5 dark:block" />
          <Moon className="h-5 w-5 dark:hidden" />
        </Button>
      </div>
    </header>
  );
}

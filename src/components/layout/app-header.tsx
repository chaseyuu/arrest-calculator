'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Moon, Sun, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="border-b bg-card/50">
      <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Calculator className="h-5 w-5 text-primary" />
          <span>Tutuklama Hesaplayıcı</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Temayı değiştir"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-5 w-5 hidden dark:block" />
          <Moon className="h-5 w-5 dark:hidden" />
        </Button>
      </div>
    </header>
  );
}

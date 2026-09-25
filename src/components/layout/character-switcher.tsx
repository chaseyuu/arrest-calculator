'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, PenLine } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CHARACTERS_EVENT,
  type CharacterData,
  getCharacters,
  isFilled,
  setActiveCharacter,
} from '@/lib/characters';
import { cn } from '@/lib/utils';

const FALLBACK_LABELS = ['Ana Karakter', 'Alt Karakter'];

export function CharacterSwitcher({ settingsUrl }: { settingsUrl: string }) {
  const [data, setData] = useState<CharacterData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setData(getCharacters());
    refresh();
    document.addEventListener(CHARACTERS_EVENT, refresh);
    // The cookie may change on another LSPD Tools tab.
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener(CHARACTERS_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  if (!data) return null;

  const filled = data.list.map((c, i) => ({ c, i: i as 0 | 1 })).filter((x) => isFilled(x.c));
  const triggerClass =
    'inline-flex h-9 max-w-[220px] items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

  if (!filled.length) {
    return (
      <a href={settingsUrl} className={triggerClass}>
        Karakter Tanımla
      </a>
    );
  }

  const label = (i: number) => data.list[i]?.name || FALLBACK_LABELS[i];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClass} aria-label="Karakter seç">
          <span className="truncate">{label(data.active)}</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-70 transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1.5">
        <ul role="listbox" aria-label="Karakter seç">
          {filled.map(({ c, i }) => {
            const selected = i === data.active;
            const sub = [c.rank, c.badge && `#${c.badge}`, c.division].filter(Boolean).join(' · ');
            return (
              <li key={i} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left hover:bg-accent',
                    selected && 'text-primary'
                  )}
                  onClick={() => {
                    setActiveCharacter(i);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mt-0.5 h-4 w-4 shrink-0', !selected && 'invisible')} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{label(i)}</span>
                    {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="my-1 h-px bg-border" />
        <a
          href={settingsUrl}
          className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PenLine className="h-4 w-4" />
          Karakterleri Düzenle
        </a>
      </PopoverContent>
    </Popover>
  );
}

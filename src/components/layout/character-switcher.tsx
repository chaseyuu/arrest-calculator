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
  // Mirrors .char-trigger in lspd-tools/assets/theme.css (sizes in rem so page scaling applies).
  const triggerClass =
    'inline-flex h-[2.375rem] max-w-[13.75rem] items-center gap-1.5 rounded-md border border-transparent px-3 text-[0.9375rem] font-semibold text-white no-underline transition-colors hover:border-white/[.12] hover:bg-white/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:border-white/[.12] data-[state=open]:bg-white/[.08]';

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
          <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-70 transition-transform duration-150', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto min-w-[15rem] rounded-lg bg-white p-1 text-foreground shadow-[0_0.625rem_1.5rem_rgba(15,23,42,0.15)] dark:bg-[hsl(215_22%_15%)] dark:shadow-[0_0.625rem_1.5rem_rgba(0,0,0,0.35)]"
      >
        <ul role="listbox" aria-label="Karakter seç" className="m-0 list-none p-0">
          {filled.map(({ c, i }) => {
            const selected = i === data.active;
            const sub = [c.rank, c.badge && `#${c.badge}`, c.division].filter(Boolean).join(' · ');
            return (
              <li
                key={i}
                role="option"
                aria-selected={selected}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 hover:bg-primary/[.18]"
                onClick={() => {
                  setActiveCharacter(i);
                  setOpen(false);
                }}
              >
                <Check className={cn('h-4 w-4 shrink-0 text-primary', !selected && 'invisible')} strokeWidth={2.5} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold leading-[normal]">{label(i)}</span>
                  {sub && <span className="truncate text-xs leading-[normal] text-muted-foreground">{sub}</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <a
          href={settingsUrl}
          className="mt-1 flex items-center gap-2 rounded-b-md border-t px-2.5 py-2 text-[0.8125rem] leading-[normal] text-muted-foreground no-underline hover:text-foreground"
        >
          <PenLine className="h-3.5 w-3.5" />
          Karakterleri Düzenle
        </a>
      </PopoverContent>
    </Popover>
  );
}

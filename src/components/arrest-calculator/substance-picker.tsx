'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface DepaCategory {
  letter?: string;
  title: string;
  substances: string[];
}

/** Most serious first. */
const CATEGORY_ORDER = ['A', 'B', 'C', 'D', 'T'];

/** Category letter for every DEPA substance name. */
export function substanceCategoryMap(categories: DepaCategory[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of categories) {
    const letter = c.letter ?? c.title.slice(-1);
    for (const s of c.substances) map[s] = letter;
  }
  return map;
}

/**
 * Penal code rule: the most serious category among the substances found sets the
 * penalty (categories are never added together).
 */
export function summarizeSubstances(substances: string[], categoryOf: Record<string, string>) {
  const valid = substances.filter((name) => name && categoryOf[name]);
  if (valid.length === 0) return { category: null as string | null, decisive: null as string | null };
  const decisive = [...valid].sort(
    (a, b) => CATEGORY_ORDER.indexOf(categoryOf[a]) - CATEGORY_ORDER.indexOf(categoryOf[b]),
  )[0];
  return { category: categoryOf[decisive], decisive };
}

interface Props {
  id: number;
  substances: string[];
  categories: DepaCategory[];
  categoryOf: Record<string, string>;
  onChange: (next: string[]) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  /** 606 only: total grams found (every N grams adds time). */
  gramStep?: { grams: number } | null;
  grams?: number | null;
  onGramsChange?: (grams: number | null) => void;
}

export function SubstancePicker({
  id,
  substances,
  categories,
  categoryOf,
  onChange,
  t,
  gramStep,
  grams,
  onGramsChange,
}: Props) {
  const rows = substances.length > 0 ? substances : [''];
  const summary = summarizeSubstances(rows, categoryOf);

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t('substances.title')}</p>
        <p className="text-xs text-muted-foreground">{t('substances.hint')}</p>
      </div>

      {rows.map((name, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select
            value={name}
            onValueChange={(value) => onChange(rows.map((r, i) => (i === index ? value : r)))}
          >
            <SelectTrigger id={`substance-${id}-${index}`} className="h-9 flex-1" aria-label={t('substances.substance')}>
              <SelectValue placeholder={t('placeholders.selectOffense')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectGroup key={c.title}>
                  <SelectLabel>{c.title}</SelectLabel>
                  {c.substances.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-red-500 hover:text-red-700"
            aria-label={t('substances.remove')}
            disabled={rows.length === 1}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, ''])}>
          <Plus className="mr-1 h-4 w-4" /> {t('substances.add')}
        </Button>
        <p className="text-sm">
          {summary.category ? (
            <>
              <span className="font-semibold">{t('substances.result', { category: summary.category })}</span>
              <span className="text-muted-foreground"> {t('substances.basedOn', { name: summary.decisive! })}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{t('substances.empty')}</span>
          )}
        </p>
      </div>

      {gramStep && onGramsChange && (
        <div className="flex flex-wrap items-center gap-3 border-t pt-3">
          <Label htmlFor={`grams-${id}`} className="text-sm font-medium">
            {t('substances.totalGrams')}
          </Label>
          <Input
            id={`grams-${id}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder="0"
            className="h-9 w-28"
            value={grams ?? ''}
            onChange={(e) => {
              const n = Number(e.target.value);
              onGramsChange(e.target.value === '' || !Number.isFinite(n) || n <= 0 ? null : n);
            }}
          />
          <span className="text-xs text-muted-foreground">
            {t('substances.gramStepNote', { grams: gramStep.grams })}
          </span>
        </div>
      )}
    </div>
  );
}

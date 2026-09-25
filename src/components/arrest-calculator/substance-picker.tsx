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

export interface Substance {
  name: string;
  grams: number;
}

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
 * The substance with the most grams decides the category (they are never added
 * together); on a tie the more serious category wins. Grams are summed.
 */
export function summarizeSubstances(substances: Substance[], categoryOf: Record<string, string>) {
  const valid = substances.filter((s) => s.name && categoryOf[s.name] && s.grams > 0);
  if (valid.length === 0) return { category: null as string | null, total: 0, dominant: null as Substance | null };
  const dominant = [...valid].sort(
    (a, b) =>
      b.grams - a.grams ||
      CATEGORY_ORDER.indexOf(categoryOf[a.name]) - CATEGORY_ORDER.indexOf(categoryOf[b.name]),
  )[0];
  const total = Math.round(valid.reduce((sum, s) => sum + s.grams, 0) * 100) / 100;
  return { category: categoryOf[dominant.name], total, dominant };
}

interface Props {
  id: number;
  substances: Substance[];
  categories: DepaCategory[];
  categoryOf: Record<string, string>;
  onChange: (next: Substance[]) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  gramStepNote?: string;
}

export function SubstancePicker({ id, substances, categories, categoryOf, onChange, t, gramStepNote }: Props) {
  const rows = substances.length > 0 ? substances : [{ name: '', grams: 0 }];
  const summary = summarizeSubstances(rows, categoryOf);

  const update = (index: number, patch: Partial<Substance>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t('substances.title')}</p>
        <p className="text-xs text-muted-foreground">{t('substances.hint')}</p>
      </div>

      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            {index === 0 && <Label htmlFor={`substance-${id}-${index}`}>{t('substances.substance')}</Label>}
            <Select value={row.name} onValueChange={(value) => update(index, { name: value })}>
              <SelectTrigger id={`substance-${id}-${index}`} className="h-9">
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
          </div>
          <div className="w-28 space-y-1.5">
            {index === 0 && <Label htmlFor={`grams-${id}-${index}`}>{t('substances.grams')}</Label>}
            <Input
              id={`grams-${id}-${index}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="0"
              className="h-9"
              value={row.grams || ''}
              onChange={(e) => update(index, { grams: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, { name: '', grams: 0 }])}>
          <Plus className="mr-1 h-4 w-4" /> {t('substances.add')}
        </Button>
        <p className="text-sm">
          {summary.category ? (
            <>
              <span className="font-semibold">
                {t('substances.result', { category: summary.category, total: summary.total })}
              </span>
              <span className="text-muted-foreground">
                {' '}
                {t('substances.basedOn', { name: summary.dominant!.name, grams: summary.dominant!.grams })}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{t('substances.empty')}</span>
          )}
        </p>
      </div>
      {gramStepNote && <p className="text-xs text-muted-foreground">{gramStepNote}</p>}
    </div>
  );
}

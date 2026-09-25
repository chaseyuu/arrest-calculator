import bailData from '../../data/bail.json';
import type { Charge } from '@/stores/charge-store';

type BailValue = number | null; // null = OTOMATİK KEFALET YOK
type BailEntry = { title: string; bail?: BailValue; variants?: Record<string, BailValue> };

const table = bailData.charges as Record<string, BailEntry>;

export type BailLookup =
  | { status: 'missing' } // charge is not in the bail sheet
  | { status: 'noAutoBail' } // OTOMATİK KEFALET YOK
  | { status: 'amount'; amount: number }; // Tam Kefalet Tutarı

/**
 * Full bail amount ("Tam Kefalet Tutarı") for a charge, from the LEO bail sheet.
 * Rows are keyed by the 3-digit article number; some articles are split by
 * drug category (A/B/C/D/T).
 */
export function lookupBail(charge: Charge, category: string | null): BailLookup {
  const base = charge.id.match(/^\d{3}/)?.[0];
  const entry = base ? table[base] : undefined;
  if (!entry) return { status: 'missing' };

  // Felony/Misdemeanor splits are already collapsed to the higher amount in bail.json;
  // only drug categories (A/B/C/D/T) still have separate amounts.
  let value: BailValue | undefined = entry.bail;
  const byCategory = category ? entry.variants?.[`cat:${category}`] : undefined;
  if (byCategory !== undefined) value = byCategory;

  if (value === undefined) return { status: 'missing' };
  if (value === null) return { status: 'noAutoBail' };
  return { status: 'amount', amount: value };
}

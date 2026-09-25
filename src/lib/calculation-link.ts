import type { PenalCode, SelectedCharge } from '@/stores/charge-store';

// Same encoding the original MDC Panel+ uses for shareable calculation links:
// c=<class><chargeId>-<offense>-<additionIndex>[-<drugCategoryIndex>] and pv=1 for parole violators.
const additionMapping: { [key: string]: number } = {
  Offender: 1,
  Accomplice: 2,
  Accessory: 3,
  Conspiracy: 4,
  Attempt: 5,
  Solicitation: 6,
  'Parole Violation': 7,
};

export function buildCalculationQuery(
  charges: SelectedCharge[],
  penalCode: PenalCode,
  isParoleViolator: boolean,
  hasPriorArrest: boolean,
): string {
  const parts: string[] = [];
  for (const row of charges) {
    const details = row.chargeId ? penalCode[row.chargeId] : null;
    if (!details) continue;
    const additionIndex = additionMapping[row.addition || 'Offender'] ?? 1;
    let chargeStr = `${row.class?.toLowerCase()}${details.id}-${row.offense}-${additionIndex}`;
    if (details.drugs && row.category) {
      const categoryIndex = Object.keys(details.drugs).find((key) => details.drugs![key] === row.category);
      if (categoryIndex) chargeStr += `-${categoryIndex}`;
    }
    parts.push(`c=${encodeURIComponent(chargeStr)}`);
  }
  if (isParoleViolator) parts.push('pv=1');
  parts.push(`pa=${hasPriorArrest ? 1 : 0}`); // prior arrest (affects bail)
  return parts.join('&');
}

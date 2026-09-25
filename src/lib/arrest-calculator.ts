
import type { SelectedCharge, Charge, Addition, PenalCode } from '@/stores/charge-store';
import additionsData from '../../data/additions.json';
import config from '../../data/config.json';
import { areStreetCharges } from './code-enhancement';
import { lookupBail } from './bail';

const formatTimeInMinutes = (time: { days: number; hours: number; min: number }) => {
  if (!time) return 0;
  return time.days * 1440 + time.hours * 60 + time.min;
};

export interface ChargeResult {
  row: SelectedCharge;
  chargeDetails: Charge;
  additionDetails?: Addition;
  paroleAdditionDetails?: Addition;
  appliedAdditions: Addition[];
  sentenceMultiplier: number;
  pointsMultiplier: number;
  isModified: boolean;
  original: { minTime: number; maxTime: number; points: number };
  modified: { minTime: number; maxTime: number; points: number };
  fine: number;
  impound: number;
  suspension: number;
  bailAuto: any;
  bailCost: number;
}

export interface CalculationTotals {
  original: { minTime: number; maxTime: number; points: number, impound: number, suspension: number };
  modified: { minTime: number; maxTime: number; points: number, impound: number, suspension: number };
  fine: number;
  bailStatus: { eligible: boolean; discretionary: boolean; noBail: boolean; hasBailCharge: boolean };
  highestBail: number;
}

export interface ArrestCalculation {
  calculationResults: ChargeResult[];
  extras: { title: string; extra: string }[];
  totals: CalculationTotals;
  bailStatus: string;
  minTimeCapped: number;
  maxTimeCapped: number;
  isCapped: boolean;
  impoundCapped: number;
  isImpoundCapped: boolean;
  suspensionCapped: number;
  isSuspensionCapped: boolean;
  isStreetsEligible: boolean;
  /** Why bail was refused: a prior arrest, or a charge with no automatic bail. */
  bailReason: 'PRIOR_ARREST' | 'NO_AUTO_BAIL' | null;
}

// Runs entirely in the browser (the original ran behind /api/arrest-calculator).
export function calculateArrest(
  report: SelectedCharge[],
  isParoleViolator: boolean,
  penalCode: PenalCode,
  hasPriorArrest = false,
): ArrestCalculation {
  const additions: Addition[] = additionsData.additions;

  const paroleViolationAddition = additions.find(a => a.name === config.PAROLE_VIOLATION_DEFINITION);

  const extras = report
    .map(row => {
      const chargeDetails = penalCode[row.chargeId!];
      if (chargeDetails && chargeDetails.extra && chargeDetails.extra !== 'N/A') {
        const typePrefix = `${chargeDetails.type}${row.class}`;
        let title = `${typePrefix} ${chargeDetails.id}. ${chargeDetails.charge}`;
        if (row.offense !== '1') {
          const ordinals: Record<string, string> = {
            '2': 'İkinci Kez',
            '3': 'Üçüncü Kez',
            '4': 'Dördüncü Kez',
            '5': 'Beşinci Kez',
          };
          title += ` (${ordinals[row.offense ?? ''] ?? row.offense})`;
        }
        if (chargeDetails.drugs && row.category) {
          title += ` (Kategori ${row.category})`;
        }
        return { title, extra: chargeDetails.extra };
      }
      return null;
    })
    .filter(Boolean) as { title: string; extra: string }[];

  const calculationResults = report.map(row => {
    const chargeDetails = penalCode[row.chargeId!];
    if (!chargeDetails) return null;

    const additionDetails = additions.find(a => a.name === row.addition);
    const appliedAdditions: Addition[] = [];

    if (additionDetails) {
      appliedAdditions.push(additionDetails);
    }

    let paroleAdditionDetails: Addition | undefined;

    if (isParoleViolator && paroleViolationAddition) {
      paroleAdditionDetails = paroleViolationAddition;
      appliedAdditions.push(paroleViolationAddition);
    }

    const sentenceMultiplier = appliedAdditions.reduce(
      (acc, addition) => acc * (addition.sentence_multiplier ?? 1),
      1
    );
    const pointsMultiplier = appliedAdditions.reduce(
      (acc, addition) => acc * (addition.points_multiplier ?? 1),
      1
    );

    const isDrugCharge = !!chargeDetails.drugs;

    const getTime = (timeObj: any) => {
      if (!timeObj) return { days: 0, hours: 0, min: 0 };
      if (isDrugCharge && row.category) {
        return timeObj[row.category] || { days: 0, hours: 0, min: 0 };
      }
      // e.g. 430/431: the sentence depends on how many times the offence was committed.
      if (chargeDetails.time_by_offence && row.offense) {
        return timeObj[row.offense] || { days: 0, hours: 0, min: 0 };
      }
      return timeObj;
    };

    const getFine = (fineObj: any) => {
      if (!fineObj) return 0;
      if (isDrugCharge && row.category) return fineObj[row.category] || 0;
      return fineObj[row.offense!] || 0;
    };

    const originalMinTime = formatTimeInMinutes(getTime(chargeDetails.time));
    let originalMaxTime = formatTimeInMinutes(getTime(chargeDetails.maxtime));
    if (originalMaxTime < originalMinTime) {
      originalMaxTime = originalMinTime;
    }
    const originalPoints =
      chargeDetails.points_by_offence && row.offense
        ? chargeDetails.points_by_offence[row.offense] ?? 0
        : chargeDetails.points?.[row.class as keyof typeof chargeDetails.points] ?? 0;

    const modifiedMinTime = originalMinTime * sentenceMultiplier;
    const modifiedMaxTime = originalMaxTime * sentenceMultiplier;
    // Each charge is calculated on its own (Başlık VIII, 807): fractional points are rounded
    // to the nearest whole number per charge, and never go below 1.
    const modifiedPoints =
      originalPoints > 0 ? Math.max(1, Math.round(originalPoints * pointsMultiplier)) : 0;

    const fine = getFine(chargeDetails.fine);
    const impound = chargeDetails.impound?.[row.offense as keyof typeof chargeDetails.impound] || 0;
    const suspension = chargeDetails.suspension?.[row.offense as keyof typeof chargeDetails.suspension] || 0;

    // Bail comes from the Turkish LEO bail sheet (data/bail.json), not the penal code.
    const bail = lookupBail(chargeDetails, row.category);
    const bailAuto = bail.status === 'missing' ? null : bail.status === 'amount';
    const bailCost = bail.status === 'amount' ? bail.amount : 0;

    const uniqueAppliedAdditions = appliedAdditions.filter(
      (addition, index, arr) =>
        addition?.name ? arr.findIndex(item => item?.name === addition.name) === index : true
    );

    return {
      row,
      chargeDetails,
      additionDetails,
      paroleAdditionDetails,
      appliedAdditions: uniqueAppliedAdditions,
      sentenceMultiplier,
      pointsMultiplier,
      isModified: sentenceMultiplier !== 1 || pointsMultiplier !== 1,
      original: { minTime: originalMinTime, maxTime: originalMaxTime, points: originalPoints },
      modified: { minTime: modifiedMinTime, maxTime: modifiedMaxTime, points: modifiedPoints },
      fine,
      impound,
      suspension,
      bailAuto,
      bailCost,
    } as ChargeResult;
  }).filter(Boolean) as ChargeResult[];

  
  const totals = calculationResults.reduce(
    (acc, result) => {
      acc.original.minTime += result.original.minTime;
      acc.original.maxTime += result.original.maxTime;
      acc.original.points += result.original.points;

      acc.modified.minTime += result.modified.minTime;
      acc.modified.maxTime += result.modified.maxTime;
      acc.modified.points += result.modified.points;

      acc.fine += result.fine;
      
      const impound = result.impound * result.sentenceMultiplier;
      const suspension = result.suspension * result.sentenceMultiplier;
      
      acc.original.impound += result.impound;
      acc.original.suspension += result.suspension;
      acc.modified.impound += impound;
      acc.modified.suspension += suspension;


      if (result.bailAuto !== null) {
        acc.bailStatus.hasBailCharge = true;
        if (result.bailAuto === false) acc.bailStatus.noBail = true;
        if (result.bailAuto === 2) acc.bailStatus.discretionary = true;
        if (result.bailAuto === true) acc.bailStatus.eligible = true;
      }
      if (result.bailAuto !== false && result.bailCost > acc.highestBail) {
        acc.highestBail = result.bailCost;
      }

      return acc;
    },
    {
      original: { minTime: 0, maxTime: 0, points: 0, impound: 0, suspension: 0 },
      modified: { minTime: 0, maxTime: 0, points: 0, impound: 0, suspension: 0 },
      fine: 0,
      bailStatus: { eligible: false, discretionary: false, noBail: false, hasBailCharge: false },
      highestBail: 0,
    } as CalculationTotals
  );

  // Bail rules:
  // 1. Arrested before -> not eligible.
  // 2. Any charge with no automatic bail -> not eligible.
  // 3. Otherwise eligible, and the bail is the highest full bail amount among the charges.
  let bailReason: ArrestCalculation['bailReason'] = null;
  const getBailStatus = () => {
    if (hasPriorArrest) {
      bailReason = 'PRIOR_ARREST';
      return 'NOT ELIGIBLE';
    }
    if (!totals.bailStatus.hasBailCharge) return 'N/A';
    if (totals.bailStatus.noBail) {
      bailReason = 'NO_AUTO_BAIL';
      return 'NOT ELIGIBLE';
    }
    return 'ELIGIBLE';
  };
  const bailStatus = getBailStatus();

  // Hard cap on the total sentence (min and max), in minutes.
  const maxSentenceMinutes = (config as any).MAX_SENTENCE_MINUTES ?? config.MAX_SENTENCE_DAYS * 1440;
  const minTimeCapped = Math.min(totals.modified.minTime, maxSentenceMinutes);
  const maxTimeCapped = Math.min(totals.modified.maxTime, maxSentenceMinutes);
  const isCapped = totals.modified.minTime > maxSentenceMinutes || totals.modified.maxTime > maxSentenceMinutes;

  const impoundCapped = Math.min(totals.modified.impound, config.MAX_IMPOUND_DAYS);
  const isImpoundCapped = totals.modified.impound > config.MAX_IMPOUND_DAYS;
  const suspensionCapped = Math.min(totals.modified.suspension, config.MAX_SUSPENSION_DAYS);
  const isSuspensionCapped = totals.modified.suspension > config.MAX_SUSPENSION_DAYS;
  const chargesResult = calculationResults.map(
    (result: ChargeResult) => (result.row)
  )
  const chargesResultDetails = calculationResults.map(
    (result: ChargeResult) => (result.chargeDetails)
  )
  const isStreetsEligible = areStreetCharges(chargesResult, chargesResultDetails)
  return {
    calculationResults,
    extras,
    totals,
    bailStatus,
    bailReason,
    minTimeCapped,
    maxTimeCapped,
    isCapped,
    impoundCapped,
    isImpoundCapped,
    suspensionCapped,
    isSuspensionCapped,
    isStreetsEligible,
  };
}

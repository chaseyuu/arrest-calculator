'use client';

import { useChargeStore, type SelectedCharge } from '@/stores/charge-store';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clipboard, Pencil, Link2, Asterisk, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import config from '../../../data/config.json';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { CopyableCard } from '../shared/copyable-card';
import { useScopedI18n } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StreetsAlert } from '../shared/streets-act-warning';
import { calculateArrest, type ArrestCalculation, type ChargeResult } from '@/lib/arrest-calculator';
import { buildCalculationQuery } from '@/lib/calculation-link';
import { basePath, fetchGtawData } from '@/lib/gtaw-data';
import type { PenalCode } from '@/stores/charge-store';

/** ---------- Loading UI ---------- */
function LoadingTableSkeleton() {
  return (
    <Card aria-busy="true" aria-live="polite">
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-hidden rounded-lg border">
          <div className="grid grid-cols-12 gap-4 bg-muted/50 p-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, r) => (
              <div key={r} className="grid grid-cols-12 gap-4 p-3">
                {Array.from({ length: 12 }).map((__, c) => (
                  <Skeleton key={c} className="h-5 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSummarySkeleton() {
  return (
    <Card aria-busy="true">
      <CardHeader>
        <Skeleton className="h-8 w-32" />
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-hidden rounded-lg border">
          <div className="grid grid-cols-8 gap-4 bg-muted/50 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          <div className="grid grid-cols-8 gap-4 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingCopyablesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-10" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
/** -------------------------------- */

interface ArrestCalculatorResultsProps {
  report: SelectedCharge[];
  showCharges?: boolean;
  showStipulations?: boolean;
  showSummary?: boolean;
  showCopyables?: boolean;
  clickToCopy?: boolean;
  showModifyChargesButton?: boolean;
  onModifyCharges?: () => void;
  paroleViolatorOverride?: boolean;
  hasPriorArrestOverride?: boolean;
  currentPointsOverride?: number;
  /** Assigned cell number, 'female' (no cell needed) or null (unknown). */
  cellOverride?: string | null;
}

export function ArrestCalculatorResults({
  report,
  showCharges = false,
  showStipulations = false,
  showSummary = false,
  showCopyables = false,
  clickToCopy = false,
  showModifyChargesButton = false,
  onModifyCharges,
  paroleViolatorOverride,
  hasPriorArrestOverride,
  currentPointsOverride,
  cellOverride,
}: ArrestCalculatorResultsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const {
    setCharges: setChargesForModification,
    isParoleViolator,
    reportIsParoleViolator,
    reportHasPriorArrest,
    hasPriorArrest,
    reportCurrentPoints,
    currentPoints,
    penalCode,
    setPenalCode,
  } = useChargeStore();

  const [data, setData] = useState<ArrestCalculation | null>(null);
  const t = useScopedI18n('arrestCalculation.results');

  const additionNameMap = useMemo(() => {
    const map = new Map<string, string>([
      ['offender', t('additionNames.offender')],
      ['attempt', t('additionNames.attempt')],
      ['accomplice', t('additionNames.accomplice')],
      ['accessory', t('additionNames.accessory')],
      ['conspiracy', t('additionNames.conspiracy')],
      ['solicitation', t('additionNames.solicitation')],
      ['hate crime', t('additionNames.hateCrime')],
    ]);
    map.set(config.PAROLE_VIOLATION_DEFINITION.toLowerCase(), t('additionNames.paroleViolation'));
    return map;
  }, [t]);

  const translateAdditionName = useCallback(
    (name?: string | null) => {
      if (!name) {
        return additionNameMap.get('offender') ?? 'Offender';
      }
      const translation = additionNameMap.get(name.toLowerCase());
      return translation ?? name;
    },
    [additionNameMap],
  );

  const typeLabels = useMemo(
    () => ({
      F: t('types.felony'),
      M: t('types.misdemeanor'),
      I: t('types.infraction'),
      default: t('types.unknown'),
    }),
    [t],
  );

  const getTypeLabel = useCallback(
    (type: string | undefined) => {
      if (!type) return typeLabels.default;
      return typeLabels[type as 'F' | 'M' | 'I'] ?? typeLabels.default;
    },
    [typeLabels],
  );

  const autoBailLabels = useMemo(
    () => ({
      na: t('autoBail.na'),
      noBail: t('autoBail.noBail'),
      auto: t('autoBail.auto'),
      discretionary: t('autoBail.discretionary'),
    }),
    [t],
  );

  const bailStatusLabels = useMemo(
    () => ({
      'N/A': t('bailStatus.na'),
      'NOT ELIGIBLE': t('bailStatus.notEligible'),
      'DISCRETIONARY': t('bailStatus.discretionary'),
      'ELIGIBLE': t('bailStatus.eligible'),
    }),
    [t],
  );

  const yesLabel = t('labels.yes');
  const noLabel = t('labels.no');
  const notAvailableLabel = t('labels.notAvailable');
  const yesWithValue = useCallback((value: string) => t('labels.yesWithValue', { value }), [t]);
  const formatCurrency = useCallback((value: number) => t('currency', { value: value.toLocaleString() }), [t]);

  const zeroLabel = t('time.zero');

  const formatUnit = useCallback(
    (unit: 'days' | 'hours' | 'minutes', count: number) =>
      t(`time.${unit}.${count === 1 ? 'one' : 'other'}`, { count }),
    [t],
  );

  const formatTotalTime = useCallback(
    (totalMinutes: number) => {
      const rounded = Math.round(totalMinutes);
      if (rounded === 0) {
        return { label: zeroLabel, detailed: zeroLabel };
      }

      const days = Math.floor(rounded / 1440);
      const hours = Math.floor((rounded % 1440) / 60);
      const minutes = rounded % 60;

      const parts: string[] = [];
      if (days > 0) parts.push(formatUnit('days', days));
      if (hours > 0) parts.push(formatUnit('hours', hours));
      if (minutes > 0) parts.push(formatUnit('minutes', minutes));

      // Shown as "4320 Dakika (3 Gün)"; under an hour just "45 Dakika".
      const breakdown = parts.join(' ');
      const label = rounded < 60 ? breakdown : t('time.summary', { parts: breakdown, minutes: rounded });

      return { label, detailed: label };
    },
    [formatUnit, t, zeroLabel],
  );

  const formatDays = useCallback(
    (value: number) => {
      const rounded = Math.round(value);
      if (rounded <= 0) return null;
      return formatUnit('days', rounded);
    },
    [formatUnit],
  );

  const formatImpoundDisplay = useCallback(
    (value: number) => {
      const dayLabel = formatDays(value);
      return dayLabel ? yesWithValue(dayLabel) : noLabel;
    },
    [formatDays, yesWithValue, noLabel],
  );

  const formatDaysOrNone = useCallback(
    (value: number) => {
      const dayLabel = formatDays(value);
      return dayLabel ?? noLabel;
    },
    [formatDays, noLabel],
  );

  const getBailStatusLabel = useCallback(
    (status: string) => bailStatusLabels[status as keyof typeof bailStatusLabels] ?? bailStatusLabels['N/A'],
    [bailStatusLabels],
  );

  const getCopyTooltip = useCallback((field: string) => t('charges.copyTooltip', { field }), [t]);
  const getCopyAria = useCallback((field: string) => t('charges.copyAria', { field }), [t]);

  const BailStatusBadge = ({ bailInfo }: { bailInfo: any }) => {
    if (!bailInfo) return <Badge variant="secondary">{autoBailLabels.na}</Badge>;
    if (bailInfo.auto === false) return <Badge variant="destructive">{autoBailLabels.noBail}</Badge>;
    if (bailInfo.auto === true)
      return <Badge className="bg-green-500 hover:bg-green-600 text-white">{autoBailLabels.auto}</Badge>;
    if (bailInfo.auto === 2)
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{autoBailLabels.discretionary}</Badge>;
    return <Badge variant="secondary">{autoBailLabels.na}</Badge>;
  };

  const effectiveParoleStatus =
    paroleViolatorOverride ?? (report.length > 0 ? reportIsParoleViolator : isParoleViolator);

  const effectivePriorArrest =
    hasPriorArrestOverride ?? (report.length > 0 ? reportHasPriorArrest : hasPriorArrest === true);

  const effectiveCurrentPoints =
    currentPointsOverride ?? (report.length > 0 ? reportCurrentPoints : currentPoints ?? 0);

  // Calculated in the browser (the original panel posted to /api/arrest-calculator).
  useEffect(() => {
    if (!penalCode) {
      fetchGtawData('gtaw_penal_code.json')
        .then((res) => res.json())
        .then((code: PenalCode) => setPenalCode(code))
        .catch((err) => console.error('Failed to load penal code:', err));
      return;
    }
    try {
      setData(calculateArrest(report, effectiveParoleStatus, penalCode, effectivePriorArrest));
    } catch (err) {
      console.error('Failed to load arrest calculation:', err);
    }
  }, [report, effectiveParoleStatus, effectivePriorArrest, penalCode, setPenalCode]);

  if (!data) {
    return (
      <div className="space-y-6">
        <LoadingTableSkeleton />
        <LoadingSummarySkeleton />
        <LoadingCopyablesSkeleton />
      </div>
    );
  }

  // NOTE: include Streets eligibility from API while keeping i18n-based formatters defined above.
  const {
    calculationResults,
    extras,
    totals,
    bailStatus,
    minTimeCapped,
    maxTimeCapped,
    isCapped,
    impoundCapped,
    isImpoundCapped,
    suspensionCapped,
    isSuspensionCapped,
    isStreetsEligible,
    bailReason,
  } = data;

  const handleCopyToClipboard = (text: string | number, label?: string) => {
    navigator.clipboard.writeText(text.toString());
    toast({
      title: t('toasts.copiedTitle'),
      description: label
        ? t('toasts.copiedDescriptionWithLabel', { label, value: text })
        : t('toasts.copiedDescription', { value: text }),
    });
  };

  const handleModifyCharges = () => {
    onModifyCharges?.();
    setChargesForModification(report);
    router.push('/?modify=true');
  };

  const handleCopyCalculationLink = () => {
    if (!penalCode || calculationResults.length === 0) return;
    const query = buildCalculationQuery(
      calculationResults.map((result) => result.row),
      penalCode,
      effectiveParoleStatus,
      effectivePriorArrest,
      effectiveCurrentPoints,
    );
    const url = `${window.location.origin}${basePath}/arrest-calculation/?${query}`;
    navigator.clipboard.writeText(url);
    toast({
      title: t('toasts.linkCopiedTitle'),
      description: t('toasts.linkCopiedDescription'),
    });
  };

  const hasAnyModifiers = calculationResults.some((r) => r.isModified);

  // Criminal points: existing points + points from these charges (warn above 30).
  const chargePoints = Math.round(totals.modified.points);
  const newCriminalPoints = effectiveCurrentPoints + chargePoints;
  const isOverPointLimit = newCriminalPoints > ((config as any).MAX_CRIMINAL_POINTS ?? 30);

  const charges = calculationResults.map((result) => {
    const {
      row,
      chargeDetails,
      appliedAdditions,
      isModified,
      original,
      modified,
      fine,
      impound,
      suspension,
      bailAuto,
      bailCost,
    } = result as ChargeResult;

    const typePrefix = `${chargeDetails.type}${row.class}`;
    let title = t('charges.title', {
      prefix: typePrefix,
      id: chargeDetails.id,
      charge: chargeDetails.charge,
    });

    if (chargeDetails.drugs && row.category) {
      title += ` ${t('charges.categorySuffix', { category: row.category })}`;
      if (row.grams) title += ` (${row.grams} g)`;
    } else if (row.offense && row.offense !== '1') {
      title += ` ${t('charges.offenseSuffix', { label: t(`offenseOrdinals.${row.offense}`, undefined, row.offense) })}`;
    }

    const additions = appliedAdditions ?? [];
    const additionDisplayNames =
      additions.length > 0
        ? additions.map((add) => translateAdditionName(add.name)).join(' + ')
        : translateAdditionName(row.addition || 'Offender');

    const typeDisplay = getTypeLabel(chargeDetails.type);
    const typeColorClass =
      chargeDetails.type === 'F'
        ? 'text-red-500'
        : chargeDetails.type === 'M'
        ? 'text-yellow-500'
        : chargeDetails.type === 'I'
        ? 'text-green-500'
        : '';

    const minTime = formatTotalTime(modified.minTime);
    const maxTime = formatTotalTime(modified.maxTime);
    const originalMinTime = formatTotalTime(original.minTime);
    const originalMaxTime = formatTotalTime(original.maxTime);

    return {
      key: row.uniqueId,
      title,
      additionDisplayNames,
      additions,
      isModified,
      offense: row.offense,
      courtOnly: chargeDetails.court_only === true,
      offenseLabel: row.offense ? t(`offenseOrdinals.${row.offense}`, undefined, row.offense) : null,
      typeDisplay,
      typeColorClass,
      minTime,
      maxTime,
      originalMinTime,
      originalMaxTime,
      pointsDisplay: Math.round(modified.points),
      originalPoints: original.points,
      fine,
      fineDisplay: formatCurrency(fine),
      impoundDisplay: formatImpoundDisplay(impound),
      suspensionDisplay: formatImpoundDisplay(suspension),
      bailAuto,
      bailCost,
      bailCostDisplay:
        bailAuto === true
          ? formatCurrency(bailCost)
          : bailAuto === false
            ? autoBailLabels.noBail
            : notAvailableLabel,
    };
  });

  const minTimeCappedDisplay = formatTotalTime(minTimeCapped);
  const maxTimeCappedDisplay = formatTotalTime(maxTimeCapped);
  const originalMinDisplay = formatTotalTime(totals.original.minTime);
  const originalMaxDisplay = formatTotalTime(totals.original.maxTime);
  const modifiedMinDisplay = formatTotalTime(totals.modified.minTime);
  const modifiedMaxDisplay = formatTotalTime(totals.modified.maxTime);
  const totalFineDisplay = formatCurrency(totals.fine);

  const isNoBail = bailStatus === 'NOT ELIGIBLE';
  const isDiscretionary = bailStatus === 'DISCRETIONARY';
  const displayBailCost = isNoBail ? 0 : totals.highestBail;
  const highestBailDisplay = formatCurrency(displayBailCost);

  let bailColorClass = '';
  let bailTooltip = '';
  if (isNoBail) {
    bailColorClass = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900';
    bailTooltip =
      bailReason === 'PRIOR_ARREST' ? t('priorArrest.notEligibleReason') : t('priorArrest.noAutoBailReason');
  } else if (isDiscretionary) {
    bailColorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900';
    bailTooltip = '';
  }

  const renderOverallBailStatus = () => {
    if (bailStatus === 'NOT ELIGIBLE') {
      return <Badge variant="destructive">{getBailStatusLabel(bailStatus)}</Badge>;
    }
    if (bailStatus === 'DISCRETIONARY') {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{getBailStatusLabel(bailStatus)}</Badge>;
    }
    if (bailStatus === 'ELIGIBLE') {
      return <Badge className="bg-green-500 hover:bg-green-600 text-white">{getBailStatusLabel(bailStatus)}</Badge>;
    }
    return <Badge variant="secondary">{getBailStatusLabel('N/A')}</Badge>;
  };

  // Parole violation or a court-only charge (001-004): the case goes to court, so no sentence is shown.
  const isParoleCourt = effectiveParoleStatus === true;
  const isMandatoryCourt = isParoleCourt || data.mandatoryCourt === true;
  const mandatoryCourtLabel = t('mandatoryCourt.label');

  // Summary tiles: each one copies its raw value when clicked.
  const summaryTiles: {
    key: string;
    label: string;
    value: React.ReactNode;
    copy: string | number;
    sub?: string;
    className?: string;
  }[] = [
    {
      key: 'min',
      label: t('summary.table.minTime'),
      value: isMandatoryCourt ? mandatoryCourtLabel : minTimeCappedDisplay.label,
      copy: isMandatoryCourt ? mandatoryCourtLabel : Math.round(minTimeCapped),
    },
    {
      key: 'max',
      label: t('summary.table.maxTime'),
      value: isMandatoryCourt ? mandatoryCourtLabel : maxTimeCappedDisplay.label,
      copy: isMandatoryCourt ? mandatoryCourtLabel : Math.round(maxTimeCapped),
    },
    {
      key: 'cellId',
      label: t('summary.cellId'),
      value: cellOverride === 'female' ? t('summary.cellNotNeeded') : cellOverride ?? '—',
      copy: cellOverride === 'female' ? t('summary.cellNotNeeded') : cellOverride ?? '',
    },
    {
      key: 'newPoints',
      label: t('criminalPoints.new'),
      value: newCriminalPoints,
      copy: newCriminalPoints,
      sub: t('criminalPoints.breakdown', { current: effectiveCurrentPoints, added: chargePoints }),
      className: isOverPointLimit
        ? 'border-red-300 text-red-700 dark:border-red-900 dark:text-red-400'
        : undefined,
    },
    { key: 'fine', label: t('summary.table.fine'), value: totalFineDisplay, copy: totals.fine },
    {
      key: 'impound',
      label: t('summary.table.impound'),
      value: formatDaysOrNone(impoundCapped),
      copy: Math.round(impoundCapped),
    },
    {
      key: 'suspension',
      label: t('summary.table.suspension'),
      value: formatDaysOrNone(suspensionCapped),
      copy: Math.round(suspensionCapped),
    },
    {
      key: 'bail',
      label: t('summary.table.highestBail'),
      value: isMandatoryCourt ? mandatoryCourtLabel : isNoBail ? '—' : highestBailDisplay,
      copy: isMandatoryCourt ? mandatoryCourtLabel : displayBailCost,
      className: isMandatoryCourt
        ? undefined
        : isNoBail
        ? 'border-red-300 text-red-700 dark:border-red-900 dark:text-red-400'
        : bailStatus === 'ELIGIBLE'
          ? 'border-green-300 dark:border-green-900'
          : undefined,
    },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {showCharges && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('charges.cardTitle')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyCalculationLink}>
                  <Link2 className="mr-2 h-4 w-4" />
                  {t('charges.copyLink')}
                </Button>
                {showModifyChargesButton && (
                  <Button variant="outline" size="sm" onClick={handleModifyCharges}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t('charges.modify')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="hidden w-full overflow-x-auto sm:block">
                <Table className="w-full sm:min-w-[960px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('charges.table.title')}</TableHead>
                      <TableHead>{t('charges.table.addition')}</TableHead>
                      <TableHead>{t('charges.table.offense')}</TableHead>
                      <TableHead>{t('charges.table.type')}</TableHead>
                      <TableHead>{t('charges.table.minTime')}</TableHead>
                      <TableHead>{t('charges.table.maxTime')}</TableHead>
                      <TableHead>{t('charges.table.points')}</TableHead>
                      <TableHead>{t('charges.table.fine')}</TableHead>
                      <TableHead>{t('charges.table.impound')}</TableHead>
                      <TableHead>{t('charges.table.suspension')}</TableHead>
                      <TableHead>{t('charges.table.autoBail')}</TableHead>
                      <TableHead>{t('charges.table.bail')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {charges.map((charge) => (
                      <TableRow key={charge.key}>
                        <TableCell
                          className={cn('font-medium', clickToCopy && 'cursor-pointer hover:text-primary')}
                          onClick={
                            clickToCopy
                              ? () => handleCopyToClipboard(charge.title, t('charges.table.title'))
                              : undefined
                          }
                          title={clickToCopy ? getCopyTooltip(t('charges.table.title')) : undefined}
                        >
                          {charge.title}
                        </TableCell>
                        <TableCell>
                          {charge.isModified && charge.additions.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help font-bold text-yellow-500">
                                  {charge.additionDisplayNames}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="space-y-2">
                                {charge.additions.map((addition) => (
                                  <div key={addition.name} className="space-y-1">
                                    <p className="font-semibold">{translateAdditionName(addition.name)}</p>
                                    <p>{t('charges.tooltip.sentenceMultiplier', { value: addition.sentence_multiplier })}</p>
                                    <p>{t('charges.tooltip.pointsMultiplier', { value: addition.points_multiplier })}</p>
                                  </div>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span>{charge.additionDisplayNames}</span>
                          )}
                        </TableCell>
                        <TableCell>{charge.offenseLabel}</TableCell>
                        <TableCell>
                          <span className={cn('font-bold', charge.typeColorClass)}>{charge.typeDisplay}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isParoleCourt || charge.courtOnly ? mandatoryCourtLabel : charge.minTime.label}
                            {charge.isModified && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Asterisk className="h-3 w-3 text-yellow-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('charges.tooltip.originalTime', { value: charge.originalMinTime.detailed })}</p>
                                  <p>{t('charges.tooltip.modifiedTime', { value: charge.minTime.detailed })}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isParoleCourt || charge.courtOnly ? mandatoryCourtLabel : charge.maxTime.label}
                            {charge.isModified && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Asterisk className="h-3 w-3 text-yellow-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('charges.tooltip.originalTime', { value: charge.originalMaxTime.detailed })}</p>
                                  <p>{t('charges.tooltip.modifiedTime', { value: charge.maxTime.detailed })}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {charge.pointsDisplay}
                            {charge.isModified && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Asterisk className="h-3 w-3 text-yellow-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('charges.tooltip.originalPoints', { value: charge.originalPoints })}</p>
                                  <p>{t('charges.tooltip.modifiedPoints', { value: charge.pointsDisplay })}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(clickToCopy && 'cursor-pointer hover:text-primary')}
                          onClick={
                            clickToCopy
                              ? () => handleCopyToClipboard(charge.fine, t('copyLabels.rawFine'))
                              : undefined
                          }
                          title={clickToCopy ? getCopyTooltip(t('copyLabels.rawFine')) : undefined}
                          aria-label={clickToCopy ? getCopyAria(t('copyLabels.rawFine')) : undefined}
                        >
                          {charge.fineDisplay}
                        </TableCell>
                        <TableCell>{charge.impoundDisplay}</TableCell>
                        <TableCell>{charge.suspensionDisplay}</TableCell>
                        <TableCell>
                          {isParoleCourt ? mandatoryCourtLabel : <BailStatusBadge bailInfo={{ auto: charge.bailAuto }} />}
                        </TableCell>
                        <TableCell>{isParoleCourt ? mandatoryCourtLabel : charge.bailCostDisplay}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-4 sm:hidden">
                {charges.map((charge) => (
                  <div
                    key={charge.key}
                    className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm text-center sm:text-left"
                  >
                    <div
                      className={cn('text-base font-semibold', clickToCopy && 'cursor-pointer hover:text-primary')}
                      onClick={
                        clickToCopy ? () => handleCopyToClipboard(charge.title, t('charges.table.title')) : undefined
                      }
                    >
                      {charge.title}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs uppercase text-muted-foreground sm:justify-start">
                      <span className={cn('font-semibold', charge.typeColorClass)}>{charge.typeDisplay}</span>
                      {charge.offenseLabel && <span>{charge.offenseLabel}</span>}
                    </div>
                    <div className="mt-3 text-sm text-center sm:text-left">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {t('charges.table.addition')}
                      </p>
                      {charge.isModified && charge.additions.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="mt-1 inline-flex cursor-help font-semibold text-yellow-500">
                              {charge.additionDisplayNames}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="space-y-2">
                            {charge.additions.map((addition) => (
                              <div key={addition.name} className="space-y-1">
                                <p className="font-semibold">{translateAdditionName(addition.name)}</p>
                                <p>{t('charges.tooltip.sentenceMultiplier', { value: addition.sentence_multiplier })}</p>
                                <p>{t('charges.tooltip.pointsMultiplier', { value: addition.points_multiplier })}</p>
                              </div>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="mt-1 block">{charge.additionDisplayNames}</span>
                      )}
                    </div>
                    <dl className="mt-3 space-y-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">
                          {t('charges.table.minTime')}
                        </dt>
                        <dd className="mt-1 flex items-center justify-center gap-1 sm:justify-start">
                          {isParoleCourt || charge.courtOnly ? mandatoryCourtLabel : charge.minTime.label}
                          {charge.isModified && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Asterisk className="h-3 w-3 text-yellow-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('charges.tooltip.originalTime', { value: charge.originalMinTime.detailed })}</p>
                                <p>{t('charges.tooltip.modifiedTime', { value: charge.minTime.detailed })}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">
                          {t('charges.table.maxTime')}
                        </dt>
                        <dd className="mt-1 flex items-center justify-center gap-1 sm:justify-start">
                          {isParoleCourt || charge.courtOnly ? mandatoryCourtLabel : charge.maxTime.label}
                          {charge.isModified && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Asterisk className="h-3 w-3 text-yellow-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('charges.tooltip.originalTime', { value: charge.originalMaxTime.detailed })}</p>
                                <p>{t('charges.tooltip.modifiedTime', { value: charge.maxTime.detailed })}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">
                          {t('charges.table.points')}
                        </dt>
                        <dd className="mt-1 flex items-center justify-center gap-1 sm:justify-start">
                          {charge.pointsDisplay}
                          {charge.isModified && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Asterisk className="h-3 w-3 text-yellow-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('charges.tooltip.originalPoints', { value: charge.originalPoints })}</p>
                                <p>{t('charges.tooltip.modifiedPoints', { value: charge.pointsDisplay })}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">
                          {t('charges.table.fine')}
                        </dt>
                        <dd
                          className={cn('mt-1', clickToCopy && 'cursor-pointer hover:text-primary')}
                          onClick={
                            clickToCopy
                              ? () => handleCopyToClipboard(charge.fine, t('copyLabels.rawFine'))
                              : undefined
                          }
                          title={clickToCopy ? getCopyTooltip(t('copyLabels.rawFine')) : undefined}
                          aria-label={clickToCopy ? getCopyAria(t('copyLabels.rawFine')) : undefined}
                        >
                          {charge.fineDisplay}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">
                          {t('charges.table.impound')}
                        </dt>
                        <dd className="mt-1">{charge.impoundDisplay}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">
                          {t('charges.table.suspension')}
                        </dt>
                        <dd className="mt-1">{charge.suspensionDisplay}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">
                          {t('charges.table.autoBail')}
                        </dt>
                        <dd className="mt-1">
                          {isParoleCourt ? mandatoryCourtLabel : <BailStatusBadge bailInfo={{ auto: charge.bailAuto }} />}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-foreground">
                          {t('charges.table.bail')}
                        </dt>
                        <dd className="mt-1">{isParoleCourt ? mandatoryCourtLabel : charge.bailCostDisplay}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isStreetsEligible && <StreetsAlert />}

        {showSummary && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <CardTitle>{t('summary.title')}</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('summary.copyHint')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('summary.copyHint')}</p>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="space-y-4">
              {isMandatoryCourt && (
                <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 font-medium text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{isParoleCourt ? t('mandatoryCourt.notice') : t('mandatoryCourt.chargeNotice')}</p>
                </div>
              )}
              {isCapped && !isMandatoryCourt && (
                <Alert variant="warning" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t('summary.alerts.sentence.title')}</AlertTitle>
                  <AlertDescription>
                    {t('summary.alerts.sentence.description', {
                      maxMinutes: (config as any).MAX_SENTENCE_MINUTES ?? config.MAX_SENTENCE_DAYS * 1440,
                      maxLabel: formatTotalTime((config as any).MAX_SENTENCE_MINUTES ?? config.MAX_SENTENCE_DAYS * 1440).label,
                    })}
                    <br />
                    <b>{t('summary.alerts.sentence.originalMinLabel')}</b> {modifiedMinDisplay.detailed}
                    <br />
                    <b>{t('summary.alerts.sentence.originalMaxLabel')}</b> {modifiedMaxDisplay.detailed}
                  </AlertDescription>
                </Alert>
              )}
              {isImpoundCapped && (
                <Alert variant="warning" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t('summary.alerts.impound.title')}</AlertTitle>
                  <AlertDescription>
                    {t('summary.alerts.impound.description', {
                      maxDays: config.MAX_IMPOUND_DAYS,
                      value: formatDaysOrNone(totals.modified.impound),
                    })}
                  </AlertDescription>
                </Alert>
              )}
              {isSuspensionCapped && (
                <Alert variant="warning" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t('summary.alerts.suspension.title')}</AlertTitle>
                  <AlertDescription>
                    {t('summary.alerts.suspension.description', {
                      maxDays: config.MAX_SUSPENSION_DAYS,
                      value: formatDaysOrNone(totals.modified.suspension),
                    })}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summaryTiles.map((tile) => (
                  <button
                    key={tile.key}
                    type="button"
                    onClick={() => handleCopyToClipboard(tile.copy, tile.label)}
                    className={cn(
                      'group relative flex flex-col items-start justify-start rounded-lg border p-4 text-left transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      tile.className,
                    )}
                  >
                    <Clipboard className="absolute right-3 top-3 h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-100" />
                    <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
                    <p className="mt-1 text-lg font-semibold leading-tight">{tile.value}</p>
                    {tile.sub && <p className="mt-1 text-xs text-muted-foreground">{tile.sub}</p>}
                  </button>
                ))}
              </div>

              {!isMandatoryCourt && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-3 font-medium',
                  isNoBail
                    ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300'
                    : bailStatus === 'ELIGIBLE'
                      ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300'
                      : 'text-muted-foreground',
                )}
              >
                {isNoBail ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
                <span>{isNoBail ? bailTooltip : getBailStatusLabel(bailStatus)}</span>
              </div>
              )}

              {isOverPointLimit && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-300 bg-red-100 p-4 font-medium text-red-800 dark:border-red-800 dark:bg-red-950/70 dark:text-red-200"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{t('criminalPoints.overLimit')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showStipulations && extras && extras.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('stipulations.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table className="w-full sm:min-w-[480px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('stipulations.charge')}</TableHead>
                      <TableHead>{t('stipulations.stipulation')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extras.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{item.extra}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </TooltipProvider>
  );
}
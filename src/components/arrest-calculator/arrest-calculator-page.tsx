'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/page-header';
import { Plus, Trash2, ChevronsUpDown, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useChargeStore,
  type SelectedCharge,
  type Charge,
  type PenalCode,
  type Addition,
} from '@/stores/charge-store';
import { useToast } from '@/hooks/use-toast';
import configData from '../../../data/config.json';
import additionsJson from '../../../data/additions.json';
import { fetchGtawData } from '@/lib/gtaw-data';
import { buildCalculationQuery } from '@/lib/calculation-link';
import { assignCell, isOrigin, ORIGINS } from '@/lib/cell';
import { normalizeTr } from '@/lib/turkish-search';
import { calculateArrest } from '@/lib/arrest-calculator';
import { SubstancePicker, substanceCategoryMap, summarizeSubstances } from './substance-picker';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { areStreetCharges } from '@/lib/code-enhancement';
import { StreetsAlert } from '../shared/streets-act-warning';
import { useI18n, useScopedI18n } from '@/lib/i18n/client';

const getTypeClasses = (type: Charge['type']) => {
  switch (type) {
    case 'F':
      return 'bg-red-500 hover:bg-red-500/80 text-white';
    case 'M':
      return 'bg-yellow-500 hover:bg-yellow-500/80 text-white';
    case 'I':
      return 'bg-green-500 hover:bg-green-500/80 text-white';
    default:
      return 'bg-gray-500 hover:bg-gray-500/80 text-white';
  }
};

// "Parole Violation" -> "paroleViolation", used to look up the Turkish label.
const additionKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, c: string) => c.toUpperCase());

interface DepaCategory {
  title: string;
  substances: string[];
}

interface DepaData {
  categories: DepaCategory[];
}

export function ArrestCalculatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isModifyMode = searchParams.get('modify') === 'true';
  const { t } = useI18n();
  const tPage = useScopedI18n('arrestCalculator.page');

  const { toast } = useToast();
  const {
    charges,
    penalCode,
    additions,
    setPenalCode,
    setAdditions,
    addCharge,
    removeCharge,
    updateCharge,
    setReport,
    resetCharges,
    setCharges,
    report,
    isParoleViolator,
    reportIsParoleViolator,
    setParoleViolator,
    hasPriorArrest,
    setHasPriorArrest,
    reportHasPriorArrest,
    currentPoints,
    setCurrentPoints,
    reportCurrentPoints,
    gender,
    setGender,
    gangAffiliation,
    setGangAffiliation,
    origin,
    setOrigin,
  } = useChargeStore();

  const [loading, setLoading] = useState(true);
  const [openChargeSelector, setOpenChargeSelector] = useState<number | null>(null);
  const [depaData, setDepaData] = useState<DepaData | null>(null);

  const getChargeDetails = useCallback(
    (chargeId: string | null): Charge | null => {
      if (!chargeId || !penalCode) return null;
      return penalCode[chargeId] || null;
    },
    [penalCode],
  );

  useEffect(() => {
    document.title = t('arrestCalculator.page.documentTitle');
  }, [t]);

  useEffect(() => {
    if (isModifyMode) {
      setCharges(report); // Load report charges into the calculator for editing
      setParoleViolator(reportIsParoleViolator);
      setHasPriorArrest(reportHasPriorArrest);
      setCurrentPoints(reportCurrentPoints);
    } else {
      resetCharges();
    }

    Promise.all([
      fetchGtawData('gtaw_penal_code.json').then((res) => res.json()),
      Promise.resolve(additionsJson),
      fetchGtawData('gtaw_depa_categories.json').then((res) => res.json()),
    ])
      .then(([penalCodeData, additionsData, depaData]) => {
        setPenalCode(penalCodeData);
        setAdditions(additionsData.additions);
        setDepaData(depaData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch initial data:', error);
        setLoading(false);
      });
  }, [
    setPenalCode,
    resetCharges,
    isModifyMode,
    report,
    setCharges,
    setAdditions,
    reportIsParoleViolator,
    setParoleViolator,
    reportHasPriorArrest,
    setHasPriorArrest,
    reportCurrentPoints,
    setCurrentPoints,
  ]);

  const handleCalculate = () => {
    if (charges.length === 0) {
      toast({
        title: tPage('toasts.noCharges.title'),
        description: tPage('toasts.noCharges.description'),
        variant: 'destructive',
      });
      return;
    }

    if (hasPriorArrest === null) {
      toast({
        title: tPage('toasts.priorArrest.title'),
        description: tPage('toasts.priorArrest.description'),
        variant: 'destructive',
      });
      return;
    }

    if (currentPoints === null || !Number.isInteger(currentPoints) || currentPoints < 0 || currentPoints > 30) {
      toast({
        title: tPage('toasts.currentPoints.title'),
        description: tPage('toasts.currentPoints.description'),
        variant: 'destructive',
      });
      return;
    }

    if (gender === null) {
      toast({ title: tPage('toasts.profile.title'), description: tPage('toasts.profile.gender'), variant: 'destructive' });
      return;
    }
    if (gender === 'male' && gangAffiliation === null) {
      toast({ title: tPage('toasts.profile.title'), description: tPage('toasts.profile.gang'), variant: 'destructive' });
      return;
    }
    if (gender === 'male' && gangAffiliation === true && !isOrigin(origin)) {
      toast({ title: tPage('toasts.profile.title'), description: tPage('toasts.profile.origin'), variant: 'destructive' });
      return;
    }

    for (const charge of charges) {

      if (!charge.chargeId) {
        toast({
          title: tPage('toasts.incomplete.title'),
          description: tPage('toasts.incomplete.selectCharge'),
          variant: 'destructive',
        });
        return;
      }
      const chargeDetails = getChargeDetails(charge.chargeId);
      const chargeName = chargeDetails?.charge
      if (!chargeName) {
         // TODO: What to show if the charge is invalid?
      } else {
        if (!charge.class) {
          toast({
            title: tPage('toasts.incomplete.title'),
            description: tPage('toasts.incomplete.selectClass', {
              charge: chargeName,
            }),
            variant: 'destructive',
          });
          return;
        }
        if (!charge.offense) {
          toast({
            title: tPage('toasts.incomplete.title'),
            description: tPage('toasts.incomplete.selectOffense', {
              charge: chargeName,
            }),
            variant: 'destructive',
          });
          return;
        }
        if (!charge.addition) {
          toast({
            title: tPage('toasts.incomplete.title'),
            description: tPage('toasts.incomplete.selectAddition', {
              charge: chargeName,
            }),
            variant: 'destructive',
          });
          return;
        }
        
        if (chargeDetails?.drugs && !charge.category) {
          toast({
            title: tPage('toasts.incomplete.title'),
            description: chargeDetails.substance_based
              ? tPage('toasts.incomplete.selectSubstances', { charge: chargeName })
              : tPage('toasts.incomplete.selectCategory', { charge: chargeName }),
            variant: 'destructive',
          });
          return;
        }
      }
    }
    // Standalone build: show the results on the shareable calculation page
    // (the full panel sends users on to the arrest report instead).
    const query = penalCode ? buildCalculationQuery(charges, penalCode, isParoleViolator, hasPriorArrest === true, currentPoints ?? 0, {
          gender,
          gang: gender === 'male' ? gangAffiliation : null,
          origin: gender === 'male' && gangAffiliation ? origin : null,
          cell: assignCell(gender, gangAffiliation, isOrigin(origin) ? origin : null),
        }) : '';
    setReport(charges);
    resetCharges();
    router.push(`/arrest-calculation/?${query}`);
  };

  // Numeric order by article number (001 → 714); object key order can't be relied on.
  const substanceCategoryOf = useMemo(
    () => (depaData ? substanceCategoryMap(depaData.categories) : {}),
    [depaData],
  );

  // Live preview of the totals for the rows that are already complete.
  const preview = useMemo(() => {
    if (!penalCode) return null;
    const complete = charges.filter((c) => {
      const d = c.chargeId ? penalCode[c.chargeId] : null;
      return d && c.class && c.offense && c.addition && (!d.drugs || c.category);
    });
    if (complete.length === 0) return null;
    const r = calculateArrest(complete, isParoleViolator, penalCode, hasPriorArrest === true);
    const court = isParoleViolator || r.mandatoryCourt;
    const fmt = (m: number) => {
      const min = Math.round(m);
      const d = Math.floor(min / 1440);
      const h = Math.floor((min % 1440) / 60);
      const mm = min % 60;
      const parts = [d && `${d} Gün`, h && `${h} Saat`, mm && `${mm} Dakika`].filter(Boolean).join(' ');
      return min < 60 ? `${min} Dakika` : `${min} Dakika (${parts})`;
    };
    const points = r.calculationResults.reduce((s, x) => s + x.modified.points, 0);
    return [
      { label: tPage('preview.min'), value: court ? tPage('preview.court') : fmt(r.minTimeCapped) },
      { label: tPage('preview.max'), value: court ? tPage('preview.court') : fmt(r.maxTimeCapped) },
      {
        label: tPage('preview.points'),
        value: currentPoints !== null ? `${currentPoints} + ${points} = ${currentPoints + points}` : `${points}`,
      },
      { label: tPage('preview.fine'), value: `$${r.totals.fine.toLocaleString()}` },
    ];
  }, [charges, penalCode, isParoleViolator, hasPriorArrest, currentPoints, tPage]);

  const penalCodeArray = useMemo(
    () =>
      penalCode
        ? Object.values(penalCode).sort((a, b) =>
            a.id.localeCompare(b.id, 'tr', { numeric: true }),
          )
        : [],
    [penalCode],
  );
  const additionsWithoutParole = useMemo(
    () => additions.filter((a) => a.name !== configData.PAROLE_VIOLATION_DEFINITION),
    [additions],
  );

  const showDrugChargeWarning = useMemo(() => {
    return charges.some((charge) => {
      const details = getChargeDetails(charge.chargeId);
      return !!details?.drugs;
    });
  }, [charges, getChargeDetails]);

  const showStreetsActWarning = useMemo(() => {
    const chargesDetails = charges.map((charge: SelectedCharge) => getChargeDetails(charge.chargeId));
    return areStreetCharges(charges, chargesDetails);
  }, [charges, getChargeDetails]);

  const handleChargeSelect = (chargeRow: SelectedCharge, chargeId: string) => {
    if (!penalCode) return;

    const isDeselecting = chargeRow.chargeId === chargeId;
    if (isDeselecting) {
      updateCharge(chargeRow.uniqueId, {
        chargeId: null,
        class: null,
        offense: null,
        addition: null,
        category: null,
        substances: [],
        grams: null,
      });
      return;
    }

    const chargeDetails = penalCode[chargeId];
    if (!chargeDetails) return;

    const defaultClass: string | null =
      Object.entries(chargeDetails.class).find((chargeClass) => chargeClass[1])?.[0] ?? null;

    const defaultOffense: string | null = '1';

    updateCharge(chargeRow.uniqueId, {
      chargeId,
      class: defaultClass,
      offense: defaultOffense,
      addition: 'Offender',
      category: null, // Reset category on new charge selection
      substances: [],
      grams: null,
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader title={tPage('header.title')} />

      <div className="space-y-4">
        {/* One box split in two equal halves with the same two-line layout:
            prior arrest on the left, parole violation on the right. */}
        <div className="grid grid-cols-1 rounded-lg border bg-card shadow-sm md:grid-cols-2">
          <div className="flex flex-col justify-center gap-1 p-3">
            <div className="flex min-h-7 flex-wrap items-center gap-x-5 gap-y-1">
              <span className="text-base font-medium">{tPage('priorArrest.label')}</span>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prior-arrest-yes"
                  checked={hasPriorArrest === true}
                  onCheckedChange={(value) => setHasPriorArrest(value === true ? true : null)}
                />
                <Label htmlFor="prior-arrest-yes" className="text-base font-medium">{tPage('priorArrest.yes')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prior-arrest-no"
                  checked={hasPriorArrest === false}
                  onCheckedChange={(value) => setHasPriorArrest(value === true ? false : null)}
                />
                <Label htmlFor="prior-arrest-no" className="text-base font-medium">{tPage('priorArrest.no')}</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{tPage('priorArrest.required')}</p>
          </div>
          <div className="flex flex-col justify-center gap-1 border-t p-3 md:border-l md:border-t-0">
            <div className="flex min-h-7 items-center space-x-2">
              <Checkbox
                id="parole-violator"
                checked={isParoleViolator}
                onCheckedChange={(value) => setParoleViolator(value === true)}
              />
              <Label htmlFor="parole-violator" className="text-base font-medium">
                {tPage('paroleViolatorLabel')}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">{tPage('paroleViolatorHint')}</p>
          </div>
        </div>

        {/* Suspect profile for the cell assignment: gender, gang affiliation, origin. */}
        <div className="grid grid-cols-1 rounded-lg border bg-card shadow-sm md:grid-cols-3">
          <div className="flex flex-col justify-center gap-1 p-3">
            <div className="flex min-h-9 flex-wrap items-center gap-x-5 gap-y-1">
              <span className="text-base font-medium">{tPage('profile.gender')}</span>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gender-male"
                  checked={gender === 'male'}
                  onCheckedChange={(v) => setGender(v === true ? 'male' : null)}
                />
                <Label htmlFor="gender-male" className="text-base font-medium">{tPage('profile.male')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gender-female"
                  checked={gender === 'female'}
                  onCheckedChange={(v) => setGender(v === true ? 'female' : null)}
                />
                <Label htmlFor="gender-female" className="text-base font-medium">{tPage('profile.female')}</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{tPage('profile.genderHint')}</p>
          </div>
          <div className="flex flex-col justify-center gap-1 border-t p-3 md:border-l md:border-t-0">
            <div className="flex min-h-9 flex-wrap items-center gap-x-5 gap-y-1">
              <span className="text-base font-medium">{tPage('profile.gang')}</span>
              {gender === 'female' ? (
                <span className="text-base text-muted-foreground">{tPage('profile.notRequired')}</span>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="gang-yes"
                      checked={gangAffiliation === true}
                      onCheckedChange={(v) => setGangAffiliation(v === true ? true : null)}
                    />
                    <Label htmlFor="gang-yes" className="text-base font-medium">{tPage('priorArrest.yes')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="gang-no"
                      checked={gangAffiliation === false}
                      onCheckedChange={(v) => setGangAffiliation(v === true ? false : null)}
                    />
                    <Label htmlFor="gang-no" className="text-base font-medium">{tPage('priorArrest.no')}</Label>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{tPage('profile.gangHint')}</p>
          </div>
          <div className="flex flex-col justify-center gap-1 border-t p-3 md:border-l md:border-t-0">
            <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-base font-medium">{tPage('profile.origin')}</span>
              {gender === 'female' || gangAffiliation === false ? (
                <span className="text-base text-muted-foreground">{tPage('profile.notRequired')}</span>
              ) : (
                <Select value={origin ?? ''} onValueChange={(v) => setOrigin(v)}>
                  <SelectTrigger id="origin" className="h-9 w-48">
                    <SelectValue placeholder={tPage('placeholders.selectOffense')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGINS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {tPage(`profile.origins.${o}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{tPage('profile.originHint')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card p-3 shadow-sm">
          <Label htmlFor="current-points" className="text-base font-medium">
            {tPage('currentPoints.label')}
          </Label>
          <Input
            id="current-points"
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            step={1}
            placeholder={tPage('currentPoints.placeholder')}
            className="h-9 w-24"
            value={currentPoints ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') return setCurrentPoints(null);
              const n = Math.trunc(Number(raw));
              if (Number.isNaN(n)) return;
              setCurrentPoints(Math.min(30, Math.max(0, n)));
            }}
          />
          {currentPoints === null && (
            <span className="text-sm text-muted-foreground">{tPage('currentPoints.required')}</span>
          )}
        </div>

        {charges.map((chargeRow) => {
          const chargeDetails = getChargeDetails(chargeRow.chargeId);
          const isDrugCharge = !!chargeDetails?.drugs;
          const isSubstanceBased = !!chargeDetails?.substance_based;
          const showCategorySelect = isDrugCharge && !isSubstanceBased;

          return (
            <div key={chargeRow.uniqueId} className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-end gap-2">
              <div
                className={cn(
                  'flex-1 grid grid-cols-1 md:grid-cols-5 gap-2 items-end',
                  showCategorySelect && 'md:grid-cols-6',
                )}
              >
                {/* Charge Dropdown */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>{tPage('fields.charge')}</Label>
                  <Popover
                    open={openChargeSelector === chargeRow.uniqueId}
                    onOpenChange={(isOpen) => setOpenChargeSelector(isOpen ? chargeRow.uniqueId : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openChargeSelector === chargeRow.uniqueId}
                        className="w-full justify-between h-9"
                        disabled={loading}
                      >
                        {chargeRow.chargeId && penalCode && penalCode[chargeRow.chargeId] ? (
                          <span className="flex items-center">
                            <Badge
                              className={cn(
                                'mr-2 rounded-sm px-1.5 py-0.5 text-xs',
                                getTypeClasses(penalCode[chargeRow.chargeId].type),
                              )}
                            >
                              {penalCode[chargeRow.chargeId].id}
                            </Badge>
                            <span className="truncate">{penalCode[chargeRow.chargeId].charge}</span>
                          </span>
                        ) : (
                          tPage('placeholders.selectCharge')
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command
                        filter={(value, search) => {
                          if (!penalCode) return 0;
                          const charge = penalCodeArray.find((c) => c.id === value);
                          if (!charge) return 0;

                          // Turkish-insensitive: "ihanet" → "İhanet", "kacmak" → "Kaçmak".
                          const term = normalizeTr(search);
                          const chargeName = normalizeTr(charge.charge);
                          const chargeId = charge.id.toLowerCase();

                          if (chargeName.includes(term) || chargeId.includes(term)) {
                            return 1;
                          }
                          return 0;
                        }}
                      >
                        <CommandInput placeholder={tPage('placeholders.searchCharge')} />
                        <CommandEmpty>{tPage('noChargeFound')}</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {penalCodeArray.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.id}
                                onSelect={(currentValue) => {
                                  handleChargeSelect(chargeRow, currentValue);
                                  setOpenChargeSelector(null);
                                }}
                                disabled={c.type === '?'}
                                className="flex items-center"
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    chargeRow.chargeId === c.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <Badge
                                  className={cn(
                                    'mr-2 rounded-sm px-1.5 py-0.5 text-xs',
                                    getTypeClasses(c.type),
                                  )}
                                >
                                  {c.id}
                                </Badge>
                                <span className="flex-1 truncate">{c.charge}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Class Dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor={`class-${chargeRow.uniqueId}`}>{tPage('fields.class')}</Label>
                  <Select
                    value={chargeRow.class || ''}
                    onValueChange={(value) => updateCharge(chargeRow.uniqueId, { class: value })}
                    disabled={!chargeDetails}
                    required
                  >
                    <SelectTrigger id={`class-${chargeRow.uniqueId}`} className="h-9">
                      <SelectValue placeholder={tPage('placeholders.selectClass')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A" disabled={!chargeDetails?.class?.A}>
                        {tPage('options.classA')}
                      </SelectItem>
                      <SelectItem value="B" disabled={!chargeDetails?.class?.B}>
                        {tPage('options.classB')}
                      </SelectItem>
                      <SelectItem value="C" disabled={!chargeDetails?.class?.C}>
                        {tPage('options.classC')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Offense Dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor={`offense-${chargeRow.uniqueId}`}>{tPage('fields.offense')}</Label>
                  <Select
                    value={chargeRow.offense || ''}
                    onValueChange={(value) => updateCharge(chargeRow.uniqueId, { offense: value })}
                    disabled={!chargeDetails}
                    required
                  >
                    <SelectTrigger id={`offense-${chargeRow.uniqueId}`} className="h-9">
                      <SelectValue placeholder={tPage('placeholders.selectOffense')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" disabled={!chargeDetails?.offence['1']}>
                        {tPage('offenseOrdinals.1')}
                      </SelectItem>
                      <SelectItem value="2" disabled={!chargeDetails?.offence['2']}>
                        {tPage('offenseOrdinals.2')}
                      </SelectItem>
                      <SelectItem value="3" disabled={!chargeDetails?.offence['3']}>
                        {tPage('offenseOrdinals.3')}
                      </SelectItem>
                      <SelectItem value="4" disabled={!chargeDetails?.offence['4']}>
                        {tPage('offenseOrdinals.4')}
                      </SelectItem>
                      <SelectItem value="5" disabled={!chargeDetails?.offence['5']}>
                        {tPage('offenseOrdinals.5')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Addition Dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor={`addition-${chargeRow.uniqueId}`}>{tPage('fields.addition')}</Label>
                  <Select
                    value={chargeRow.addition || ''}
                    onValueChange={(value) => updateCharge(chargeRow.uniqueId, { addition: value })}
                    disabled={!chargeDetails}
                    required
                  >
                    <SelectTrigger id={`addition-${chargeRow.uniqueId}`} className="h-9">
                      <SelectValue placeholder={tPage('placeholders.selectAddition')} />
                    </SelectTrigger>
                    <SelectContent>
                      {additionsWithoutParole.map((addition) => (
                        <SelectItem key={addition.name} value={addition.name}>
                          {t(`arrestCalculator.results.additionNames.${additionKey(addition.name)}`, undefined, addition.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Dropdown (for drug charges) */}
                {showCategorySelect && (
                  <div className="space-y-1.5">
                    <Label htmlFor={`category-${chargeRow.uniqueId}`}>{tPage('fields.category')}</Label>
                    <Select
                      value={chargeRow.category || ''}
                      onValueChange={(value) => updateCharge(chargeRow.uniqueId, { category: value })}
                      disabled={!chargeDetails}
                      required
                    >
                      <SelectTrigger id={`category-${chargeRow.uniqueId}`} className="h-9">
                        <SelectValue placeholder={tPage('placeholders.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {chargeDetails?.drugs &&
                          Object.entries(chargeDetails.drugs).map(([key, value]) => (
                            <SelectItem key={key} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCharge(chargeRow.uniqueId)}
                      className="text-red-500 hover:text-red-700 h-9 w-9"
                      aria-label={tPage('buttons.removeCharge')}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tPage('buttons.removeCharge')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {isSubstanceBased && depaData && (
              <SubstancePicker
                id={chargeRow.uniqueId}
                substances={chargeRow.substances ?? []}
                categories={depaData.categories}
                categoryOf={substanceCategoryOf}
                t={tPage}
                gramStep={chargeDetails?.gram_step ?? null}
                grams={chargeRow.grams ?? null}
                onGramsChange={(g) => updateCharge(chargeRow.uniqueId, { grams: g })}
                onChange={(next) => {
                  const summary = summarizeSubstances(next, substanceCategoryOf);
                  updateCharge(chargeRow.uniqueId, { substances: next, category: summary.category });
                }}
              />
            )}
            </div>
          );
        })}

        {preview && (
          <div className="rounded-md bg-primary p-4 text-primary-foreground shadow-md">
            <p className="mb-3 text-sm font-semibold">{tPage('preview.title')}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {preview.map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-primary-foreground/80">{item.label}</p>
                  <p className="text-base font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-primary-foreground/80">{tPage('preview.note')}</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Button onClick={() => addCharge()} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" /> {tPage('buttons.addCharge')}
          </Button>

          <Button variant="default" disabled={charges.length === 0} onClick={handleCalculate}>
            {tPage('buttons.calculate')}
          </Button>
        </div>

        {showStreetsActWarning && <StreetsAlert />}



        {loading && <p>{tPage('loadingPenalCode')}</p>}
      </div>
    </div>
  );
}
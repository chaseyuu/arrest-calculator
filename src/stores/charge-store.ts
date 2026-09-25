
'use client';

import create from 'zustand';
import { persist } from 'zustand/middleware';

export interface Charge {
  id: string;
  charge: string;
  definition?: string;
  type: 'F' | 'M' | 'I' | '?';
  class: { A: boolean; B: boolean; C: boolean };
  offence: { '1': boolean; '2': boolean; '3': boolean; '4': boolean; '5': boolean };
  time: any;
  maxtime: any;
  points: any;
  fine: any;
  impound: any;
  suspension: any;
  bail: any;
  extra?: string;
  drugs?: Record<string, string>;
  code_enhancement?: string;
  /** time/maxtime are keyed by offence number ("1", "2", ...) instead of a single value. */
  time_by_offence?: boolean;
  /** 001-004: sentence is up to the court. */
  court_only?: boolean;
  /** Drug charges: category comes from the most serious substance selected. */
  substance_based?: boolean;
  /** 606: every `grams` grams found adds `add` to the sentence. */
  gram_step?: { grams: number; add: { days: number; hours: number; min: number } };
  points_by_offence?: Record<string, number>;
  code_enhancement_count?: number;
}

export interface PenalCode {
  [key: string]: Charge;
}

export interface SelectedCharge {
  uniqueId: number;
  chargeId: string | null;
  class: string | null;
  offense: string | null;
  addition: string | null;
  category: string | null;
  /** Substance types found (drug charges); the most serious one sets the category. */
  substances?: string[];
  /** Total grams found (606: every 75 g adds 12 hours). */
  grams?: number | null;
}

export interface Addition {
    name: string;
    sentence_multiplier: number;
    points_multiplier: number;
}

interface ChargeState {
  penalCode: PenalCode | null;
  additions: Addition[];
  charges: SelectedCharge[];
  report: SelectedCharge[];
  reportInitialized: boolean;
  isParoleViolator: boolean;
  reportIsParoleViolator: boolean;
  /** Has the suspect been arrested before? null = not answered yet. */
  hasPriorArrest: boolean | null;
  reportHasPriorArrest: boolean;
  /** Suspect's existing criminal points (0-30). null = not entered yet. */
  currentPoints: number | null;
  reportCurrentPoints: number;
  /** Suspect profile used for the cell assignment. */
  gender: 'male' | 'female' | null;
  gangAffiliation: boolean | null;
  origin: string | null;
  setGender: (value: 'male' | 'female' | null) => void;
  setGangAffiliation: (value: boolean | null) => void;
  setOrigin: (value: string | null) => void;
  setCurrentPoints: (value: number | null) => void;
  setReportCurrentPoints: (value: number) => void;
  setHasPriorArrest: (value: boolean | null) => void;
  setReportHasPriorArrest: (value: boolean) => void;
  setPenalCode: (penalCode: PenalCode) => void;
  setAdditions: (additions: Addition[]) => void;
  addCharge: () => void;
  removeCharge: (uniqueId: number) => void;
  updateCharge: (uniqueId: number, updatedFields: Partial<Omit<SelectedCharge, 'uniqueId'>>) => void;
  setReport: (report: SelectedCharge[]) => void;
  resetCharges: () => void;
  setCharges: (charges: SelectedCharge[]) => void;
  toggleParoleViolator: () => void;
  setParoleViolator: (value: boolean) => void;
  setReportParoleViolator: (value: boolean) => void;
}

const initialState = {
    charges: [],
    report: [],
    reportInitialized: false,
    isParoleViolator: false,
    reportIsParoleViolator: false,
    hasPriorArrest: null,
    reportHasPriorArrest: false,
    currentPoints: null,
    reportCurrentPoints: 0,
    gender: null,
    gangAffiliation: null,
    origin: null,
};

export const useChargeStore = create<ChargeState>()(
  persist(
    (set) => ({
      penalCode: null,
      additions: [],
      ...initialState,
      setPenalCode: (penalCode) => set({ penalCode }),
      setAdditions: (additions) => set({ additions }),
      addCharge: () =>
        set((state) => ({
          charges: [
            ...state.charges,
            {
              uniqueId: Date.now(),
              chargeId: null,
              class: null,
              offense: null,
              addition: null,
              category: null,
            },
          ],
        })),
      removeCharge: (uniqueId) =>
        set((state) => ({
          charges: state.charges.filter((charge) => charge.uniqueId !== uniqueId),
        })),
      updateCharge: (uniqueId, updatedFields) =>
        set((state) => ({
          charges: state.charges.map((charge) =>
            charge.uniqueId === uniqueId ? { ...charge, ...updatedFields } : charge
          ),
        })),
      setReport: (report) =>
        set((state) => ({
          report,
          reportInitialized: true,
          reportIsParoleViolator: state.isParoleViolator,
          reportHasPriorArrest: state.hasPriorArrest === true,
          reportCurrentPoints: state.currentPoints ?? 0,
        })),
      resetCharges: () =>
        set((state) => ({
          ...state,
          charges: [],
          isParoleViolator: false,
          hasPriorArrest: null,
          currentPoints: null,
          gender: null,
          gangAffiliation: null,
          origin: null,
        })),
      setGender: (value) => set({ gender: value }),
      setGangAffiliation: (value) => set({ gangAffiliation: value }),
      setOrigin: (value) => set({ origin: value }),
      setCurrentPoints: (value) => set({ currentPoints: value }),
      setReportCurrentPoints: (value) => set({ reportCurrentPoints: value }),
      setHasPriorArrest: (value) => set({ hasPriorArrest: value }),
      setReportHasPriorArrest: (value) => set({ reportHasPriorArrest: value }),
      setCharges: (charges) => set({ charges }),
      toggleParoleViolator: () => set(state => ({ isParoleViolator: !state.isParoleViolator })),
      setParoleViolator: (value) => set({ isParoleViolator: value }),
      setReportParoleViolator: (value) => set({ reportIsParoleViolator: value }),
    }),
    {
      name: 'charge-storage', // name of the item in the storage (must be unique)
      getStorage: () => sessionStorage, // (optional) by default, 'localStorage' is used
    }
  )
);

// Prison cell assignment (LSPD rule set).
// - Women: no cell number needed.
// - Men without gang affiliation: a random cell from GROUP_A.
// - Men with gang affiliation: a random cell from the group for their origin.

export type Gender = 'male' | 'female';
export type Origin = 'black' | 'hispanic' | 'asian' | 'white' | 'filipino' | 'middleEastern';

export const ORIGINS: Origin[] = ['black', 'hispanic', 'asian', 'white', 'filipino', 'middleEastern'];

const GROUP_A = [309, 311, 312, 313, 314, 316, 317, 318, 323, 325, 333];
const GROUP_B = [305, 306, 307, 308, 310, 320, 322, 326, 327, 328, 329, 330, 331, 332];

const CELLS_BY_ORIGIN: Record<Origin, number[]> = {
  black: GROUP_A,
  hispanic: GROUP_B,
  white: GROUP_B,
  asian: GROUP_A,
  filipino: GROUP_A,
  middleEastern: GROUP_A,
};

export function isOrigin(value: string | null | undefined): value is Origin {
  return !!value && (ORIGINS as string[]).includes(value);
}

/** Picks a cell for a male suspect; returns null for women (no cell needed). */
export function assignCell(gender: Gender, gang: boolean | null, origin: Origin | null): number | null {
  if (gender === 'female') return null;
  const pool = gang && origin ? CELLS_BY_ORIGIN[origin] : GROUP_A;
  return pool[Math.floor(Math.random() * pool.length)];
}

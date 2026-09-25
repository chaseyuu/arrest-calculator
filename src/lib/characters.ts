/*
 * Characters defined on the LSPD Tools settings page, shared through the
 * `lspd_characters` cookie on chaseyuu.github.io (see lspd-tools/assets/prefs.js).
 */
export type Character = { name: string; rank: string; badge: string; division: string };
export type CharacterData = { active: 0 | 1; list: Character[] };

const COOKIE = 'lspd_characters';
const MAX_CHARACTERS = 2;
export const CHARACTERS_EVENT = 'lspd:characters-change';

function clean(c: Partial<Character> | null | undefined): Character {
  return {
    name: String(c?.name ?? '').trim(),
    rank: String(c?.rank ?? ''),
    badge: String(c?.badge ?? '').trim(),
    division: String(c?.division ?? ''),
  };
}

export function isFilled(c: Character | undefined | null): c is Character {
  return !!(c && (c.name || c.rank || c.badge || c.division));
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function parse(raw: string | null): any {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCharacters(): CharacterData {
  let data = parse(readCookie(COOKIE));
  if (!data) {
    const legacy = parse(readCookie('lspd_personnel'));
    data = { active: 0, list: legacy ? [legacy] : [] };
  }
  const list: Character[] = (Array.isArray(data.list) ? data.list : []).slice(0, MAX_CHARACTERS).map(clean);
  const active = data.active === 1 && isFilled(list[1]) ? 1 : 0;
  return { active, list };
}

/** The character whose data the tools should use. */
export function getActiveCharacter(): Character | null {
  const d = getCharacters();
  return isFilled(d.list[d.active]) ? d.list[d.active] : null;
}

export function setActiveCharacter(index: 0 | 1) {
  const d = getCharacters();
  const active = index === 1 && isFilled(d.list[1]) ? 1 : 0;
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify({ active, list: d.list }))}; path=/; max-age=${
    60 * 60 * 24 * 365
  }; SameSite=Lax`;
  document.dispatchEvent(new CustomEvent(CHARACTERS_EVENT));
}

// Turkish-insensitive matching: "ihanet" finds "İhanet", "kacmak" finds "Kaçmak".
const MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

export function normalizeTr(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[çğıöşüâîû]/g, (ch) => MAP[ch] ?? ch)
    .replace(/\s+/g, ' ')
    .trim();
}

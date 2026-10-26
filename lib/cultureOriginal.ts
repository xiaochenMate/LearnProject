import type { CultureOriginal, CultureOriginalParagraph } from './cultureContent';
import type { CultureProgress } from './cultureProgress';

export const originalCharacterCount = (original: CultureOriginal) => Array.from(original.paragraphs.map(p => p.text).join('')).filter(c => /\p{Script=Han}/u.test(c)).length;
const compact = (text: string) => text.replace(/[\s，。；、：？！,.!?;:]/g, '').toLowerCase();
export function filterCultureOriginal(original: CultureOriginal, state: CultureProgress['original']): CultureOriginalParagraph[] {
  const query = compact(state.query.trim());
  return original.paragraphs.filter(p => {
    if (state.shelf === 'saved' && !state.saved.includes(p.id)) return false;
    if (state.shelf === 'unread' && state.read.includes(p.id)) return false;
    return !query || compact(p.text).includes(query) || compact(p.simplified).includes(query);
  });
}
export const cultureOriginalPages = (paragraphs: CultureOriginalParagraph[]) => Array.from(
  { length: Math.ceil(paragraphs.length / 10) }, (_, i) => paragraphs.slice(i * 10, (i + 1) * 10),
);

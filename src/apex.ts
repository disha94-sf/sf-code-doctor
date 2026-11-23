/**
 * Small helpers for reading Apex source without a full parser.
 *
 * The masking functions replace comments (and optionally the contents of
 * string literals) with spaces. Newlines are kept and the length never
 * changes, so an offset in the masked text points at the same place in the
 * original file.
 */

export const isApexFile = (file: string): boolean => /\.(cls|trigger)$/i.test(file);

function mask(source: string, maskStrings: boolean): string {
  const out = source.split('');
  const blank = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      if (out[i] !== '\n' && out[i] !== '\r') out[i] = ' ';
    }
  };

  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      blank(i, stop);
      i = stop;
    } else if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(i, stop);
      i = stop;
    } else if (ch === "'") {
      // Apex strings use single quotes and backslash escapes.
      let j = i + 1;
      while (j < source.length && source[j] !== "'" && source[j] !== '\n') {
        j += source[j] === '\\' ? 2 : 1;
      }
      if (maskStrings) blank(i + 1, Math.min(j, source.length));
      i = j + 1;
    } else {
      i++;
    }
  }
  return out.join('');
}

/** Blanks out comments, leaving code and string literals intact. */
export const maskComments = (source: string): string => mask(source, false);

/** Blanks out comments and the contents of string literals (quotes are kept). */
export const maskCommentsAndStrings = (source: string): string => mask(source, true);

/** Index of the bracket that closes the one at `openIndex`, or -1. */
export function findMatching(text: string, openIndex: number): number {
  const open = text[openIndex];
  const close = open === '(' ? ')' : open === '{' ? '}' : open === '[' ? ']' : '';
  if (!close) return -1;
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close && --depth === 0) return i;
  }
  return -1;
}

/** Converts a 0-based offset into a 1-based line and column. */
export function toLineColumn(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

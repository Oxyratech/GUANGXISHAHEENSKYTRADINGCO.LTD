/*
 * Text hygiene shared by every free-text field. Runs as a zod `overwrite`, so the trimmed, cleaned
 * value is what is measured, stored and e-mailed.
 *
 * The character classes are built from code points rather than written as escapes: several of the
 * characters (line and paragraph separators, bidirectional controls) are invisible or terminate a
 * source line, and they would be unreadable, or break the file, if pasted in.
 */

type CodePointRange = readonly [from: number, to?: number];

function characterClass(ranges: readonly CodePointRange[]): string {
  const chars = (from: number, to?: number) =>
    to === undefined
      ? String.fromCodePoint(from)
      : `${String.fromCodePoint(from)}-${String.fromCodePoint(to)}`;
  return `[${ranges.map(([from, to]) => chars(from, to)).join("")}]`;
}

// C0 and C1 control characters (tab and line feed are handled separately), DEL, the bidirectional
// embeddings, overrides and isolates that can make stored text display differently from what it
// says ("Trojan Source"), and the byte order mark. Kept on purpose: LRM and RLM, and the zero-width
// (non-)joiners, which Arabic and Persian text use.
const UNSAFE = new RegExp(
  characterClass([
    [0x00, 0x08],
    [0x0b, 0x0c],
    [0x0e, 0x1f],
    [0x7f, 0x9f],
    [0x202a, 0x202e],
    [0x2066, 0x2069],
    [0xfeff],
  ]),
  "g",
);
const LINE_BREAKS = new RegExp(String.raw`\r\n?|${characterClass([[0x2028, 0x2029]])}`, "g");
const WHITESPACE_RUN = /[\t\n ]+/g;
const BLANK_LINES = /\n{3,}/g;
const TRAILING_SPACE = /[\t ]+\n/g;

/** A one-line value: every run of whitespace, including line breaks, becomes a single space. */
export function cleanLine(value: string): string {
  return value.replace(LINE_BREAKS, "\n").replace(UNSAFE, "").replace(WHITESPACE_RUN, " ").trim();
}

/** A multi-line value: line breaks are kept (as \n) and runs of blank lines collapse to one. */
export function cleanMultiline(value: string): string {
  return value
    .replace(LINE_BREAKS, "\n")
    .replace(UNSAFE, "")
    .replace(TRAILING_SPACE, "\n")
    .replace(BLANK_LINES, "\n\n")
    .trim();
}

/** First code point of each script's digit zero. */
const DIGIT_ZEROES = [0x0660, 0x06f0, 0xff10] as const;
const NON_ASCII_DIGIT = new RegExp(
  characterClass(DIGIT_ZEROES.map((zero): CodePointRange => [zero, zero + 9])),
  "g",
);

/** Arabic-Indic, Persian and full-width digits become ASCII, so a number typed on any keyboard validates. */
export function toAsciiDigits(value: string): string {
  return value.replace(NON_ASCII_DIGIT, (digit) => {
    const code = digit.codePointAt(0) ?? 0;
    const zero = DIGIT_ZEROES.find((start) => code >= start && code <= start + 9) ?? code;
    return String(code - zero);
  });
}

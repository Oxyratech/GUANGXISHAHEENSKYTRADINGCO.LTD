/** "01" to "08": the numeral shown for the step at a zero-based index. */
export function formatStepNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

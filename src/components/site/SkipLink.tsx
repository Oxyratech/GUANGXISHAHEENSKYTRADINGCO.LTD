/** First focusable element on every page: jumps keyboard and screen-reader users past the header. */
export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[110] focus:rounded-md focus:bg-navy-900 focus:px-5 focus:py-3 focus:text-button focus:text-white focus:shadow-raised"
    >
      {label}
    </a>
  );
}

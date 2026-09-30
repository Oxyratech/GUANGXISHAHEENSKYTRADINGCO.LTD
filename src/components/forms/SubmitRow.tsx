import { Button } from "@/components/ui/button";

/**
 * The submit button. While a submission is pending it is busy and swallows further clicks (see
 * Button `loading`), and it keeps keyboard focus, which a truly disabled button would drop. A
 * status region says what is happening, because a changed label alone is not announced.
 */
export function SubmitRow({
  label,
  pendingLabel,
  pending,
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" size="lg" loading={pending} className="w-full uppercase sm:w-auto">
        {pending ? pendingLabel : label}
      </Button>
      <span role="status" className="sr-only">
        {pending ? pendingLabel : ""}
      </span>
    </div>
  );
}

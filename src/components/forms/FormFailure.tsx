import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * A submission that could not be completed as a whole (database unreachable, rate limit, lost
 * connection). It says what happened, that nothing was lost from the form, and offers a retry.
 */
export function FormFailure({
  title,
  message,
  hint,
  retryLabel,
  onRetry,
  pending,
}: {
  title: string;
  message: string;
  hint: string;
  retryLabel: string;
  onRetry: () => void;
  pending: boolean;
}) {
  return (
    <Alert variant="danger" title={title}>
      <p>{message}</p>
      <p className="mt-1">{hint}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry} loading={pending}>
        {retryLabel}
      </Button>
    </Alert>
  );
}

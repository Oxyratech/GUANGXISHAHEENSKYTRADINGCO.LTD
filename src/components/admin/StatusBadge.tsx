import { Badge, type BadgeProps } from "@/components/ui/badge";
import { INQUIRY_STATUS_DEFINITIONS } from "@/lib/domain/statuses";
import { humanizeCode } from "@/server/admin/format";

type Tone = NonNullable<BadgeProps["variant"]>;

/*
 * One tone per status code, shared by every vocabulary: NEW reads the same on an inquiry and on a
 * contact message. Anything not listed is neutral. The colour is only reinforcement; the label is
 * always the status in words.
 */
const TONES: Record<string, Tone> = {
  NEW: "blue",
  QUALIFIED: "blue",
  PUBLIC: "blue",
  QUOTATION: "gold",
  NEGOTIATION: "gold",
  CONFIRMED: "success",
  COMPLETED: "success",
  PUBLISHED: "success",
  REPLIED: "success",
  ACTIVE: "success",
  PENDING: "warning",
  LOCKED: "warning",
  FAILED: "danger",
};

const INQUIRY_LABELS = new Map<string, string>(
  INQUIRY_STATUS_DEFINITIONS.map((status) => [status.code, status.label]),
);

/** A status as a small chip: "New", "Published", "Draft". Accepts any status string. */
export function StatusBadge({
  status,
  label,
  tone,
  className,
}: {
  status: string;
  /** Overrides the default wording. */
  label?: string;
  /** Overrides the default tone. */
  tone?: Tone;
  className?: string;
}) {
  return (
    <Badge variant={tone ?? TONES[status] ?? "neutral"} className={className}>
      {label ?? INQUIRY_LABELS.get(status) ?? humanizeCode(status)}
    </Badge>
  );
}

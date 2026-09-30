import { cn } from "@/lib/utils";

/**
 * Jump links to the FAQ's groups: chips on a phone, a quiet rule-and-list column beside the
 * questions from lg. Plain fragment links, so it works before any script has loaded.
 */
export function FaqGroupNav({
  label,
  title,
  groups,
  className,
}: {
  label: string;
  title: string;
  groups: readonly { anchorId: string; title: string }[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      <p className="text-eyebrow text-ink-subtle">{title}</p>
      <ul className="mt-3 flex flex-wrap gap-2 lg:grid lg:gap-0 lg:border-s lg:border-line">
        {groups.map((group) => (
          <li key={group.anchorId}>
            <a
              href={`#${group.anchorId}`}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md border border-line bg-white px-4 text-small font-medium text-navy-900",
                "transition-colors hover:border-navy-600 hover:bg-surface",
                "lg:flex lg:rounded-none lg:border-0 lg:border-s-2 lg:border-transparent lg:bg-transparent lg:ps-4 lg:pe-2 lg:font-normal lg:text-ink-muted",
                "lg:-ms-px lg:hover:border-navy-600 lg:hover:bg-transparent lg:hover:text-navy-900",
              )}
            >
              {group.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

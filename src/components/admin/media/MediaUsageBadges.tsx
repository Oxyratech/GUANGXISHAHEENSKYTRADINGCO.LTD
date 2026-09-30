import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MediaUsageCountsLike {
  productImages: number;
  productDocuments: number;
  newsCovers: number;
  seoOgImages: number;
  inquiryAttachments: number;
}

const LABELS: readonly { key: keyof MediaUsageCountsLike; singular: string; plural: string }[] = [
  { key: "productImages", singular: "product image", plural: "product images" },
  { key: "productDocuments", singular: "product document", plural: "product documents" },
  { key: "newsCovers", singular: "news cover", plural: "news covers" },
  { key: "seoOgImages", singular: "SEO OG image", plural: "SEO OG images" },
  { key: "inquiryAttachments", singular: "inquiry attachment", plural: "inquiry attachments" },
];

/**
 * "Used by" as a row of chips, computed from the asset's relations. Reusable wherever another admin
 * screen (a product or news editor) needs to show the same thing about a media asset it embeds.
 */
export function MediaUsageBadges({
  usage,
  className,
}: {
  usage: MediaUsageCountsLike;
  className?: string;
}) {
  const chips = LABELS.filter((entry) => usage[entry.key] > 0);
  if (chips.length === 0) {
    return <span className={cn("text-small text-ink-subtle", className)}>Not currently used</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {chips.map((entry) => {
        const count = usage[entry.key];
        return (
          <Badge key={entry.key} variant="blue">
            {count} {count === 1 ? entry.singular : entry.plural}
          </Badge>
        );
      })}
    </div>
  );
}

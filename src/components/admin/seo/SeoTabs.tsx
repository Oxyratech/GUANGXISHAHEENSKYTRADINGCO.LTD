import Link from "next/link";
import { cn } from "@/lib/utils";

export type SeoTab = "pages" | "categories" | "products" | "news";

const TABS: { key: SeoTab; label: string }[] = [
  { key: "pages", label: "Pages" },
  { key: "categories", label: "Categories" },
  { key: "products", label: "Products" },
  { key: "news", label: "News" },
];

/** Which kind of target the directory shows. A plain link per tab: bookmarkable, no JavaScript needed. */
export function SeoTabs({ active }: { active: SeoTab }) {
  return (
    <nav aria-label="SEO target kind" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.key === "pages" ? "/admin/seo" : `/admin/seo?tab=${tab.key}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-md px-4 text-label whitespace-nowrap transition-colors duration-150",
                  isActive
                    ? "bg-white text-navy-900 shadow-card"
                    : "text-ink-muted hover:text-navy-900",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

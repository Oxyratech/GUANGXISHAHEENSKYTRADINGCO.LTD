import Link from "next/link";
import { cn } from "@/lib/utils";

export type TranslationTab = "products" | "news" | "static" | "seo";

const TABS: { key: TranslationTab; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "news", label: "News" },
  { key: "static", label: "Static content" },
  { key: "seo", label: "SEO overrides" },
];

export function TranslationTabs({ active }: { active: TranslationTab }) {
  return (
    <nav aria-label="Translation coverage area" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.key === "products" ? "/admin/translations" : `/admin/translations?tab=${tab.key}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-md px-4 text-label whitespace-nowrap transition-colors duration-150",
                  isActive ? "bg-white text-navy-900 shadow-card" : "text-ink-muted hover:text-navy-900",
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

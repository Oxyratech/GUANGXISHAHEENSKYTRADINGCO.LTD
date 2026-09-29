import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { assertLocale } from "@/i18n/assert-locale";

/**
 * Catches every address under a locale that no other page owns, so an unknown path renders the
 * localised 404 inside the site layout (header, footer, language) instead of Next's bare default.
 * The props are typed by hand: this route is not in the generated PageProps until typegen runs.
 */
export default async function UnknownPage({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  setRequestLocale(assertLocale((await params).locale));
  notFound();
}

import { setRequestLocale } from "next-intl/server";
import { assertLocale } from "@/i18n/assert-locale";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  // The locale layout owns the single <main id="main"> landmark; a page renders only its content.
  return null;
}

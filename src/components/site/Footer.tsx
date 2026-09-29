import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { Container } from "@/components/layout/container";
import { COMPANY } from "@/config/company";
import { FOOTER_COLUMNS, type FooterColumn as FooterColumnModel } from "@/config/navigation";
import { SITE } from "@/config/site";
import type { Locale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import type { PublicContactChannels } from "@/server/settings/contact-channels";
import { mailtoHref, telHref, whatsappHref } from "@/server/settings/contact-links";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getLinkLabels } from "./link-labels";

const linkStyles =
  "inline-flex min-h-11 items-center text-small text-blue-100 transition-colors hover:text-white hover:underline underline-offset-4 lg:min-h-8";

function FooterHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-eyebrow text-gold-300">{children}</h2>;
}

interface ContactItem {
  key: string;
  label: string;
  value: string;
  href: string;
  /** WhatsApp opens in its own tab or app. */
  newTab?: boolean;
}

function copyrightYears(): string {
  const first = new Date(COMPANY.establishedOn).getUTCFullYear();
  const last = Math.max(first, new Date().getUTCFullYear());
  return first === last ? String(first) : `${first}–${last}`;
}

/**
 * Site footer: who the company is (registered names verbatim), the navigation, the six business
 * lines, the twelve product categories, legal pages and languages. Contact channels are shown only
 * when `channels` has them; none has been supplied yet, and nothing is invented in their place:
 * the Contact and Send inquiry links are always there.
 */
export async function Footer({
  locale,
  channels,
}: {
  locale: Locale;
  channels: PublicContactChannels;
}) {
  const labels = await getLinkLabels(locale);
  const t = labels.common;

  const column = (id: FooterColumnModel["id"]) => FOOTER_COLUMNS.find((entry) => entry.id === id);
  const renderColumn = (id: FooterColumnModel["id"], extra?: ReactNode) => {
    const entry = column(id);
    if (!entry) return null;
    return (
      <div key={id}>
        <FooterHeading>{t(`footer.columns.${id}`)}</FooterHeading>
        <ul className={id === "products" ? "mt-3 grid sm:grid-cols-2 lg:grid-cols-1" : "mt-3 grid"}>
          {entry.links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={linkStyles}>
                {labels.label(link)}
              </Link>
            </li>
          ))}
        </ul>
        {extra}
      </div>
    );
  };

  const contactItems: ContactItem[] = [];
  if (channels.email) {
    contactItems.push({
      key: "email",
      label: t("footer.contact.email"),
      value: channels.email,
      href: mailtoHref(channels.email),
    });
  }
  if (channels.phone) {
    contactItems.push({
      key: "phone",
      label: t("footer.contact.phone"),
      value: channels.phone,
      href: telHref(channels.phone),
    });
  }
  if (channels.whatsapp) {
    contactItems.push({
      key: "whatsapp",
      label: t("footer.contact.whatsapp"),
      value: channels.whatsapp,
      href: whatsappHref(channels.whatsapp),
      newTab: true,
    });
  }

  const contactList =
    contactItems.length > 0 ? (
      <ul className="mt-4 grid gap-3 border-t border-white/10 pt-4">
        {contactItems.map((item) => (
          <li key={item.key} className="grid gap-0.5">
            <span className="text-caption text-blue-200">{item.label}</span>
            <a
              href={item.href}
              {...(item.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="text-small text-blue-100 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              <bdi dir="ltr">{item.value}</bdi>
              {item.newTab ? <span className="sr-only"> ({t("a11y.opensInNewTab")})</span> : null}
            </a>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <footer className="bg-navy-900 text-blue-100">
      <Container>
        <div className="grid gap-12 py-14 lg:grid-cols-12 lg:gap-x-12 lg:py-16">
          <div className="grid content-start gap-6 lg:col-span-4">
            <Logo
              asLink
              tone="onDark"
              legalName="never"
              label={t("a11y.homeLink", { name: SITE.name })}
            />
            <div className="grid gap-1">
              <p className="text-label text-white">
                <bdi lang="en" dir="ltr">
                  {COMPANY.legalNameEn}
                </bdi>
              </p>
              <p lang="zh-CN" className="text-small text-blue-200">
                {COMPANY.legalNameZh}
              </p>
            </div>
            <p className="max-w-sm text-small text-blue-100">{t("footer.about")}</p>
            <section
              aria-labelledby="footer-registered"
              className="max-w-sm border-t border-white/10 pt-5"
            >
              <h2 id="footer-registered" className="text-eyebrow text-gold-300">
                {t("footer.registered.heading")}
              </h2>
              <dl className="mt-3 grid gap-3 text-small">
                <div>
                  <dt className="text-blue-200">{t("footer.registered.address")}</dt>
                  <dd lang="zh-CN" className="mt-0.5 text-blue-100">
                    {COMPANY.registeredAddressZh}
                  </dd>
                </div>
                <div>
                  <dt className="text-blue-200">{t("footer.registered.uscc")}</dt>
                  <dd className="mt-0.5 text-blue-100">
                    <bdi dir="ltr">{COMPANY.unifiedSocialCreditCode}</bdi>
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-caption text-blue-200">{t("footer.registered.note")}</p>
            </section>
          </div>

          <nav
            aria-label={t("a11y.footerNavigation")}
            className="grid gap-10 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3 lg:gap-x-8"
          >
            <div className="grid content-start gap-10">
              {renderColumn("navigation")}
              {renderColumn("company", contactList)}
            </div>
            <div className="grid content-start gap-10">
              {renderColumn("business")}
              {renderColumn("legal")}
              <div>
                <FooterHeading>{t("footer.columns.languages")}</FooterHeading>
                <LanguageSwitcher variant="list" tone="dark" className="-ms-3 mt-3" />
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">{renderColumn("products")}</div>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-blue-200">
            &copy; <bdi>{copyrightYears()}</bdi>{" "}
            <bdi lang="en" dir="ltr">
              {COMPANY.legalNameEn}
            </bdi>{" "}
            {t("footer.rights")}
          </p>
          <p className="text-caption text-blue-200">{t("tagline")}</p>
        </div>
      </Container>
    </footer>
  );
}

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toast";
import { SITE } from "@/config/site";
import { plexSans } from "@/lib/fonts";
import "../../globals.css";

/**
 * Root layout of the admin. It is separate from the public site's layout (its own <html>): English
 * only, left-to-right, with no public header or footer, no analytics and no locale provider.
 * Nothing here is ever indexed. The response also carries `X-Robots-Tag` and `no-store` from
 * next.config.ts; this is the second layer.
 */
export const metadata: Metadata = {
  title: { default: "Shaheen Sky Admin", template: "%s | Shaheen Sky Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  width: "device-width",
  initialScale: 1,
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={plexSans.variable}>
      <body className="min-h-dvh bg-surface text-ink">
        <Toaster viewportLabel="Notifications" closeLabel="Dismiss notification">
          {children}
        </Toaster>
      </body>
    </html>
  );
}

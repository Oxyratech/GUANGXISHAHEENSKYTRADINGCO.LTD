"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import {
  getPlausibleDomain,
  isTrackingBlocked,
  PLAUSIBLE_SCRIPT_SRC,
} from "@/lib/analytics/config";

const subscribeNever = () => () => {};

/**
 * Loads Plausible (cookieless, no personal data) when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set and the
 * visitor has not enabled Do Not Track. Otherwise it renders nothing and no request is made.
 * Plausible follows client-side navigations on its own, so no page-view code is needed here.
 */
export function Analytics() {
  const domain = getPlausibleDomain();
  // The server and the hydrating render answer "no" so their markup matches; the browser's real
  // answer (Do Not Track is only readable there) follows straight after.
  const allowed = useSyncExternalStore(
    subscribeNever,
    () => !isTrackingBlocked(),
    () => false,
  );

  if (!domain || !allowed) return null;
  return (
    <Script
      id="plausible"
      src={PLAUSIBLE_SCRIPT_SRC}
      data-domain={domain}
      strategy="afterInteractive"
    />
  );
}

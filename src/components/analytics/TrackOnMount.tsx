"use client";

import { useEffect, useRef } from "react";
import type { AnalyticsEventName, AnalyticsProps } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";

/**
 * Records an event once when it mounts, e.g. `<TrackOnMount event="product_view" props={{ category }} />`
 * on a product page. Renders nothing. Safe to place in a Server Component page: it does nothing
 * unless analytics are configured and the visitor allows them (see trackEvent).
 */
export function TrackOnMount({
  event,
  props,
}: {
  event: AnalyticsEventName;
  props?: AnalyticsProps;
}) {
  // The props object is new on every render; its JSON is a stable identity.
  const propsJson = props ? JSON.stringify(props) : "";
  const sent = useRef<string | null>(null);

  useEffect(() => {
    const signature = `${event}|${propsJson}`;
    // React Strict Mode runs effects twice in development; count the view once.
    if (sent.current === signature) return;
    sent.current = signature;
    trackEvent(event, propsJson ? (JSON.parse(propsJson) as AnalyticsProps) : undefined);
  }, [event, propsJson]);

  return null;
}

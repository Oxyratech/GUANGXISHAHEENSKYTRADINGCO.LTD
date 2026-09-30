"use client";

import { useMemo, useSyncExternalStore } from "react";
import { deliveryWindowFrom, localDeliveryWindow, type DateWindow } from "@/lib/validation/dates";

const subscribe = () => () => {};
const readEarliest = () => localDeliveryWindow().earliest;
const serverSnapshot = () => "";

/**
 * The delivery-date window by the visitor's own calendar, for the date input's min and max. It is
 * null on the server and while hydrating: the page is generated at build time, so a date computed
 * there would be stale and would not match the browser's, and React would flag the mismatch.
 */
export function useDeliveryWindow(): DateWindow | null {
  const earliest = useSyncExternalStore(subscribe, readEarliest, serverSnapshot);
  return useMemo(() => (earliest === "" ? null : deliveryWindowFrom(earliest)), [earliest]);
}

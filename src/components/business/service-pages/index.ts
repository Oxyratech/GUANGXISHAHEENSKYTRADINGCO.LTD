import type { ReactElement } from "react";
import type { ServiceSlug } from "@/content/services";
import type { Locale } from "@/i18n/locales";
import { BusinessProcurementPage } from "./BusinessProcurementPage";
import { CrossBorderTradePage } from "./CrossBorderTradePage";
import { ImportExportPage } from "./ImportExportPage";
import { InternationalTradingPage } from "./InternationalTradingPage";
import { ProductSourcingPage } from "./ProductSourcingPage";
import { SupplierCoordinationPage } from "./SupplierCoordinationPage";

export type ServicePageComponent = (props: { locale: Locale }) => Promise<ReactElement>;

/**
 * One hand-written page per business line. The record is keyed by the registry's slugs, so adding
 * a line to content/services.ts fails the type check until its page exists.
 */
export const SERVICE_PAGES: Record<ServiceSlug, ServicePageComponent> = {
  "international-trading": InternationalTradingPage,
  "import-export": ImportExportPage,
  "product-sourcing": ProductSourcingPage,
  "supplier-coordination": SupplierCoordinationPage,
  "business-procurement": BusinessProcurementPage,
  "cross-border-trade": CrossBorderTradePage,
};

import type { ReactNode } from "react";
import type { PrimaryNavId } from "@/config/navigation";

/**
 * Serialisable, already-translated navigation handed from the server (Header) to the client islands
 * (SiteNav, MobileNav). The client never needs the services or categories catalogues.
 */

export interface NavLinkModel {
  readonly href: string;
  readonly label: string;
}

export interface NavMenuLinkModel extends NavLinkModel {
  /** One-line summary shown under the label (business lines). */
  readonly description?: string;
  /** Decorative icon, rendered on the server. */
  readonly icon?: ReactNode;
}

export interface NavMenuModel {
  readonly links: readonly NavMenuLinkModel[];
  /** The index page of the section ("All business lines"). */
  readonly viewAll: NavLinkModel;
}

export interface NavItemModel extends NavLinkModel {
  readonly id: PrimaryNavId;
  readonly menu?: NavMenuModel;
}

export interface SiteNavModel {
  readonly items: readonly NavItemModel[];
  readonly inquiry: NavLinkModel;
}

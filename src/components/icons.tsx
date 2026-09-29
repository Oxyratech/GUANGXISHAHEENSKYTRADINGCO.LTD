/*
 * Icon system (Lucide, decorative by default).
 *  - <Icon name="Gift" /> renders any IconName from content/categories (the registry's icon ids).
 *    Decorative icons are aria-hidden; pass `label` (translated) when the icon alone carries meaning.
 *  - <DirectionalIcon /> is an arrow or chevron that points "forward"/"back" in the reading
 *    direction, i.e. it mirrors in RTL. Any other directional icon needs className="rtl-flip".
 *  - The named re-exports below are the extra icons the site uses; import them from here so the
 *    icon set has one audit point.
 */
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Blocks,
  Cable,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cog,
  Gift,
  Globe,
  Handshake,
  House,
  Layers,
  Mountain,
  PackageSearch,
  PaintRoller,
  Shirt,
  ShieldPlus,
  Ship,
  Wheat,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { IconName } from "@/content/categories";
import { cn } from "@/lib/utils";

const ICONS: Record<IconName, LucideIcon> = {
  Gift,
  Shirt,
  Wheat,
  House,
  Blocks,
  PaintRoller,
  Wrench,
  Cable,
  Cog,
  Layers,
  Mountain,
  ShieldPlus,
  Ship,
  Globe,
  PackageSearch,
  Handshake,
  ClipboardList,
  ArrowLeftRight,
};

export type IconProps = Omit<LucideProps, "ref"> & {
  name: IconName;
  /** Translated accessible name. Omit for decorative icons (hidden from assistive tech). */
  label?: string;
};

export function Icon({ name, label, size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  const Component = ICONS[name];
  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      {...props}
    />
  );
}

const DIRECTIONAL = {
  arrow: { forward: ArrowRight, back: ArrowLeft },
  chevron: { forward: ChevronRight, back: ChevronLeft },
} as const;

export type DirectionalIconProps = Omit<LucideProps, "ref"> & {
  kind?: keyof typeof DIRECTIONAL;
  /** "forward" points along the reading direction (right in LTR, left in RTL). */
  direction?: "forward" | "back";
  label?: string;
};

export function DirectionalIcon({
  kind = "arrow",
  direction = "forward",
  label,
  size = 20,
  strokeWidth = 1.75,
  className,
  ...props
}: DirectionalIconProps) {
  const Component = DIRECTIONAL[kind][direction];
  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      className={cn("rtl-flip", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      {...props}
    />
  );
}

export {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Landmark,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Paperclip,
  Phone,
  Search,
  ShieldCheck,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";

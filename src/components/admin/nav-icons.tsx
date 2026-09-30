import {
  Briefcase,
  CircleQuestionMark,
  Images,
  Inbox,
  KeyRound,
  Languages,
  LayoutDashboard,
  Mail,
  Newspaper,
  Package,
  ScrollText,
  SearchCheck,
  Settings,
  Shapes,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { NavIconName } from "./nav";

const ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  inquiries: Inbox,
  contact: Mail,
  products: Package,
  categories: Shapes,
  services: Briefcase,
  faqs: CircleQuestionMark,
  media: Images,
  news: Newspaper,
  seo: SearchCheck,
  translations: Languages,
  users: Users,
  roles: KeyRound,
  settings: Settings,
  audit: ScrollText,
};

/** Decorative: the link's text is its name. */
export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden className={className} />;
}

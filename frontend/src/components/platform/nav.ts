import {
  AppWindow,
  BookUser,
  CreditCard,
  Globe,
  HardDrive,
  KeyRound,
  LayoutTemplate,
  Settings,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Single source of truth for the sidebar, tablet rail, mobile tab bar and the mobile "More" sheet. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/websites", label: "Websites", icon: AppWindow },
      { href: "/templates", label: "Templates", icon: LayoutTemplate },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/payments", label: "Payments", icon: CreditCard },
      { href: "/delivery", label: "Delivery", icon: Truck },
      { href: "/domains", label: "Domains", icon: Globe },
      { href: "/users", label: "Users", icon: Users },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/storage", label: "Storage", icon: HardDrive },
      { href: "/authentication", label: "Authentication", icon: KeyRound },
      { href: "/contact", label: "Contact details", icon: BookUser },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Shown directly in the mobile tab bar; everything else lives behind "More". */
export const MOBILE_PRIMARY = ["/websites", "/templates", "/payments"];

export const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function titleForPath(pathname: string) {
  if (pathname.startsWith("/profile")) return "Profile";
  return NAV_ITEMS.find((i) => isActivePath(pathname, i.href))?.label ?? "Ryugaware";
}

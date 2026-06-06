/** Shared dashboard navigation (Nocturne design + the app's real routes). */

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide kebab name
}

/** Primary nav — mirrors the six design screens. */
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "סקירה", icon: "layout-dashboard" },
  { href: "/expenses", label: "הוצאות", icon: "receipt-text" },
  { href: "/analytics", label: "אנליטיקה", icon: "chart-pie" },
  { href: "/recurring", label: "הוצאות קבועות", icon: "repeat" },
  { href: "/upload", label: "ייבוא אשראי", icon: "upload" },
  { href: "/family", label: "הגדרות", icon: "settings" },
];

/** Secondary real-app routes kept available below the primary nav. */
export const NAV_SECONDARY: NavItem[] = [
  { href: "/budgets", label: "תקציבים", icon: "target" },
  { href: "/status", label: "סטטוס הבוט", icon: "signal" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/users", label: "משתמשי דשבורד", icon: "shield" },
];

/** Best-matching label for a pathname (for the topbar breadcrumb). */
export function labelForPath(pathname: string): string {
  const all = [...NAV, ...NAV_SECONDARY, ...ADMIN_NAV];
  const hit = all.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
  return hit?.label ?? "";
}

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: string;
  match?: "exact" | "prefix";
  children?: NavItem[];
  /** If set, only users whose companyRole is in this list will see the item. */
  requiresCompanyRole?: ("ADMIN" | "USER")[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  placement?: "top" | "bottom";
  /** If set, only users whose companyRole is in this list will see the group. */
  requiresCompanyRole?: ("ADMIN" | "USER")[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        description: "Snapshot of sales, collections, and operating health.",
        icon: "LayoutDashboard",
      },
      {
        href: "/sales",
        label: "Sales",
        description: "Create GST invoices and monitor receivables.",
        icon: "FileText",
      },
      {
        href: "/purchases",
        label: "Purchases",
        description: "Track supplier bills and procurement activity.",
        icon: "ShoppingCart",
      },
      {
        href: "/payments",
        label: "Payments",
        description: "Record incoming and outgoing payments with allocations.",
        icon: "CreditCard",
      },
      {
        href: "/inventory",
        label: "Inventory",
        description: "Manage products, stock levels, and pricing.",
        icon: "Package",
        children: [
          {
            href: "/inventory",
            label: "Products",
            description: "Product master list and stock levels.",
            icon: "Box",
            match: "exact",
          },
          {
            href: "/inventory/categories",
            label: "Categories",
            description: "Product categories and subcategories.",
            icon: "Tags",
            match: "prefix",
          },
        ],
      },
      {
        href: "/facilities",
        label: "Facilities",
        description: "Manage warehouses, godowns, and storage locations.",
        icon: "Warehouse",
      },
    ],
  },
  {
    label: "Ledgers",
    items: [
      {
        href: "/customers",
        label: "Customers",
        description: "Manage customer masters and opening balances.",
        icon: "Users",
      },
      {
        href: "/vendors",
        label: "Vendors",
        description: "Maintain vendor accounts and purchase-side parties.",
        icon: "Truck",
      },
      {
        href: "/ledger",
        label: "Ledger",
        description: "Review running balances and accounting entries.",
        icon: "BookOpen",
      },
    ],
  },
  {
    label: "Reports",
    requiresCompanyRole: ["ADMIN"],
    items: [
      {
        href: "/reports",
        label: "Reports",
        description: "Sales, purchase, and stock analytics for admins.",
        icon: "BarChart3",
        requiresCompanyRole: ["ADMIN"],
        children: [
          {
            href: "/reports/sales",
            label: "Sales Report",
            description: "Sales invoices with party, product, and GST filters.",
            icon: "TrendingUp",
            match: "prefix",
            requiresCompanyRole: ["ADMIN"],
          },
          {
            href: "/reports/purchase",
            label: "Purchase Report",
            description: "Purchase bills with vendor and HSN filters.",
            icon: "TrendingDown",
            match: "prefix",
            requiresCompanyRole: ["ADMIN"],
          },
          {
            href: "/reports/stock",
            label: "Stock Transactions",
            description: "Inward, outward, and adjustments across facilities.",
            icon: "ArrowLeftRight",
            match: "prefix",
            requiresCompanyRole: ["ADMIN"],
          },
        ],
      },
    ],
  },
  {
    label: "Administration",
    placement: "bottom",
    items: [
      {
        href: "/settings",
        label: "Settings",
        description: "Company, financial-year, and account configuration.",
        icon: "Settings",
      },
    ],
  },
];

export const navItems = navGroups.flatMap((group) =>
  group.items.flatMap((item) => (item.children ? [item, ...item.children] : [item]))
);

export type CompanyRole = "ADMIN" | "USER";

function itemAllowed(item: NavItem, role?: CompanyRole | null): boolean {
  if (!item.requiresCompanyRole) return true;
  if (!role) return false;
  return item.requiresCompanyRole.includes(role);
}

/** Filters nav groups and items according to the user's company role. */
export function filterNavGroups(
  groups: NavGroup[],
  role?: CompanyRole | null
): NavGroup[] {
  const result: NavGroup[] = [];
  for (const group of groups) {
    if (group.requiresCompanyRole) {
      if (!role || !group.requiresCompanyRole.includes(role)) continue;
    }
    const items: NavItem[] = [];
    for (const item of group.items) {
      if (!itemAllowed(item, role)) continue;
      if (item.children) {
        const children = item.children.filter((c) => itemAllowed(c, role));
        if (children.length === 0 && item.requiresCompanyRole) continue;
        items.push({ ...item, children });
      } else {
        items.push(item);
      }
    }
    if (items.length === 0) continue;
    result.push({ ...group, items });
  }
  return result;
}

export function matchesNavPath(
  pathname: string,
  href: string,
  match: NavItem["match"] = "prefix"
) {
  if (match === "exact") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getPageMeta(pathname: string) {
  const normalizedPath = pathname === "/" ? "/dashboard" : pathname;

  // Check children first for more specific matches
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.children) {
        const child = item.children.find(
          (c) => matchesNavPath(normalizedPath, c.href, c.match)
        );
        if (child) {
          return { ...child, groupLabel: group.label };
        }
      }
      if (
        matchesNavPath(normalizedPath, item.href, item.match)
      ) {
        return { ...item, groupLabel: group.label };
      }
    }
  }

  const fallback = navGroups[0].items[0];
  return { ...fallback, groupLabel: navGroups[0].label };
}

export function getInitials(name?: string | null) {
  if (!name) {
    return "EA";
  }

  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "EA";
}

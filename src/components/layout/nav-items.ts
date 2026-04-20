export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: string;
  children?: NavItem[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  placement?: "top" | "bottom";
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
          },
          {
            href: "/inventory/categories",
            label: "Categories",
            description: "Product categories and subcategories.",
            icon: "Tags",
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

export function getPageMeta(pathname: string) {
  const normalizedPath = pathname === "/" ? "/dashboard" : pathname;

  // Check children first for more specific matches
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.children) {
        const child = item.children.find(
          (c) =>
            normalizedPath === c.href ||
            normalizedPath.startsWith(`${c.href}/`)
        );
        if (child) {
          return { ...child, groupLabel: group.label };
        }
      }
      if (
        normalizedPath === item.href ||
        normalizedPath.startsWith(`${item.href}/`)
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

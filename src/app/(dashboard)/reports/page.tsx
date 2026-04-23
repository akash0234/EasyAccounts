import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const reports = [
  {
    href: "/reports/sales",
    title: "Sales Report",
    description:
      "Invoice-level sales with filters for customer, facility, GST rate, HSN, batch and date range.",
    icon: TrendingUp,
  },
  {
    href: "/reports/purchase",
    title: "Purchase Report",
    description:
      "Purchase bills across vendors, facilities and tax slabs, with outstanding liabilities.",
    icon: TrendingDown,
  },
  {
    href: "/reports/stock",
    title: "Stock Transactions",
    description:
      "Inward, outward, and adjustment movements across products, batches and facilities.",
    icon: ArrowLeftRight,
  },
];

export default function ReportsIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Reports</h1>
        <p className="text-sm text-slate-500">
          Admin-only analytics for the current company.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rubick-primary/10 text-rubick-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">{description}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-rubick-primary">
                  Open report <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

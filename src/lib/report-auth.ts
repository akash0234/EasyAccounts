import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type ReportAuth =
  | { ok: true; companyId: string; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Ensures the caller is authenticated, has an active company, and is
 * an ADMIN of that company. Used by /api/reports/* routes.
 */
export async function requireReportAdmin(): Promise<ReportAuth> {
  const session = await auth();
  if (!session?.user?.companyId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (session.user.companyRole !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: admin role required" },
        { status: 403 }
      ),
    };
  }
  return {
    ok: true,
    companyId: session.user.companyId,
    userId: session.user.id,
  };
}

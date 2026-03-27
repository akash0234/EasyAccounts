import { NextResponse } from "next/server";
import { db } from "@/db";
import { financialYears } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await db.query.financialYears.findMany({
    where: eq(financialYears.companyId, session.user.companyId),
    orderBy: (fy, { desc }) => [desc(fy.startDate)],
  });

  return NextResponse.json(data);
}

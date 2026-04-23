import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  financialYears,
  ledgerAccounts,
  companyRoleEnum,
  organizationRoleEnum,
} from "@/db/schema";
import { auth } from "@/lib/auth";

type OrganizationRole = (typeof organizationRoleEnum.enumValues)[number];
type CompanyRole = (typeof companyRoleEnum.enumValues)[number];

export interface ActiveCompanyMembership {
  companyId: string;
  companyName: string;
  role: CompanyRole;
}

export interface OrganizationContext {
  userId: string;
  organizationId: string;
  organizationName: string;
  organizationRole: OrganizationRole;
}

export async function createDefaultFinancialYearAndLedgers(companyId: string) {
  const now = new Date();
  const fyStart =
    now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1);
  const fyEnd = new Date(fyStart.getFullYear() + 1, 2, 31);
  const fyLabel = `${fyStart.getFullYear()}-${String(fyEnd.getFullYear()).slice(2)}`;

  await db.insert(financialYears).values({
    companyId,
    label: fyLabel,
    startDate: fyStart,
    endDate: fyEnd,
    isActive: true,
  });

  const defaultAccounts = [
    { name: "Cash", type: "CASH" as const },
    { name: "Bank", type: "BANK" as const },
    { name: "Sales", type: "SALES" as const },
    { name: "Purchase", type: "PURCHASE" as const },
    { name: "GST", type: "GST" as const },
  ];

  await db.insert(ledgerAccounts).values(
    defaultAccounts.map((account) => ({
      companyId,
      name: account.name,
      type: account.type,
    }))
  );
}

export async function getOrganizationContext(): Promise<OrganizationContext> {
  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    throw new Error("Unauthorized");
  }

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    organizationName: session.user.organizationName,
    organizationRole: session.user.organizationRole as OrganizationRole,
  };
}

export async function requireOrganizationRole(
  ...roles: OrganizationRole[]
): Promise<OrganizationContext> {
  const context = await getOrganizationContext();

  if (!roles.includes(context.organizationRole)) {
    throw new Error("Forbidden");
  }

  return context;
}

export async function getActiveCompanyMembership(): Promise<ActiveCompanyMembership> {
  const session = await auth();

  if (!session?.user?.companyId || !session.user.companyName || !session.user.companyRole) {
    throw new Error("Unauthorized");
  }

  return {
    companyId: session.user.companyId,
    companyName: session.user.companyName,
    role: session.user.companyRole as CompanyRole,
  };
}

export async function requireCompanyRole(
  ...roles: CompanyRole[]
): Promise<ActiveCompanyMembership> {
  const membership = await getActiveCompanyMembership();

  if (!roles.includes(membership.role)) {
    throw new Error("Forbidden");
  }

  return membership;
}

export async function getOrganizationCompanies(organizationId: string) {
  return db.query.companies.findMany({
    where: eq(companies.organizationId, organizationId),
    with: {
      members: {
        with: {
          user: true,
        },
      },
    },
    orderBy: (company, { asc }) => [asc(company.name)],
  });
}

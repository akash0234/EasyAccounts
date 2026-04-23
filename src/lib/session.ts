import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function getCompanyId() {
  const session = await getSession();
  if (!session.user.companyId) {
    throw new Error("No active company selected");
  }
  return session.user.companyId;
}

export async function getOrganizationId() {
  const session = await getSession();
  if (!session.user.organizationId) {
    throw new Error("No organization found");
  }
  return session.user.organizationId;
}

export async function requireCompanyRole(...roles: string[]) {
  const session = await getSession();
  const userRole = session.user.companyRole;
  if (!userRole || !roles.includes(userRole)) {
    throw new Error("Forbidden: insufficient role");
  }
  return session;
}

export async function requireOrganizationRole(...roles: string[]) {
  const session = await getSession();
  const userRole = session.user.organizationRole;
  if (!userRole || !roles.includes(userRole)) {
    throw new Error("Forbidden: insufficient role");
  }
  return session;
}

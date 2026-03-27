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
    redirect("/setup");
  }
  return session.user.companyId;
}

export async function requireRole(...roles: string[]) {
  const session = await getSession();
  const userRole = session.user.role;
  if (!userRole || !roles.includes(userRole)) {
    throw new Error("Forbidden: insufficient role");
  }
  return session;
}

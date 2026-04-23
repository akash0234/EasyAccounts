import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session.user.companyRole !== "ADMIN") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}

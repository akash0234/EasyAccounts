import { DefaultSession } from "next-auth";
import "next-auth/jwt";

interface SessionCompanyMembership {
  companyId: string;
  companyName: string;
  role: string;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      organizationName: string;
      organizationRole: string;
      companyId: string;
      companyName: string;
      companyRole: string;
      companies: SessionCompanyMembership[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    organizationId?: string;
    organizationName?: string;
    organizationRole?: string;
    companyId?: string;
    companyName?: string;
    companyRole?: string;
    companyMemberships?: SessionCompanyMembership[];
  }
}

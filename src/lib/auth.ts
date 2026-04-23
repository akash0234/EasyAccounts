import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companyMembers, organizationMembers, users } from "@/db/schema";

async function buildUserAccessState(userId: string, requestedCompanyId?: string | null) {
  const organizationMembership = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, userId),
    with: {
      organization: true,
    },
  });

  if (!organizationMembership) {
    return null;
  }

  const memberships = await db.query.companyMembers.findMany({
    where: eq(companyMembers.userId, userId),
    with: {
      company: true,
    },
    orderBy: (membership, { asc }) => [asc(membership.createdAt)],
  });

  const companyMemberships = memberships
    .filter(
      (membership) =>
        membership.company.organizationId === organizationMembership.organizationId
    )
    .map((membership) => ({
      companyId: membership.companyId,
      companyName: membership.company.name,
      role: membership.role,
    }));

  const activeMembership =
    companyMemberships.find(
      (membership) => membership.companyId === requestedCompanyId
    ) ?? companyMemberships[0];

  return {
    organizationId: organizationMembership.organizationId,
    organizationName: organizationMembership.organization.name,
    organizationRole: organizationMembership.role,
    companyMemberships,
    activeMembership,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }

      if (!token.id) {
        return token;
      }

      const requestedCompanyId =
        trigger === "update" &&
        typeof (session as { activeCompanyId?: string } | undefined)?.activeCompanyId ===
          "string"
          ? (session as { activeCompanyId?: string }).activeCompanyId
          : (token.companyId as string | undefined);

      const accessState = await buildUserAccessState(
        token.id as string,
        requestedCompanyId
      );

      if (!accessState) {
        return token;
      }

      token.organizationId = accessState.organizationId;
      token.organizationName = accessState.organizationName;
      token.organizationRole = accessState.organizationRole;
      token.companyMemberships = accessState.companyMemberships;
      token.companyId = accessState.activeMembership?.companyId;
      token.companyName = accessState.activeMembership?.companyName;
      token.companyRole = accessState.activeMembership?.role;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string;
        session.user.organizationName = token.organizationName as string;
        session.user.organizationRole = token.organizationRole as string;
        session.user.companyId = token.companyId as string;
        session.user.companyName = token.companyName as string;
        session.user.companyRole = token.companyRole as string;
        session.user.companies = Array.isArray(token.companyMemberships)
          ? (token.companyMemberships as {
              companyId: string;
              companyName: string;
              role: string;
            }[])
          : [];
      }

      return session;
    },
    authorized: async ({ auth: session, request }) => {
      const isAuthenticated = Boolean(session?.user);
      const isAuthRoute = ["/login", "/register"].includes(
        request.nextUrl.pathname
      );

      if (isAuthRoute) {
        return true;
      }

      return isAuthenticated;
    },
  },
});

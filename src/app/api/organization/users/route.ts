import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  companyMembers,
  organizationMembers,
  users,
} from "@/db/schema";
import { requireOrganizationRole } from "@/lib/organization";
import { organizationUserSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const context = await requireOrganizationRole("OWNER", "ADMIN");
    const body = await req.json();
    const parsed = organizationUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const company = await db.query.companies.findFirst({
      where: and(
        eq(companies.id, parsed.data.companyId),
        eq(companies.organizationId, context.organizationId)
      ),
    });

    if (!company) {
      return NextResponse.json(
        { error: "Selected company does not belong to your organization" },
        { status: 400 }
      );
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    let userId = existingUser?.id;

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      const [user] = await db
        .insert(users)
        .values({
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
        })
        .returning();

      userId = user.id;

      await db.insert(organizationMembers).values({
        userId,
        organizationId: context.organizationId,
        role: "USER",
      });
    } else {
      const existingOrgMembership = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, existingUser.id),
          eq(organizationMembers.organizationId, context.organizationId)
        ),
      });

      if (!existingOrgMembership) {
        return NextResponse.json(
          {
            error:
              "That email already belongs to a user in another organization",
          },
          { status: 400 }
        );
      }
    }

    const existingCompanyMembership = await db.query.companyMembers.findFirst({
      where: and(
        eq(companyMembers.userId, userId!),
        eq(companyMembers.companyId, parsed.data.companyId)
      ),
    });

    if (existingCompanyMembership) {
      return NextResponse.json(
        { error: "User already has access to this company" },
        { status: 400 }
      );
    }

    await db.insert(companyMembers).values({
      userId: userId!,
      companyId: parsed.data.companyId,
      role: parsed.data.role,
    });

    return NextResponse.json({ message: "Company user created successfully" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    const status = message === "Forbidden" ? 403 : 401;

    return NextResponse.json({ error: message }, { status });
  }
}

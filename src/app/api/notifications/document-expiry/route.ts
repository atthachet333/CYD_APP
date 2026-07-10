import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDocumentExpiryAlerts } from "@/lib/document-alerts";

async function currentUser(session: any) {
  const username = session?.user?.username || session?.user?.name || "";
  const email = session?.user?.email || "";

  return prisma.users.findFirst({
    where: {
      OR: [{ username }, { email }, { full_name: session?.user?.name || "" }],
    },
    include: { roles: true },
  });
}

export async function GET() {
  const requestId = crypto.randomUUID();
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized", requestId }, { status: 401 });
  }

  try {
    const user = await currentUser(session);
    const role = String(user?.roles?.name || (session.user as any)?.role || "").toUpperCase();
    const isInternal = ["ADMIN", "STAFF", "SUPERADMIN"].includes(role);
    const companyId = user?.company_id || (session.user as any)?.companyId || null;

    if (!isInternal && !companyId) {
      return NextResponse.json({ ok: false, error: "Forbidden", requestId }, { status: 403 });
    }

    const employees = await prisma.employee_document_profiles.findMany({
      where: isInternal ? {} : { company_id: Number(companyId) },
      orderBy: { created_at: "desc" },
    });
    const companies = await prisma.companies.findMany({
      select: { id: true, company_name: true },
    });
    const companyNameById = new Map(companies.map((company) => [company.id, company.company_name]));
    const result = buildDocumentExpiryAlerts(employees, companyNameById);

    console.log("[document-expiry]", {
      requestId,
      userId: user?.id || null,
      role,
      companyId: isInternal ? "ALL" : Number(companyId),
      notificationCount: result.summary.total,
    });

    return NextResponse.json({ ok: true, ...result, requestId });
  } catch (error) {
    console.error("[document-expiry] failed", { requestId, message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: "Failed to load document expiry notifications", requestId }, { status: 500 });
  }
}

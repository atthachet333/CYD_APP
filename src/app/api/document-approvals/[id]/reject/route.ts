import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INTERNAL_ROLES = new Set(["ADMIN", "STAFF", "SUPERADMIN"]);

async function currentUser(session: any) {
  const username = session?.user?.username || session?.user?.name || "";
  const email = session?.user?.email || "";

  return prisma.users.findFirst({
    where: { OR: [{ username }, { email }, { full_name: session?.user?.name || "" }] },
    include: { roles: true },
  });
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized", requestId }, { status: 401 });
  }

  const user = await currentUser(session);
  const role = String(user?.roles?.name || (session.user as any)?.role || "").toUpperCase();

  if (!INTERNAL_ROLES.has(role)) {
    return NextResponse.json({ ok: false, error: "Forbidden", requestId }, { status: 403 });
  }

  const { id: rawId } = await props.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid approval id", requestId }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = String(body?.reason || "").trim();
  if (!reason) {
    return NextResponse.json({ ok: false, error: "Reject reason is required", requestId }, { status: 400 });
  }

  const existing = await prisma.employee_document_approvals.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Approval request not found", requestId }, { status: 404 });
  }

  if (existing.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Approval request is already reviewed", requestId }, { status: 409 });
  }

  const now = new Date();
  const result = await prisma.employee_document_approvals.updateMany({
    where: { id, status: "pending" },
    data: {
      status: "rejected",
      reviewed_by: user?.id || null,
      reviewed_at: now,
      review_note: reason,
      updated_at: now,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ ok: false, error: "Approval request is already reviewed", requestId }, { status: 409 });
  }

  await prisma.logs.create({
    data: {
      user_id: user?.id || null,
      action: "DOCUMENT_REJECTED",
      details: JSON.stringify({
        approvalId: id,
        employeeId: existing.profile_id,
        documentType: existing.action_type,
        reason,
      }),
    },
  }).catch(() => null);

  return NextResponse.json({ ok: true, id, status: "rejected", message: "ปฏิเสธเอกสารสำเร็จ", requestId });
}

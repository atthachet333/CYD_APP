import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INTERNAL_ROLES = new Set(["ADMIN", "STAFF", "SUPERADMIN"]);
const DOCUMENT_TYPES = new Set(["passport", "visa", "work_permit", "ninety_day"]);

async function currentUser(session: any) {
  const username = session?.user?.username || session?.user?.name || "";
  const email = session?.user?.email || "";

  return prisma.users.findFirst({
    where: { OR: [{ username }, { email }, { full_name: session?.user?.name || "" }] },
    include: { roles: true },
  });
}

function parsePayload(value: string) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function normalizeDocumentType(value: unknown) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "pp") return "passport";
  if (raw === "vs") return "visa";
  if (raw === "workpermit") return "work_permit";
  if (raw === "90d" || raw === "report_90_days") return "ninety_day";
  return DOCUMENT_TYPES.has(raw) ? raw : "";
}

function documentFile(profile: any, documentType: string) {
  if (documentType === "passport") return profile.passport_file;
  if (documentType === "visa") return profile.visa_file;
  if (documentType === "work_permit") return profile.work_permit_file;
  if (documentType === "ninety_day") return profile.ninety_day_file;
  return null;
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function nextMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export async function GET(request: NextRequest) {
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

  const statusFilter = String(request.nextUrl.searchParams.get("status") || "").trim().toLowerCase();
  const search = String(request.nextUrl.searchParams.get("search") || "").trim().toLowerCase();
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1) || 1);
  const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 100) || 100));

  const approvals = await prisma.employee_document_approvals.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    orderBy: { created_at: "desc" },
  });

  const profileIds = approvals.map((item) => item.profile_id).filter((id): id is number => typeof id === "number");
  const profiles = await prisma.employee_document_profiles.findMany({
    where: { id: { in: profileIds } },
  });
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  const companyIds = profiles.map((profile) => profile.company_id).filter((id): id is number => typeof id === "number");
  const companies = await prisma.companies.findMany({
    where: { id: { in: companyIds } },
    select: { id: true, company_name: true },
  });
  const companyById = new Map(companies.map((company) => [company.id, company.company_name]));

  const items = approvals.map((approval) => {
    const profile = approval.profile_id ? profileById.get(approval.profile_id) : null;
    const payload = parsePayload(approval.payload_json);
    const documentType = normalizeDocumentType(
      payload.documentType || payload.document_type || payload.docType || payload.type || approval.action_type,
    );
    const hasStagedFile = Boolean(payload.stagedFile?.ext);
    const hasTypedFile = Boolean(profile && documentType && documentFile(profile, documentType));
    const hasMainFile = Boolean(profile?.document_file_name);
    const viewUrl = hasStagedFile
      ? `/api/document-approvals/${approval.id}/file`
      : profile && documentType
      ? `/api/documents/view?employeeId=${profile.id}&documentType=${documentType}`
      : profile?.document_file_name
        ? `/api/documents/${encodeURIComponent(profile.document_file_name)}`
        : null;

    return {
      id: approval.id,
      requestNumber: `REQ-${String(approval.id).padStart(6, "0")}`,
      employeeId: profile?.id || null,
      empCode: profile?.emp_code || "-",
      employeeName: `${profile?.first_name_th || profile?.first_name || ""} ${profile?.last_name_th || profile?.last_name || ""}`.trim() || "-",
      companyName: profile?.company_id ? companyById.get(profile.company_id) || "-" : "-",
      documentType: documentType || approval.action_type,
      status: approval.status,
      requestedAt: approval.created_at.toISOString(),
      reviewedAt: approval.reviewed_at?.toISOString() || null,
      reviewedBy: approval.reviewed_by || null,
      remark: approval.review_note,
      oldDocumentNumber: payload.oldDocumentNumber || null,
      newDocumentNumber: payload.newDocumentNumber || null,
      oldExpiryDate: payload.oldExpiryDate || null,
      newExpiryDate: payload.newExpiryDate || null,
      hasFile: Boolean(hasStagedFile || (documentType ? hasTypedFile : hasMainFile)),
      hasStagedFile,
      fileStatus: (hasStagedFile || (documentType ? hasTypedFile : hasMainFile)) ? "available" : "missing",
      viewUrl,
    };
  });

  const filtered = search
    ? items.filter((item) =>
        [
          item.requestNumber,
          item.empCode,
          item.employeeName,
          item.companyName,
          item.documentType,
          item.status,
        ].some((value) => String(value || "").toLowerCase().includes(search)),
      )
    : items;
  const paged = filtered.slice((page - 1) * limit, page * limit);
  const now = new Date();

  return NextResponse.json({
    ok: true,
    summary: {
      all: items.length,
      pending: items.filter((item) => item.status === "pending").length,
      approvedThisMonth: items.filter((item) => {
        if (item.status !== "approved" || !item.reviewedAt) return false;
        const reviewedAt = new Date(item.reviewedAt);
        return reviewedAt >= monthStart(now) && reviewedAt < nextMonthStart(now);
      }).length,
      rejected: items.filter((item) => item.status === "rejected").length,
    },
    items: paged,
    page,
    limit,
    total: filtered.length,
    requestId,
  });
}

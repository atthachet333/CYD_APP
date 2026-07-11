import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { copyFile, mkdir, readdir, rm } from "fs/promises";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { safeFileNameFrom } from "@/lib/docDebug";

const INTERNAL_ROLES = new Set(["ADMIN", "STAFF", "SUPERADMIN"]);
const STATUSES = new Set(["approved", "rejected", "pending"]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp"]);
const DOCUMENTS_ROOT = path.join(process.cwd(), "private_uploads", "employee_documents");
const PENDING_ROOT = path.join(process.cwd(), "private_uploads", "pending_document_approvals");
const DOCUMENT_CONFIG = {
  passport: { numberField: "passport_number", dateField: "passport_expiry_date", fileField: "passport_file" },
  visa: { numberField: "visa_number", dateField: "visa_expiry_date", fileField: "visa_file" },
  work_permit: { numberField: "work_permit_number", dateField: "work_permit_expiry_date", fileField: "work_permit_file" },
  ninety_day: { numberField: "ninety_day_number", dateField: "ninety_day_report_date", fileField: "ninety_day_file" },
} as const;

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

function nullableDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function promoteFile(approvalId: number, documentType: keyof typeof DOCUMENT_CONFIG, employee: any, ext: string) {
  const source = path.join(PENDING_ROOT, String(approvalId), `${documentType}${ext}`);
  if (!fs.existsSync(source)) throw new Error("Staged file not found");

  const employeeFolder = safeFileNameFrom(employee.emp_code || `employee-${employee.id}`);
  const uploadDir = path.join(DOCUMENTS_ROOT, employeeFolder);
  await mkdir(uploadDir, { recursive: true });

  const finalName = `${documentType}${ext}`;
  const finalPath = path.join(uploadDir, finalName);
  await copyFile(source, finalPath);

  const existingFiles = await readdir(uploadDir);
  await Promise.all(
    existingFiles
      .filter((name) => name.startsWith(`${documentType}.`) && name !== finalName)
      .map((name) => rm(path.join(uploadDir, name), { force: true })),
  );

  return `employee_documents/${employeeFolder}/${finalName}`;
}

function profileDataFromPayload(payload: any, config: typeof DOCUMENT_CONFIG[keyof typeof DOCUMENT_CONFIG], mode: "new" | "old") {
  return {
    [config.numberField]: String(payload[mode === "new" ? "newDocumentNumber" : "oldDocumentNumber"] || "") || null,
    [config.dateField]: nullableDate(payload[mode === "new" ? "newExpiryDate" : "oldExpiryDate"]),
  };
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
  const newStatus = String(body?.newStatus || "").trim().toLowerCase();
  const reason = String(body?.reason || "").trim();
  if (!STATUSES.has(newStatus)) {
    return NextResponse.json({ ok: false, error: "Invalid new status", requestId }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ ok: false, error: "Revise reason is required", requestId }, { status: 400 });
  }

  const existing = await prisma.employee_document_approvals.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Approval request not found", requestId }, { status: 404 });
  }
  if (existing.status === newStatus) {
    return NextResponse.json({ ok: false, error: "New status is the same as current status", requestId }, { status: 409 });
  }

  const payload = parsePayload(existing.payload_json);
  const documentType = String(payload.documentType || "").toLowerCase() as keyof typeof DOCUMENT_CONFIG;
  const config = DOCUMENT_CONFIG[documentType];
  if (!config || !existing.profile_id) {
    return NextResponse.json({ ok: false, error: "Invalid approval payload", requestId }, { status: 400 });
  }

  const employee = await prisma.employee_document_profiles.findUnique({ where: { id: existing.profile_id } });
  if (!employee) {
    return NextResponse.json({ ok: false, error: "Employee not found", requestId }, { status: 404 });
  }

  const now = new Date();
  const profileData: Record<string, any> = {};
  const stagedExt = payload.stagedFile?.ext ? String(payload.stagedFile.ext).toLowerCase() : "";

  if (newStatus === "approved") {
    Object.assign(profileData, profileDataFromPayload(payload, config, "new"));
    if (stagedExt) {
      if (!ALLOWED_EXTENSIONS.has(stagedExt)) {
        return NextResponse.json({ ok: false, error: "Invalid staged file", requestId }, { status: 400 });
      }
      const stagedPath = path.join(PENDING_ROOT, String(id), `${documentType}${stagedExt}`);
      if (!fs.existsSync(stagedPath)) {
        return NextResponse.json({ ok: false, error: "Staged file is missing; please submit a new request", requestId }, { status: 409 });
      }
      profileData[config.fileField] = await promoteFile(id, documentType, employee, stagedExt);
    }
  }

  if (existing.status === "approved" && newStatus !== "approved") {
    if (stagedExt) {
      return NextResponse.json(
        { ok: false, error: "Cannot safely rollback approved file because original file backup is not available", requestId },
        { status: 409 },
      );
    }
    Object.assign(profileData, profileDataFromPayload(payload, config, "old"));
  }

  if (existing.status === "rejected" && newStatus === "pending" && stagedExt) {
    const stagedPath = path.join(PENDING_ROOT, String(id), `${documentType}${stagedExt}`);
    if (!fs.existsSync(stagedPath)) {
      return NextResponse.json({ ok: false, error: "Staged file is missing; please submit a new request", requestId }, { status: 409 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.employee_document_approvals.update({
      where: { id },
      data: {
        status: newStatus,
        reviewed_by: newStatus === "pending" ? null : user?.id || null,
        reviewed_at: newStatus === "pending" ? null : now,
        review_note: reason,
        updated_at: now,
      },
    });
    if (Object.keys(profileData).length > 0) {
      await tx.employee_document_profiles.update({ where: { id: employee.id }, data: profileData });
    }
    await tx.logs.create({
      data: {
        user_id: user?.id || null,
        action: "DOCUMENT_APPROVAL_REVISED",
        details: JSON.stringify({
          approvalId: id,
          profileId: existing.profile_id,
          documentType,
          oldStatus: existing.status,
          newStatus,
          actor: user?.id || null,
          reason,
          timestamp: now.toISOString(),
        }),
      },
    });
  });

  if (newStatus === "approved") {
    await rm(path.join(PENDING_ROOT, String(id)), { recursive: true, force: true }).catch(() => null);
  }

  return NextResponse.json({ ok: true, id, oldStatus: existing.status, newStatus, requestId });
}

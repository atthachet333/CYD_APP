import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { copyFile, mkdir, readdir, rm } from "fs/promises";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { safeFileNameFrom } from "@/lib/docDebug";

const INTERNAL_ROLES = new Set(["ADMIN", "STAFF", "SUPERADMIN"]);
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

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
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

  const existing = await prisma.employee_document_approvals.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Approval request not found", requestId }, { status: 404 });
  }

  if (existing.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Approval request is already reviewed", requestId }, { status: 409 });
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
  const profileData: Record<string, any> = {
    [config.numberField]: String(payload.newDocumentNumber || "") || null,
    [config.dateField]: nullableDate(payload.newExpiryDate),
  };
  if (payload.stagedFile?.ext) {
    const ext = String(payload.stagedFile.ext).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ ok: false, error: "Invalid staged file", requestId }, { status: 400 });
    }
    profileData[config.fileField] = await promoteFile(id, documentType, employee, ext);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedApproval = await tx.employee_document_approvals.updateMany({
      where: { id, status: "pending" },
      data: {
        status: "approved",
        reviewed_by: user?.id || null,
        reviewed_at: now,
        updated_at: now,
      },
    });
    if (updatedApproval.count === 0) return updatedApproval;
    await tx.employee_document_profiles.update({ where: { id: employee.id }, data: profileData });
    return updatedApproval;
  });

  if (result.count === 0) {
    return NextResponse.json({ ok: false, error: "Approval request is already reviewed", requestId }, { status: 409 });
  }

  await prisma.logs.create({
    data: {
      user_id: user?.id || null,
      action: "DOCUMENT_APPROVED",
      details: JSON.stringify({
        approvalId: id,
        employeeId: existing.profile_id,
        documentType: existing.action_type,
      }),
    },
  }).catch(() => null);
  await rm(path.join(PENDING_ROOT, String(id)), { recursive: true, force: true }).catch(() => null);

  return NextResponse.json({ ok: true, id, status: "approved", message: "อนุมัติเอกสารสำเร็จ", requestId });
}

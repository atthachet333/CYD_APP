import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const PENDING_ROOT = path.join(process.cwd(), "private_uploads", "pending_document_approvals");
const DOCUMENTS = [
  {
    type: "passport",
    numberField: "passport_number",
    dateField: "passport_expiry_date",
    fileField: "passport_document",
  },
  {
    type: "visa",
    numberField: "visa_number",
    dateField: "visa_expiry_date",
    fileField: "visa_document",
  },
  {
    type: "work_permit",
    numberField: "work_permit_number",
    dateField: "work_permit_expiry_date",
    fileField: "work_permit_document",
  },
  {
    type: "ninety_day",
    numberField: "ninety_day_number",
    dateField: "ninety_day_report_date",
    fileField: "ninety_day_document",
  },
] as const;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function dateText(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function dbDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function validateFile(file: File) {
  const ext = path.extname(file.name).toLowerCase();
  if (![".pdf", ".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return { error: "Unsupported file type" };
  if (!ALLOWED_MIME_TYPES.has(file.type)) return { error: "Unsupported MIME type" };
  if (file.size > MAX_FILE_SIZE) return { error: "File is larger than 10MB" };
  return { ext };
}

function parsePayload(value: string) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

async function currentUser(session: any) {
  const username = session?.user?.username || session?.user?.name || "";
  const email = session?.user?.email || "";

  return prisma.users.findFirst({
    where: { OR: [{ username }, { email }, { full_name: session?.user?.name || "" }] },
    include: { roles: true },
  });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized", requestId }, { status: 401 });
  }

  const user = await currentUser(session);
  const role = String(user?.roles?.name || (session.user as any)?.role || "").toUpperCase();
  const isCustomer = role === "CUSTOMER";
  const companyId = Number(user?.company_id || (session.user as any)?.companyId || 0);

  if (!isCustomer || !companyId) {
    return NextResponse.json({ ok: false, error: "Forbidden", requestId }, { status: 403 });
  }

  const formData = await request.formData();
  const employeeId = Number(text(formData, "employeeId") || text(formData, "id"));
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid employee id", requestId }, { status: 400 });
  }

  const employee = await prisma.employee_document_profiles.findFirst({
    where: { id: employeeId, company_id: companyId },
  });
  if (!employee) {
    return NextResponse.json({ ok: false, error: "Employee not found", requestId }, { status: 404 });
  }

  const pending = await prisma.employee_document_approvals.findMany({
    where: { profile_id: employee.id, status: "pending" },
    select: { id: true, payload_json: true },
  });
  const pendingTypes = new Set(pending.map((item) => String(parsePayload(item.payload_json).documentType || "")));
  const approvals: { approvalId: number; documentType: string }[] = [];

  for (const doc of DOCUMENTS) {
    const newDocumentNumber = text(formData, doc.numberField);
    const newExpiryDate = dateText(formData, doc.dateField);
    const file = formData.get(doc.fileField);
    const hasFile = file instanceof File && file.size > 0;
    const oldDocumentNumber = String(employee[doc.numberField as keyof typeof employee] || "");
    const oldExpiryDate = dbDate(employee[doc.dateField as keyof typeof employee] as any);
    const changed = newDocumentNumber !== oldDocumentNumber || newExpiryDate !== oldExpiryDate || hasFile;

    if (!changed) continue;
    if (pendingTypes.has(doc.type)) {
      return NextResponse.json({ ok: false, error: "มีคำขอรอตรวจสอบอยู่แล้ว", documentType: doc.type, requestId }, { status: 409 });
    }

    let fileInfo: { ext: string; mimeType: string; size: number } | null = null;
    if (hasFile) {
      const validation = validateFile(file);
      if (validation.error || !validation.ext) {
        return NextResponse.json({ ok: false, error: validation.error || "Invalid file", documentType: doc.type, requestId }, { status: 400 });
      }
      fileInfo = { ext: validation.ext, mimeType: file.type, size: file.size };
    }

    const approval = await prisma.employee_document_approvals.create({
      data: {
        action_type: "DOCUMENT_RENEWAL",
        profile_id: employee.id,
        payload_json: JSON.stringify({
          documentType: doc.type,
          oldDocumentNumber,
          newDocumentNumber,
          oldExpiryDate,
          newExpiryDate,
          stagedFile: fileInfo,
        }),
        status: "pending",
        requested_by: user?.id || null,
        updated_at: new Date(),
      },
    });

    try {
      if (hasFile && fileInfo) {
        const uploadDir = path.join(PENDING_ROOT, String(approval.id));
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, `${doc.type}${fileInfo.ext}`), Buffer.from(await file.arrayBuffer()));
      }
      approvals.push({ approvalId: approval.id, documentType: doc.type });
      pendingTypes.add(doc.type);
    } catch (error) {
      await prisma.employee_document_approvals.delete({ where: { id: approval.id } }).catch(() => null);
      await rm(path.join(PENDING_ROOT, String(approval.id)), { recursive: true, force: true }).catch(() => null);
      throw error;
    }
  }

  const profileData: Record<string, string | null> = {};
  for (const field of ["first_name_th", "last_name_th", "first_name_en", "last_name_en", "healthcare_rights"]) {
    if (formData.has(field)) profileData[field] = text(formData, field) || null;
  }
  if (Object.keys(profileData).length > 0) {
    await prisma.employee_document_profiles.update({ where: { id: employee.id }, data: profileData });
  }

  if (approvals.length === 0 && Object.keys(profileData).length === 0) {
    return NextResponse.json({ ok: false, error: "ไม่พบข้อมูลเอกสารที่เปลี่ยนแปลง", requestId }, { status: 400 });
  }

  return NextResponse.json({ ok: true, approvals, updated_profile_fields: Object.keys(profileData), requestId }, { status: 201 });
}

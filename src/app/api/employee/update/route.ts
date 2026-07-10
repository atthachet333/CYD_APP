import fs from "fs";
import { mkdir, readdir, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRequestId, logDoc, logDocError, requestHeadersForDebug, safeFileNameFrom } from "@/lib/docDebug";

export const runtime = "nodejs";

const DOCUMENTS_ROOT = path.join(process.cwd(), "private_uploads", "employee_documents");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_FIELDS = [
  ["passport_document", "passport", "passport_file"],
  ["visa_document", "visa", "visa_file"],
  ["work_permit_document", "work_permit", "work_permit_file"],
  ["ninety_day_document", "ninety_day", "ninety_day_file"],
] as const;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function nullableDate(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nullableNumber(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateFile(file: File) {
  const ext = path.extname(file.name).toLowerCase();
  if (![".pdf", ".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return { error: "Unsupported file type" };
  if (!ALLOWED_MIME_TYPES.has(file.type)) return { error: "Unsupported MIME type" };
  if (file.size > MAX_FILE_SIZE) return { error: "File is larger than 10MB" };
  return { ext };
}

async function currentUser(session: any) {
  const username = session?.user?.username || session?.user?.name || "";
  const email = session?.user?.email || "";
  return prisma.users.findFirst({
    where: { OR: [{ username }, { email }, { full_name: session?.user?.name || "" }] },
    include: { roles: true },
  });
}

async function saveDocument(file: File, fileBase: string, dbField: string, employeeFolderName: string, requestId: string) {
  const validation = validateFile(file);
  if (validation.error || !validation.ext) throw new Error(validation.error || "Invalid file");

  const uploadDir = path.join(DOCUMENTS_ROOT, employeeFolderName);
  const finalName = `${fileBase}${validation.ext}`;
  const tempPath = path.join(uploadDir, `.${finalName}.${requestId}.tmp`);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));

  const existingFiles = await readdir(uploadDir);
  await Promise.all(
    existingFiles
      .filter((name) => name.startsWith(`${fileBase}.`))
      .map((name) => rm(path.join(uploadDir, name), { force: true })),
  );
  await rename(tempPath, path.join(uploadDir, finalName));

  return { dbField, relativePath: `employee_documents/${employeeFolderName}/${finalName}` };
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  logDoc(requestId, "EMPLOYEE_UPDATE START", requestHeadersForDebug(request));

  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ ok: false, error: "Unauthorized", requestId }, { status: 401 });

    const user = await currentUser(session);
    const role = String(user?.roles?.name || (session.user as any)?.role || "").toUpperCase();
    const isInternal = ["ADMIN", "STAFF", "SUPERADMIN"].includes(role);
    const isCustomer = role === "CUSTOMER";
    const userCompanyId = Number(user?.company_id || (session.user as any)?.companyId || 0);

    if (!isInternal && !isCustomer) {
      return NextResponse.json({ ok: false, error: "Forbidden", requestId }, { status: 403 });
    }

    if (isCustomer && !userCompanyId) {
      return NextResponse.json({ ok: false, error: "Forbidden", requestId }, { status: 403 });
    }

    const formData = await request.formData();
    const id = Number(text(formData, "id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid employee id", requestId }, { status: 400 });
    }

    const employee = await prisma.employee_document_profiles.findUnique({ where: { id } });
    if (!employee) return NextResponse.json({ ok: false, error: "Employee not found", requestId }, { status: 404 });

    if (isCustomer && Number(employee.company_id) !== userCompanyId) {
      return NextResponse.json({ ok: false, error: "Employee not found", requestId }, { status: 404 });
    }

    const data: Record<string, any> = {};
    const textFields = isInternal
      ? ["emp_code", "first_name_th", "last_name_th", "first_name_en", "last_name_en", "healthcare_rights", "passport_number", "visa_number", "work_permit_number", "ninety_day_number"]
      : ["first_name_th", "last_name_th", "first_name_en", "last_name_en", "healthcare_rights", "passport_number", "visa_number", "work_permit_number", "ninety_day_number"];
    const numberFields = isInternal ? ["company_id", "work_type_id", "debt_amount"] : [];

    for (const field of textFields) {
      if (formData.has(field)) data[field] = nullableText(formData, field);
    }
    for (const field of ["passport_expiry_date", "visa_expiry_date", "work_permit_expiry_date", "ninety_day_report_date", "report_90_days_date"]) {
      if (formData.has(field)) data[field] = nullableDate(formData, field);
    }
    for (const field of numberFields) {
      if (formData.has(field)) data[field] = nullableNumber(formData, field);
    }

    if (data.emp_code && data.emp_code !== employee.emp_code) {
      const hasDocs = Boolean(employee.passport_file || employee.visa_file || employee.work_permit_file || employee.ninety_day_file);
      if (hasDocs) {
        return NextResponse.json({ ok: false, error: "Cannot change emp_code while employee documents exist", requestId }, { status: 409 });
      }

      const duplicate = await prisma.employee_document_profiles.findFirst({
        where: { emp_code: data.emp_code, NOT: { id: employee.id } },
        select: { id: true },
      });
      if (duplicate) return NextResponse.json({ ok: false, error: "Duplicate employee code", requestId }, { status: 409 });
    }

    const employeeFolderName = safeFileNameFrom(employee.emp_code || `employee-${employee.id}`);
    const uploadedDocuments = { passport: false, visa: false, work_permit: false, ninety_day: false };

    for (const [inputName, fileBase, dbField] of DOCUMENT_FIELDS) {
      const file = formData.get(inputName);
      if (!(file instanceof File) || file.size === 0) continue;
      const saved = await saveDocument(file, fileBase, dbField, employeeFolderName, requestId);
      data[saved.dbField] = saved.relativePath;
      uploadedDocuments[fileBase] = true;
    }

    const updated = await prisma.employee_document_profiles.update({ where: { id: employee.id }, data });
    logDoc(requestId, "EMPLOYEE_UPDATE END", { status: 200, employeeId: updated.id, role, durationMs: Date.now() - startedAt });

    return NextResponse.json({ ok: true, id: updated.id, emp_code: updated.emp_code, uploaded_documents: uploadedDocuments, requestId });
  } catch (error: any) {
    logDocError(requestId, "EMPLOYEE_UPDATE ERROR", error);
    return NextResponse.json({ ok: false, error: error?.message || "Failed to update employee", requestId }, { status: 500 });
  }
}

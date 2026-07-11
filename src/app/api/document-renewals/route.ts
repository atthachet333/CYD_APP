import { mkdir, readdir, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRequestId, logDocError, safeFileNameFrom } from "@/lib/docDebug";

export const runtime = "nodejs";

const INTERNAL_ROLES = new Set(["ADMIN", "STAFF", "SUPERADMIN"]);
const DOCUMENTS_ROOT = path.join(process.cwd(), "private_uploads", "employee_documents");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_CONFIG = {
  passport: {
    storageName: "passport",
    fileInputName: "passport_document",
    numberField: "passport_number",
    dateField: "passport_expiry_date",
    fileField: "passport_file",
    action: "PASSPORT_RENEWED",
  },
  ninety_day: {
    storageName: "ninety_day",
    fileInputName: "ninety_day_document",
    numberField: "ninety_day_number",
    dateField: "ninety_day_report_date",
    fileField: "ninety_day_file",
    action: "NINETY_DAY_RENEWED",
  },
} as const;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateFile(file: File) {
  const ext = path.extname(file.name || "").toLowerCase();
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

async function saveDocumentFile(file: File, employee: any, requestId: string, storageName: "passport" | "ninety_day") {
  const validation = validateFile(file);
  if (validation.error || !validation.ext) throw new Error(validation.error || "Invalid file");

  const employeeFolder = safeFileNameFrom(employee.emp_code || `employee-${employee.id}`);
  const uploadDir = path.join(DOCUMENTS_ROOT, employeeFolder);
  const finalName = `${storageName}${validation.ext}`;
  const tempPath = path.join(uploadDir, `.${finalName}.${requestId}.tmp`);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));

  const existingFiles = await readdir(uploadDir);
  await Promise.all(
    existingFiles
      .filter((name) => name.startsWith(`${storageName}.`))
      .map((name) => rm(path.join(uploadDir, name), { force: true })),
  );
  await rename(tempPath, path.join(uploadDir, finalName));

  return `employee_documents/${employeeFolder}/${finalName}`;
}

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized", requestId }, { status: 401 });
    }

    const user = await currentUser(session);
    const role = String(user?.roles?.name || (session.user as any)?.role || "").toUpperCase();
    if (!INTERNAL_ROLES.has(role)) {
      return NextResponse.json({ ok: false, error: "Forbidden", requestId }, { status: 403 });
    }

    const formData = await request.formData();
    const employeeId = Number(text(formData, "employeeId"));
    const documentType = text(formData, "documentType");
    const documentNumber = text(formData, "documentNumber") || null;
    const note = text(formData, "note");
    const dueDate = parseDate(text(formData, "expiryDate"));
    const config = DOCUMENT_CONFIG[documentType as keyof typeof DOCUMENT_CONFIG];
    const file = (formData.get("documentFile") || formData.get(config?.fileInputName || "")) as File | null;

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid employee id", requestId }, { status: 400 });
    }
    if (!config) {
      return NextResponse.json({ ok: false, error: "Invalid document type", requestId }, { status: 400 });
    }
    if (!dueDate) {
      return NextResponse.json({ ok: false, error: "Invalid expiry date", requestId }, { status: 400 });
    }

    const employee = await prisma.employee_document_profiles.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ ok: false, error: "Employee not found", requestId }, { status: 404 });
    }

    const data: Record<string, any> = {
      [config.numberField]: documentNumber,
      [config.dateField]: dueDate,
    };

    if (file instanceof File && file.size > 0) {
      const validation = validateFile(file);
      if (validation.error) {
        return NextResponse.json({ ok: false, error: validation.error, requestId }, { status: 400 });
      }
      data[config.fileField] = await saveDocumentFile(file, employee, requestId, config.storageName);
    }

    const updated = await prisma.employee_document_profiles.update({
      where: { id: employee.id },
      data,
    });

    await prisma.logs.create({
      data: {
        user_id: user?.id || null,
        action: config.action,
        details: JSON.stringify({
          employeeId: employee.id,
          documentType,
          oldNumber: employee[config.numberField],
          newNumber: documentNumber,
          oldDate: employee[config.dateField] || (documentType === "ninety_day" ? employee.report_90_days_date : null) || null,
          newDate: dueDate.toISOString(),
          actor: user?.id || null,
          note,
          timestamp: new Date().toISOString(),
        }),
      },
    }).catch(() => null);

    return NextResponse.json({ ok: true, employeeId: updated.id, requestId });
  } catch (error: any) {
    logDocError(requestId, "DOCUMENT_RENEWAL ERROR", error);
    return NextResponse.json({ ok: false, error: error?.message || "Failed to renew document", requestId }, { status: 500 });
  }
}

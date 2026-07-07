import fs from "fs";
import { mkdir, readdir, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createRequestId,
  logDoc,
  logDocError,
  requestHeadersForDebug,
  safeFileNameFrom,
} from "@/lib/docDebug";

export const runtime = "nodejs";

const DOCUMENTS_ROOT = path.join(process.cwd(), "private_uploads", "employee_documents");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const DOCUMENT_TYPES = {
  passport: { fileBase: "passport", dbField: "passport_file" },
  pp: { fileBase: "passport", dbField: "passport_file" },
  visa: { fileBase: "visa", dbField: "visa_file" },
  vs: { fileBase: "visa", dbField: "visa_file" },
  work_permit: { fileBase: "work_permit", dbField: "work_permit_file" },
  workpermit: { fileBase: "work_permit", dbField: "work_permit_file" },
  ninety_day: { fileBase: "ninety_day", dbField: "ninety_day_file" },
  "90d": { fileBase: "ninety_day", dbField: "ninety_day_file" },
} as const;

function normalizeDocumentType(value: FormDataEntryValue | null) {
  return String(value || "").trim().toLowerCase();
}

function fileExt(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return [".pdf", ".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : null;
}

function validateFile(file: File) {
  const ext = fileExt(file.name);
  if (!ext) return { error: "Unsupported file type" };
  if (!ALLOWED_MIME_TYPES.has(file.type)) return { error: "Unsupported MIME type" };
  if (file.size > MAX_FILE_SIZE) return { error: "File is larger than 10MB" };
  return { ext };
}

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

async function findEmployee(employeeId: FormDataEntryValue) {
  const id = Number(employeeId);
  const byId = Number.isInteger(id)
    ? await prisma.employee_document_profiles.findUnique({ where: { id } })
    : null;

  return byId || prisma.employee_document_profiles.findFirst({
    where: { employee_id: String(employeeId) },
  });
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  logDoc(requestId, "DOC_UPLOAD START", requestHeadersForDebug(request));

  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized", requestId },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const employeeId = formData.get("employeeId") || formData.get("employee_id") || formData.get("profile_id") || formData.get("id");
    const documentType = normalizeDocumentType(formData.get("documentType") || formData.get("document_type") || formData.get("type"));
    const documentConfig = DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES];
    const file = (formData.get("file") || formData.get("main_document")) as File | null;

    logDoc(requestId, "form data", {
      formKeys: Array.from(formData.keys()),
      employeeId,
      documentType,
      fileExists: !!file && file.size > 0,
      fileName: file?.name || null,
      fileSize: file?.size || 0,
      fileType: file?.type || null,
    });

    if (!employeeId) {
      return NextResponse.json(
        { ok: false, error: "Missing employee_id or profile_id", requestId },
        { status: 400 },
      );
    }

    if (!documentConfig) {
      return NextResponse.json(
        { ok: false, error: "Invalid document type", requestId },
        { status: 400 },
      );
    }

    if (!file || file.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Missing file", requestId },
        { status: 400 },
      );
    }

    const validation = validateFile(file);
    if (validation.error) {
      return NextResponse.json(
        { ok: false, error: validation.error, requestId },
        { status: 400 },
      );
    }

    const employee = await findEmployee(employeeId);

    if (!employee) {
      return NextResponse.json(
        { ok: false, error: "Employee not found", requestId },
        { status: 404 },
      );
    }

    const user = await currentUser(session);
    const role = String(user?.roles?.name || (session.user as any)?.role || "").toUpperCase();
    const isStaff = ["ADMIN", "STAFF", "SUPERADMIN"].includes(role);
    const sameCompany = user?.company_id && Number(user.company_id) === Number(employee.company_id);

    if (!isStaff && !sameCompany) {
      return NextResponse.json(
        { ok: false, error: "Forbidden", requestId },
        { status: 403 },
      );
    }

    const employeeFolder = safeFileNameFrom(employee.emp_code || `employee-${employee.id}`);
    const uploadDir = path.join(DOCUMENTS_ROOT, employeeFolder);
    const finalFileName = `${documentConfig.fileBase}${validation.ext}`;
    const relativePath = `employee_documents/${employeeFolder}/${finalFileName}`;
    const filePath = path.join(uploadDir, finalFileName);
    const tempPath = path.join(uploadDir, `.${finalFileName}.${requestId}.tmp`);

    if (!fs.existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);

    const existingFiles = await readdir(uploadDir);
    await Promise.all(
      existingFiles
        .filter((name) => name.startsWith(`${documentConfig.fileBase}.`))
        .map((name) => rm(path.join(uploadDir, name), { force: true })),
    );
    await rename(tempPath, filePath);

    const updated = await prisma.employee_document_profiles.update({
      where: { id: employee.id },
      data: { [documentConfig.dbField]: relativePath },
    });

    logDoc(requestId, "DOC_UPLOAD END", {
      status: 200,
      employeeId: updated.id,
      documentType,
      file: relativePath,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      employeeId: updated.id,
      document_type: documentConfig.fileBase,
    });
  } catch (error: any) {
    logDocError(requestId, "DOC_UPLOAD ERROR", error);
    logDoc(requestId, "DOC_UPLOAD END", {
      status: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to upload document", requestId },
      { status: 500 },
    );
  }
}

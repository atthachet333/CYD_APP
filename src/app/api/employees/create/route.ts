import fs from "fs";
import { writeFile } from "fs/promises";
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

function formValue(formData: FormData, key: string) {
  return formData.get(key) as string | null;
}

function dateValue(formData: FormData, key: string) {
  const value = formValue(formData, key);
  return value ? new Date(value) : null;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  logDoc(requestId, "LEGACY_CREATE_EMPLOYEE START", {
    time: new Date().toISOString(),
    ...requestHeadersForDebug(request),
  });

  try {
    const session = await getServerSession();
    logDoc(requestId, "session", { exists: !!session });

    const formData = await request.formData();
    const companyId = formValue(formData, "company_id");
    const workTypeId = formValue(formData, "work_type_id");

    logDoc(requestId, "form data", {
      formKeys: Array.from(formData.keys()),
      emp_code: formValue(formData, "emp_code"),
      first_name_th: formValue(formData, "first_name_th"),
      last_name_th: formValue(formData, "last_name_th"),
      company_id: companyId,
      company_name_val: formValue(formData, "company_name_val"),
      work_type_id: workTypeId,
    });

    if (!companyId) {
      logDoc(requestId, "LEGACY_CREATE_EMPLOYEE END", {
        status: 400,
        reason: "missing company_id",
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { ok: false, error: "Missing company_id", requestId },
        { status: 400 },
      );
    }

    const file = formData.get("main_document") as File | null;
    let fileNameToSave: string | null = null;

    logDoc(requestId, "main_document", {
      exists: !!file && file.size > 0,
      fileName: file?.name || null,
      fileSize: file?.size || 0,
      fileType: file?.type || null,
    });

    if (file && file.size > 0) {
      const uploadDir = path.join(process.cwd(), "private_uploads");
      logDoc(requestId, "uploadDir", {
        cwd: process.cwd(),
        uploadDir,
        exists: fs.existsSync(uploadDir),
      });

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      fileNameToSave = safeFileNameFrom(path.basename(file.name));
      const filePath = path.join(uploadDir, fileNameToSave);

      logDoc(requestId, "file save before", {
        originalFileName: file.name,
        safeFileName: fileNameToSave,
        filePath,
        existsBefore: fs.existsSync(filePath),
      });

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      logDoc(requestId, "file save after", {
        filePath,
        existsAfter: fs.existsSync(filePath),
        savedFileSize: fs.statSync(filePath).size,
      });
    }

    const dataToCreate = {
      emp_code: formValue(formData, "emp_code") || null,
      first_name_th: formValue(formData, "first_name_th"),
      last_name_th: formValue(formData, "last_name_th"),
      first_name_en: formValue(formData, "first_name_en"),
      last_name_en: formValue(formData, "last_name_en"),
      company_id: Number(companyId),
      work_type_id: workTypeId ? Number(workTypeId) : null,
      debt_amount: Number(formValue(formData, "debt_amount")) || 0,
      passport_number: formValue(formData, "passport_number") || null,
      passport_expiry_date: dateValue(formData, "passport_expiry_date"),
      visa_number: formValue(formData, "visa_number") || null,
      visa_expiry_date: dateValue(formData, "visa_expiry_date"),
      work_permit_number: formValue(formData, "work_permit_number") || null,
      work_permit_expiry_date: dateValue(formData, "work_permit_expiry_date"),
      ninety_day_report_date: dateValue(formData, "ninety_day_report_date"),
      document_file_name: fileNameToSave,
    };

    logDoc(requestId, "prisma create data", dataToCreate);

    const created = await prisma.employee_document_profiles.create({
      data: dataToCreate,
    });

    logDoc(requestId, "prisma created", {
      id: created.id,
      document_file_name: created.document_file_name,
    });
    logDoc(requestId, "LEGACY_CREATE_EMPLOYEE END", {
      status: 200,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ ok: true, id: created.id, requestId });
  } catch (error: any) {
    logDocError(requestId, "LEGACY_CREATE_EMPLOYEE ERROR", error);
    logDoc(requestId, "LEGACY_CREATE_EMPLOYEE END", {
      status: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to create employee", requestId },
      { status: 500 },
    );
  }
}

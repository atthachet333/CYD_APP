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
} from "@/lib/docDebug";

export const runtime = "nodejs";

function formValue(formData: FormData, key: string) {
  return formData.get(key) as string | null;
}

function dateValue(formData: FormData, key: string) {
  const value = formValue(formData, key);
  return value ? new Date(value) : null;
}

function jsonError(requestId: string, message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: message, requestId },
    { status }
  );
}

function padNumber(value: number) {
  return String(value).padStart(4, "0");
}

function getFileExt(fileName: string) {
  const ext = path.extname(fileName || "").toLowerCase();
  return ext || ".pdf";
}

function getCompanyPrefix(companyId: number) {
  if (companyId === 11) return "SPX-HUB";
  if (companyId === 12) return "SPX-FSOCW";
  if (companyId === 13) return "SPX-SOCE";
  if (companyId === 14) return "SPX-SOCN";
  if (companyId === 15) return "SPX-SOCW";

  return `COMP${companyId}`;
}

/**
 * สร้างเลขรันสำหรับชื่อไฟล์เอกสารเท่านั้น
 * ไม่เกี่ยวกับ emp_code ของพนักงาน
 */
async function generateNextDocumentCode(companyId: number) {
  const prefix = getCompanyPrefix(companyId);

  const employees = await prisma.employee_document_profiles.findMany({
    where: {
      company_id: companyId,
      document_file_name: {
        startsWith: `${prefix}-`,
      },
    },
    select: {
      document_file_name: true,
    },
  });

  let maxNumber = 0;

  for (const emp of employees) {
    const fileName = emp.document_file_name || "";
    const fileNameNoExt = path.parse(fileName).name;

    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = fileNameNoExt.match(new RegExp(`^${escapedPrefix}-(\\d+)$`));

    if (match) {
      const num = Number(match[1]);
      if (!Number.isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  const nextNumber = maxNumber + 1;

  return {
    prefix,
    code: `${prefix}-${padNumber(nextNumber)}`,
    nextNumber,
  };
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  logDoc(requestId, "CREATE_EMPLOYEE START", {
    time: new Date().toISOString(),
    ...requestHeadersForDebug(request),
  });

  try {
    const session = await getServerSession();
    logDoc(requestId, "session", { exists: !!session });

    const formData = await request.formData();
    const keys = Array.from(formData.keys());

    logDoc(requestId, "form keys", keys);

    const companyName = formValue(formData, "company_name_val");
    const companyIdValue = formValue(formData, "company_id");
    const workTypeId = formValue(formData, "work_type_id");

    // ✅ รหัสพนักงานจริงที่ user กรอก
    const formEmpCode = formValue(formData, "emp_code")?.trim() || null;

    // ✅ สิทธิรักษาสุขภาพ
    const healthcareRights =
      formValue(formData, "healthcare_rights") || "ไม่มี";

    logDoc(requestId, "employee fields", {
      emp_code_from_form: formEmpCode,
      first_name_th: formValue(formData, "first_name_th"),
      last_name_th: formValue(formData, "last_name_th"),
      company_id: companyIdValue,
      company_name_val: companyName,
      work_type_id: workTypeId,
      healthcare_rights: healthcareRights,
    });

    let companyId = companyIdValue ? Number(companyIdValue) : null;

    if (!companyId && companyName) {
      logDoc(requestId, "company lookup", { companyName });

      let company = await prisma.companies.findFirst({
        where: { company_name: companyName },
      });

      if (!company) {
        logDoc(requestId, "company create", { companyName });

        company = await prisma.companies.create({
          data: { company_name: companyName },
        });
      }

      companyId = company.id;

      logDoc(requestId, "company resolved", { companyId });
    }

    if (!companyId || Number.isNaN(companyId)) {
      logDoc(requestId, "CREATE_EMPLOYEE END", {
        status: 400,
        reason: "missing company",
        durationMs: Date.now() - startedAt,
      });

      return jsonError(requestId, "Missing company", 400);
    }

    /**
     * ✅ สร้างรหัสเอกสารอัตโนมัติสำหรับใช้เป็นชื่อไฟล์เท่านั้น
     * ❌ ไม่เอาไปแทนรหัสพนักงาน
     */
    const generated = await generateNextDocumentCode(companyId);
    const generatedDocumentCode = generated.code;

    logDoc(requestId, "generated document running code", {
      companyId,
      companyName,
      prefix: generated.prefix,
      nextNumber: generated.nextNumber,
      generatedDocumentCode,
      formEmpCode,
    });

    const file = formData.get("main_document") as File | null;
    let fileNameToSave: string | null = null;

    logDoc(requestId, "main_document", {
      exists: !!file && file.size > 0,
      fileName: file?.name || null,
      fileSize: file?.size || 0,
      fileType: file?.type || null,
    });

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const originalFileName = file.name;
      const ext = getFileExt(originalFileName);

      fileNameToSave = `${generatedDocumentCode}${ext}`;

      const uploadDir = path.join(process.cwd(), "private_uploads");

      logDoc(requestId, "uploadDir", {
        cwd: process.cwd(),
        uploadDir,
        exists: fs.existsSync(uploadDir),
      });

      if (!fs.existsSync(uploadDir)) {
        logDoc(requestId, "creating uploadDir", { uploadDir });
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      let filePath = path.join(uploadDir, fileNameToSave);

      /**
       * กันเคสไฟล์มีอยู่แล้วแต่ DB ไม่มี หรือมีการชนกัน
       */
      let collisionCount = 0;

      while (fs.existsSync(filePath)) {
        collisionCount++;

        const retryNumber = generated.nextNumber + collisionCount;
        const retryDocumentCode = `${generated.prefix}-${padNumber(
          retryNumber
        )}`;

        fileNameToSave = `${retryDocumentCode}${ext}`;
        filePath = path.join(uploadDir, fileNameToSave);

        logDoc(requestId, "file name collision retry", {
          collisionCount,
          retryDocumentCode,
          fileNameToSave,
          filePath,
          exists: fs.existsSync(filePath),
        });

        if (collisionCount > 20) {
          return jsonError(
            requestId,
            "Cannot generate unique document filename",
            409
          );
        }
      }

      logDoc(requestId, "file save before", {
        originalFileName,
        generatedDocumentCode,
        finalFileName: fileNameToSave,
        filePath,
        existsBefore: fs.existsSync(filePath),
      });

      await writeFile(filePath, buffer);

      logDoc(requestId, "file save after", {
        filePath,
        finalFileName: fileNameToSave,
        existsAfter: fs.existsSync(filePath),
        savedFileSize: fs.statSync(filePath).size,
      });
    }

    const dataToCreate = {
      // ✅ ใช้รหัสพนักงานที่ user กรอกลง DB
      emp_code: formEmpCode,

      first_name_th: formValue(formData, "first_name_th"),
      last_name_th: formValue(formData, "last_name_th"),
      first_name_en: formValue(formData, "first_name_en"),
      last_name_en: formValue(formData, "last_name_en"),
      company_id: companyId,
      work_type_id: workTypeId ? Number(workTypeId) : null,
      debt_amount: Number(formValue(formData, "debt_amount")) || 0,

      healthcare_rights: healthcareRights,

      passport_number: formValue(formData, "passport_number") || null,
      passport_expiry_date: dateValue(formData, "passport_expiry_date"),
      visa_number: formValue(formData, "visa_number") || null,
      visa_expiry_date: dateValue(formData, "visa_expiry_date"),
      work_permit_number: formValue(formData, "work_permit_number") || null,
      work_permit_expiry_date: dateValue(formData, "work_permit_expiry_date"),
      ninety_day_report_date: dateValue(formData, "ninety_day_report_date"),

      // ✅ ใช้เลขรันอัตโนมัติเป็นชื่อไฟล์เอกสาร
      document_file_name: fileNameToSave,
    };

    logDoc(requestId, "prisma create data", dataToCreate);

    const created = await prisma.employee_document_profiles.create({
      data: dataToCreate,
    });

    logDoc(requestId, "prisma created", {
      id: created.id,
      emp_code: created.emp_code,
      document_file_name: created.document_file_name,
      healthcare_rights: healthcareRights,
    });

    logDoc(requestId, "CREATE_EMPLOYEE END", {
      status: 200,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      emp_code: created.emp_code,
      document_file_name: created.document_file_name,
      healthcare_rights: healthcareRights,
      requestId,
    });
  } catch (error: any) {
    logDocError(requestId, "CREATE_EMPLOYEE ERROR", error);

    logDoc(requestId, "CREATE_EMPLOYEE END", {
      status: 500,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to create employee",
        requestId,
      },
      { status: 500 }
    );
  }
}
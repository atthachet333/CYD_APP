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
} from "@/lib/docDebug";

export const runtime = "nodejs";

const EMPLOYEE_DOCUMENTS_ROOT = path.join(
  process.cwd(),
  "private_uploads",
  "employee_documents"
);
const PENDING_DOCUMENT_APPROVALS_ROOT = path.join(
  process.cwd(),
  "private_uploads",
  "pending_document_approvals"
);
const MAX_EMPLOYEE_DOCUMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_EMPLOYEE_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const EMPLOYEE_DOCUMENT_FIELDS = [
  { field: "passport_document", legacyField: "passport_file", type: "passport", dbField: "passport_file" },
  { field: "visa_document", legacyField: "visa_file", type: "visa", dbField: "visa_file" },
  { field: "work_permit_document", legacyField: "work_permit_file", type: "work_permit", dbField: "work_permit_file" },
  { field: "ninety_day_document", legacyField: "ninety_day_file", type: "ninety_day", dbField: "ninety_day_file" },
] as const;
const DOCUMENT_APPROVAL_FIELDS = [
  {
    field: "passport_document",
    legacyField: "passport_file",
    type: "passport",
    numberField: "passport_number",
    dateField: "passport_expiry_date",
  },
  {
    field: "visa_document",
    legacyField: "visa_file",
    type: "visa",
    numberField: "visa_number",
    dateField: "visa_expiry_date",
  },
  {
    field: "work_permit_document",
    legacyField: "work_permit_file",
    type: "work_permit",
    numberField: "work_permit_number",
    dateField: "work_permit_expiry_date",
  },
  {
    field: "ninety_day_document",
    legacyField: "ninety_day_file",
    type: "ninety_day",
    numberField: "ninety_day_number",
    dateField: "ninety_day_report_date",
  },
] as const;

function formValue(formData: FormData, key: string) {
  return formData.get(key) as string | null;
}

function dateValue(formData: FormData, key: string) {
  const value = formValue(formData, key);
  return value ? new Date(value) : null;
}

function datePayloadValue(formData: FormData, key: string) {
  const value = formValue(formData, key);
  return value || null;
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

function safeEmployeeFolderName(value: string) {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^\.+$/, "_")
    .slice(0, 120);
}

function validateEmployeeDocumentFile(file: File) {
  const ext = path.extname(file.name || "").toLowerCase();

  if (![".pdf", ".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    throw new Error("Unsupported employee document extension");
  }

  if (!ALLOWED_EMPLOYEE_DOCUMENT_TYPES.has(file.type)) {
    throw new Error("Unsupported employee document MIME type");
  }

  if (file.size > MAX_EMPLOYEE_DOCUMENT_SIZE) {
    throw new Error("Employee document is larger than 10MB");
  }

  return ext;
}

function employeeDocumentFile(formData: FormData, config: typeof EMPLOYEE_DOCUMENT_FIELDS[number]) {
  return (formData.get(config.field) || formData.get(config.legacyField)) as File | null;
}

function approvalDocumentFile(formData: FormData, config: typeof DOCUMENT_APPROVAL_FIELDS[number]) {
  return (formData.get(config.field) || formData.get(config.legacyField)) as File | null;
}

function buildDocumentCreateApprovalRequests(formData: FormData) {
  return DOCUMENT_APPROVAL_FIELDS.flatMap((config) => {
    const file = approvalDocumentFile(formData, config);
    const documentNumber = formValue(formData, config.numberField)?.trim() || null;
    const expiryDate = datePayloadValue(formData, config.dateField);
    const hasFile = Boolean(file && file.size > 0);

    if (!hasFile && !documentNumber && !expiryDate) {
      return [];
    }

    const ext = hasFile ? validateEmployeeDocumentFile(file as File) : null;

    return [
      {
        type: config.type,
        file: hasFile ? (file as File) : null,
        payload: {
          documentType: config.type,
          operation: "create",
          oldDocumentNumber: null,
          newDocumentNumber: documentNumber,
          oldExpiryDate: null,
          newExpiryDate: expiryDate,
          stagedFile: ext
            ? {
                hasFile: true,
                ext,
                extension: ext.slice(1),
                mimeType: (file as File).type,
                size: (file as File).size,
              }
            : null,
        },
      },
    ];
  });
}

async function stageApprovalDocumentFile({
  file,
  documentType,
  approvalId,
  requestId,
}: {
  file: File;
  documentType: string;
  approvalId: number;
  requestId: string;
}) {
  const ext = validateEmployeeDocumentFile(file);
  const uploadDir = path.join(PENDING_DOCUMENT_APPROVALS_ROOT, String(approvalId));
  const finalFileName = `${documentType}${ext}`;
  const filePath = path.join(uploadDir, finalFileName);
  const tempPath = path.join(uploadDir, `.${finalFileName}.${requestId}.tmp`);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));
  await rename(tempPath, filePath);
}

async function saveEmployeeDocumentFile({
  file,
  documentType,
  employeeFolderName,
  requestId,
}: {
  file: File;
  documentType: string;
  employeeFolderName: string;
  requestId: string;
}) {
  const ext = validateEmployeeDocumentFile(file);
  const uploadDir = path.join(EMPLOYEE_DOCUMENTS_ROOT, employeeFolderName);
  const finalFileName = `${documentType}${ext}`;
  const filePath = path.join(uploadDir, finalFileName);
  const tempPath = path.join(uploadDir, `.${finalFileName}.${requestId}.tmp`);

  if (path.basename(employeeFolderName) !== employeeFolderName) {
    throw new Error("Invalid employee folder name");
  }

  await mkdir(uploadDir, { recursive: true });
  await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));

  const existingFiles = await readdir(uploadDir);
  await Promise.all(
    existingFiles
      .filter((name) => name.startsWith(`${documentType}.`))
      .map((name) => rm(path.join(uploadDir, name), { force: true }))
  );

  await rename(tempPath, filePath);

  return `employee_documents/${employeeFolderName}/${finalFileName}`;
}

function getCompanyPrefix(companyId: number) {
  if (companyId === 38) return "SPX-HUB";
  if (companyId === 37) return "SPX-FSOCW";
  if (companyId === 39) return "SPX-SOCE";
  if (companyId === 40) return "SPX-SOCN";
  if (companyId === 41) return "SPX-SOCW";

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

    if (!session?.user) {
      return jsonError(requestId, "Unauthorized", 401);
    }

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

    const dbUser = await prisma.users.findFirst({
      where: {
        OR: [
          { username: (session.user as any)?.username || session.user.name || "" },
          { email: session.user.email || "" },
          { full_name: session.user.name || "" },
        ],
      },
      include: { roles: true },
    });
    const sessionRole = String(
      dbUser?.roles?.name || (session.user as any)?.role || ""
    ).toUpperCase();
    const sessionCompanyId = dbUser?.company_id || (session.user as any)?.companyId;
    const isStaffUser = ["ADMIN", "STAFF", "SUPERADMIN"].includes(sessionRole);
    const isCustomerCreate = !isStaffUser;

    if (!isStaffUser && Number(sessionCompanyId) !== Number(companyId)) {
      return jsonError(requestId, "Forbidden", 403);
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

      passport_number: isCustomerCreate ? null : formValue(formData, "passport_number") || null,
      passport_expiry_date: isCustomerCreate ? null : dateValue(formData, "passport_expiry_date"),
      visa_number: isCustomerCreate ? null : formValue(formData, "visa_number") || null,
      visa_expiry_date: isCustomerCreate ? null : dateValue(formData, "visa_expiry_date"),
      work_permit_number: isCustomerCreate ? null : formValue(formData, "work_permit_number") || null,
      work_permit_expiry_date: isCustomerCreate ? null : dateValue(formData, "work_permit_expiry_date"),
      ninety_day_number: isCustomerCreate ? null : formValue(formData, "ninety_day_number") || null,
      ninety_day_report_date: isCustomerCreate ? null : dateValue(formData, "ninety_day_report_date"),

      // ✅ ใช้เลขรันอัตโนมัติเป็นชื่อไฟล์เอกสาร
      document_file_name: fileNameToSave,
    };

    logDoc(requestId, "prisma create data", dataToCreate);

    const approvalRequests = isCustomerCreate
      ? buildDocumentCreateApprovalRequests(formData)
      : [];
    let created: any;
    let createdApprovalRecords: any[] = [];

    if (isCustomerCreate && approvalRequests.length > 0) {
      const result = await prisma.$transaction(async (tx) => {
        const employee = await tx.employee_document_profiles.create({
          data: dataToCreate,
        });
        const approvals = [];

        for (const approvalRequest of approvalRequests) {
          approvals.push(
            await tx.employee_document_approvals.create({
              data: {
                action_type: "DOCUMENT_CREATE",
                profile_id: employee.id,
                payload_json: JSON.stringify(approvalRequest.payload),
                status: "pending",
                requested_by: dbUser?.id || null,
              },
            })
          );
        }

        return { employee, approvals };
      });

      created = result.employee;
      createdApprovalRecords = result.approvals;

      try {
        for (let index = 0; index < approvalRequests.length; index++) {
          const approvalRequest = approvalRequests[index];
          const approval = createdApprovalRecords[index];

          if (!approvalRequest.file) {
            continue;
          }

          await stageApprovalDocumentFile({
            file: approvalRequest.file,
            documentType: approvalRequest.type,
            approvalId: approval.id,
            requestId,
          });
        }
      } catch (stageError) {
        await Promise.all(
          createdApprovalRecords.map((approval) =>
            rm(path.join(PENDING_DOCUMENT_APPROVALS_ROOT, String(approval.id)), {
              recursive: true,
              force: true,
            }).catch(() => null)
          )
        );
        await prisma
          .$transaction([
            prisma.employee_document_approvals.deleteMany({
              where: { id: { in: createdApprovalRecords.map((approval) => approval.id) } },
            }),
            prisma.employee_document_profiles.delete({ where: { id: created.id } }),
          ])
          .catch(() => null);

        throw stageError;
      }
    } else {
      created = await prisma.employee_document_profiles.create({
        data: dataToCreate,
      });
    }

    const employeeFolderName =
      safeEmployeeFolderName(created.emp_code || `employee-${created.id}`) ||
      `employee-${created.id}`;
    const uploaded_documents = {
      passport: false,
      visa: false,
      work_permit: false,
      ninety_day: false,
    };
    const documentUpdateData: Record<string, string> = {};

    if (isStaffUser) {
      for (const config of EMPLOYEE_DOCUMENT_FIELDS) {
        const documentFile = employeeDocumentFile(formData, config);

        if (documentFile && documentFile.size > 0) {
          validateEmployeeDocumentFile(documentFile);
        }
      }

      for (const config of EMPLOYEE_DOCUMENT_FIELDS) {
        const documentFile = employeeDocumentFile(formData, config);

        if (!documentFile || documentFile.size === 0) {
          continue;
        }

        const relativePath = await saveEmployeeDocumentFile({
          file: documentFile,
          documentType: config.type,
          employeeFolderName,
          requestId,
        });

        documentUpdateData[config.dbField] = relativePath;
        uploaded_documents[config.type] = true;
      }

      if (Object.keys(documentUpdateData).length > 0) {
        await prisma.employee_document_profiles.update({
          where: { id: created.id },
          data: documentUpdateData,
        });
      }
    }
    const approval_requests = createdApprovalRecords.map((approval, index) => ({
      id: approval.id,
      documentType: approvalRequests[index]?.type || null,
      status: approval.status,
      hasFile: Boolean(approvalRequests[index]?.file),
    }));
    const staged_documents = approvalRequests.reduce(
      (result, approvalRequest) => ({
        ...result,
        [approvalRequest.type]: Boolean(approvalRequest.file),
      }),
      {
        passport: false,
        visa: false,
        work_permit: false,
        ninety_day: false,
      }
    );

    logDoc(requestId, "prisma created", {
      id: created.id,
      emp_code: created.emp_code,
      document_file_name: created.document_file_name,
      healthcare_rights: healthcareRights,
      uploaded_documents,
      approval_requests: approval_requests.length,
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
      uploaded_documents,
      staged_documents,
      approval_requests,
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
